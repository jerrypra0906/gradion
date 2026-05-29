import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

type MasterLang = 'en' | 'id';

function normStr(x: unknown) {
  return String(x ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function canonicalKeyForProgram(p: any) {
  const name = normStr(p?.name);
  const domain = normStr(p?.domain);
  const targets = Array.isArray(p?.targets) ? p.targets.map((t: any) => normStr(t)).filter(Boolean) : [];
  const materials = Array.isArray(p?.materials)
    ? p.materials.map((m: any) => normStr(m)).filter(Boolean)
    : [];
  const trials = Number.isFinite(Number(p?.recommended_trials_per_day))
    ? String(Number(p.recommended_trials_per_day))
    : '';

  // Order matters; keep stable.
  return [
    `name=${name}`,
    `domain=${domain}`,
    `trials=${trials}`,
    `targets=${targets.join('|')}`,
    `materials=${materials.join('|')}`,
  ].join('::');
}

function stableIdFromCanonicalKey(canonicalKey: string) {
  const hash = crypto.createHash('sha1').update(canonicalKey).digest('hex').slice(0, 12);
  return `mp_${hash}`;
}

export async function listMasterPrograms(input: { language: MasterLang; take?: number }) {
  const rows = await prisma.abaMasterProgram.findMany({
    where: { language: input.language },
    orderBy: { updated_at: 'desc' },
    take: input.take ?? 100,
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    domain: r.domain,
    rationale: r.rationale,
    targets: r.targets,
    recommended_trials_per_day: r.recommended_trials_per_day,
    materials: r.materials,
    data_collection: r.data_collection,
    demo_video_url: r.demo_video_url,
  }));
}

export async function syncWeeklyPlanToMasterPrograms(input: {
  planJson: any;
  language: MasterLang;
}): Promise<any> {
  const plan: any = input.planJson && typeof input.planJson === 'object' ? input.planJson : {};
  const programs: any[] = Array.isArray(plan.programs) ? plan.programs : [];
  if (!programs.length) return plan;

  const lang: MasterLang = input.language === 'id' ? 'id' : 'en';

  const canonicalByOldId = new Map<string, string>();
  const keys: string[] = [];
  for (const p of programs) {
    const oldId = p?.id != null ? String(p.id) : '';
    if (!oldId) continue;
    const key = canonicalKeyForProgram(p);
    canonicalByOldId.set(oldId, key);
    keys.push(key);
  }

  const existing = await prisma.abaMasterProgram.findMany({
    where: { language: lang, canonical_key: { in: keys } },
  });
  const existingByKey = new Map(existing.map((r) => [r.canonical_key, r] as const));

  const idRemap = new Map<string, string>();

  await prisma.$transaction(async (tx) => {
    for (const p of programs) {
      const oldId = p?.id != null ? String(p.id) : '';
      if (!oldId) continue;
      const key = canonicalByOldId.get(oldId);
      if (!key) continue;

      const found = existingByKey.get(key);
      if (found) {
        idRemap.set(oldId, found.id);
        // Refresh fields if the new generation has better details.
        await tx.abaMasterProgram.update({
          where: { id: found.id },
          data: {
            name: String(p?.name ?? found.name),
            domain: p?.domain != null ? String(p.domain) : found.domain,
            rationale: p?.rationale != null ? String(p.rationale) : found.rationale,
            targets: Array.isArray(p?.targets) ? (p.targets as any) : found.targets,
            recommended_trials_per_day: Number.isFinite(Number(p?.recommended_trials_per_day))
              ? Number(p.recommended_trials_per_day)
              : found.recommended_trials_per_day,
            materials: Array.isArray(p?.materials) ? (p.materials as any) : found.materials,
            data_collection: p?.data_collection != null ? (p.data_collection as any) : found.data_collection,
            demo_video_url:
              typeof p?.demo_video_url === 'string' && p.demo_video_url.trim()
                ? String(p.demo_video_url).trim()
                : found.demo_video_url,
          },
        });
        continue;
      }

      const newId = stableIdFromCanonicalKey(`${lang}::${key}`);
      idRemap.set(oldId, newId);

      // Upsert in case of race (unique on language+canonical_key).
      await tx.abaMasterProgram.upsert({
        where: { language_canonical_key: { language: lang, canonical_key: key } },
        create: {
          id: newId,
          language: lang,
          canonical_key: key,
          name: String(p?.name ?? 'Program'),
          domain: p?.domain != null ? String(p.domain) : null,
          rationale: p?.rationale != null ? String(p.rationale) : null,
          targets: Array.isArray(p?.targets) ? (p.targets as any) : null,
          recommended_trials_per_day: Number.isFinite(Number(p?.recommended_trials_per_day))
            ? Number(p.recommended_trials_per_day)
            : null,
          materials: Array.isArray(p?.materials) ? (p.materials as any) : null,
          data_collection: p?.data_collection != null ? (p.data_collection as any) : null,
          demo_video_url:
            typeof p?.demo_video_url === 'string' && p.demo_video_url.trim()
              ? String(p.demo_video_url).trim()
              : null,
        },
        update: {
          // Keep the stable id; only refresh content.
          name: String(p?.name ?? 'Program'),
          domain: p?.domain != null ? String(p.domain) : null,
          rationale: p?.rationale != null ? String(p.rationale) : null,
          targets: Array.isArray(p?.targets) ? (p.targets as any) : null,
          recommended_trials_per_day: Number.isFinite(Number(p?.recommended_trials_per_day))
            ? Number(p.recommended_trials_per_day)
            : null,
          materials: Array.isArray(p?.materials) ? (p.materials as any) : null,
          data_collection: p?.data_collection != null ? (p.data_collection as any) : null,
          demo_video_url:
            typeof p?.demo_video_url === 'string' && p.demo_video_url.trim()
              ? String(p.demo_video_url).trim()
              : null,
        },
      });
    }
  });

  // Apply id remap to plan.programs + all linked guided activities.
  if (idRemap.size) {
    plan.programs = programs.map((p) => {
      const oldId = p?.id != null ? String(p.id) : '';
      const newId = oldId && idRemap.get(oldId) ? idRemap.get(oldId) : oldId;
      return { ...p, id: newId };
    });

    const flow = Array.isArray(plan.daily_guided_flow) ? plan.daily_guided_flow : [];
    for (const day of flow) {
      const acts = Array.isArray(day?.activities) ? day.activities : [];
      for (const a of acts) {
        const lid = a?.linked_program_id != null ? String(a.linked_program_id) : '';
        const mapped = lid && idRemap.get(lid) ? idRemap.get(lid) : lid;
        if (mapped && mapped !== lid) a.linked_program_id = mapped;
      }
    }
  }

  return plan;
}

