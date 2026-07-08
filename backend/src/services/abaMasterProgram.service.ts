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

/** Compact snapshot of the fields that define a program (used for edit logs / AI learning). */
function programSnapshot(r: {
  name: string;
  domain: string | null;
  rationale: string | null;
  targets: unknown;
  recommended_trials_per_day: number | null;
  materials: unknown;
  demo_video_url: string | null;
  steps?: unknown;
  prompts?: unknown;
  mastery_criteria?: string | null;
}) {
  return {
    name: r.name,
    domain: r.domain,
    rationale: r.rationale,
    targets: r.targets ?? null,
    recommended_trials_per_day: r.recommended_trials_per_day,
    materials: r.materials ?? null,
    demo_video_url: r.demo_video_url,
    steps: r.steps ?? null,
    prompts: r.prompts ?? null,
    mastery_criteria: r.mastery_criteria ?? null,
  };
}

export async function listMasterPrograms(input: { language: MasterLang; take?: number }) {
  const rows = await prisma.abaMasterProgram.findMany({
    where: { language: input.language, is_archived: false, merged_into_id: null },
    // Curated (admin-approved) first, then the most reused, then the freshest.
    orderBy: [{ is_curated: 'desc' }, { usage_count: 'desc' }, { updated_at: 'desc' }],
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
    steps: r.steps,
    prompts: r.prompts,
    mastery_criteria: r.mastery_criteria,
    curated: r.is_curated,
  }));
}

/**
 * Recent admin corrections (before → after) for a language. Injected into the
 * weekly-plan prompt so the AI learns the content/style admins expect.
 */
export async function getCurationLearningExamples(input: { language: MasterLang; take?: number }) {
  const edits = await prisma.abaMasterProgramEdit.findMany({
    where: { master: { language: input.language } },
    orderBy: { created_at: 'desc' },
    take: input.take ?? 6,
    include: { master: { select: { name: true } } },
  });
  if (!edits.length) return null;
  return edits.map((e) => ({
    program: e.master.name,
    before: e.before_json,
    after: e.after_json,
  }));
}

/** Follow merged_into_id redirects to the surviving master (bounded to avoid cycles). */
async function resolveMergeTarget(row: { id: string; merged_into_id: string | null } & Record<string, any>) {
  let current: any = row;
  for (let hop = 0; hop < 5 && current?.merged_into_id; hop += 1) {
    const next = await prisma.abaMasterProgram.findUnique({ where: { id: current.merged_into_id } });
    if (!next) break;
    current = next;
  }
  return current;
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
  const oldIds: string[] = [];
  for (const p of programs) {
    const oldId = p?.id != null ? String(p.id) : '';
    if (!oldId) continue;
    const key = canonicalKeyForProgram(p);
    canonicalByOldId.set(oldId, key);
    keys.push(key);
    oldIds.push(oldId);
  }

  const [existingByKeyRows, existingByIdRows] = await Promise.all([
    prisma.abaMasterProgram.findMany({
      where: { language: lang, canonical_key: { in: keys } },
    }),
    prisma.abaMasterProgram.findMany({
      where: { language: lang, id: { in: oldIds } },
    }),
  ]);
  const existingByKey = new Map(existingByKeyRows.map((r) => [r.canonical_key, r] as const));
  const existingById = new Map(existingByIdRows.map((r) => [r.id, r] as const));

  const idRemap = new Map<string, string>();

  await prisma.$transaction(async (tx) => {
    for (const p of programs) {
      const oldId = p?.id != null ? String(p.id) : '';
      if (!oldId) continue;
      const key = canonicalByOldId.get(oldId);
      if (!key) continue;

      const foundByKey = existingByKey.get(key);
      if (foundByKey) {
        const target = await resolveMergeTarget(foundByKey);
        idRemap.set(oldId, target.id);

        if (target.is_curated) {
          // Curated masters are admin-approved: count the reuse, never overwrite content.
          await tx.abaMasterProgram.update({
            where: { id: target.id },
            data: { usage_count: { increment: 1 } },
          });
          continue;
        }

        // Refresh fields if the new generation has better details.
        await tx.abaMasterProgram.update({
          where: { id: target.id },
          data: {
            name: String(p?.name ?? target.name),
            domain: p?.domain != null ? String(p.domain) : target.domain,
            rationale: p?.rationale != null ? String(p.rationale) : target.rationale,
            targets: Array.isArray(p?.targets) ? (p.targets as any) : target.targets,
            recommended_trials_per_day: Number.isFinite(Number(p?.recommended_trials_per_day))
              ? Number(p.recommended_trials_per_day)
              : target.recommended_trials_per_day,
            materials: Array.isArray(p?.materials) ? (p.materials as any) : target.materials,
            data_collection:
              p?.data_collection != null ? (p.data_collection as any) : target.data_collection,
            demo_video_url:
              typeof p?.demo_video_url === 'string' && p.demo_video_url.trim()
                ? String(p.demo_video_url).trim()
                : target.demo_video_url,
            steps: Array.isArray(p?.steps) ? (p.steps as any) : target.steps,
            prompts: Array.isArray(p?.prompts) ? (p.prompts as any) : target.prompts,
            mastery_criteria:
              typeof p?.mastery_criteria === 'string' && p.mastery_criteria.trim()
                ? String(p.mastery_criteria).trim()
                : target.mastery_criteria,
            usage_count: { increment: 1 },
          },
        });
        continue;
      }

      // The AI reused a master id but personalized the content for this child.
      // Keep the master untouched (per-child tweaks must not mutate the shared
      // library) and keep the id stable in the plan.
      const foundById = existingById.get(oldId);
      if (foundById) {
        const target = await resolveMergeTarget(foundById);
        idRemap.set(oldId, target.id);
        await tx.abaMasterProgram.update({
          where: { id: target.id },
          data: { usage_count: { increment: 1 } },
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
          steps: Array.isArray(p?.steps) ? (p.steps as any) : null,
          prompts: Array.isArray(p?.prompts) ? (p.prompts as any) : null,
          mastery_criteria:
            typeof p?.mastery_criteria === 'string' && p.mastery_criteria.trim()
              ? String(p.mastery_criteria).trim()
              : null,
          usage_count: 1,
        },
        update: {
          // Race path: another generation created it first — just count the reuse.
          // Never null-out fields the concurrent writer may have set.
          usage_count: { increment: 1 },
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

// -----------------------------
// Admin curation
// -----------------------------

export type UpdateMasterProgramPatch = {
  name?: string;
  domain?: string | null;
  rationale?: string | null;
  targets?: string[];
  recommended_trials_per_day?: number | null;
  materials?: string[];
  demo_video_url?: string | null;
  steps?: string[];
  prompts?: string[];
  mastery_criteria?: string | null;
};

export type CurationResult =
  | { ok: true; row: any }
  | { ok: false; error: string; code?: number; conflictId?: string };

/**
 * Admin edit: updates content, recomputes the canonical key, marks the master
 * curated (protecting it from AI overwrites) and logs before/after for AI learning.
 */
export async function updateMasterProgram(input: {
  id: string;
  editorId: number;
  patch: UpdateMasterProgramPatch;
}): Promise<CurationResult> {
  const row = await prisma.abaMasterProgram.findUnique({ where: { id: input.id } });
  if (!row) return { ok: false, error: 'Program not found', code: 404 };
  if (row.merged_into_id) {
    return { ok: false, error: 'This program was merged into another one', code: 409, conflictId: row.merged_into_id };
  }

  const p = input.patch;
  const name = p.name !== undefined ? String(p.name).trim() : row.name;
  if (!name) return { ok: false, error: 'Name is required', code: 400 };

  const after = {
    name,
    domain: p.domain !== undefined ? (p.domain ? String(p.domain).trim() : null) : row.domain,
    rationale: p.rationale !== undefined ? (p.rationale ? String(p.rationale).trim() : null) : row.rationale,
    targets:
      p.targets !== undefined
        ? p.targets.map((t) => String(t).trim()).filter(Boolean)
        : (row.targets as unknown),
    recommended_trials_per_day:
      p.recommended_trials_per_day !== undefined
        ? p.recommended_trials_per_day
        : row.recommended_trials_per_day,
    materials:
      p.materials !== undefined
        ? p.materials.map((m) => String(m).trim()).filter(Boolean)
        : (row.materials as unknown),
    demo_video_url:
      p.demo_video_url !== undefined
        ? (p.demo_video_url ? String(p.demo_video_url).trim() : null)
        : row.demo_video_url,
    steps:
      p.steps !== undefined
        ? p.steps.map((s) => String(s).trim()).filter(Boolean)
        : (row.steps as unknown),
    prompts:
      p.prompts !== undefined
        ? p.prompts.map((s) => String(s).trim()).filter(Boolean)
        : (row.prompts as unknown),
    mastery_criteria:
      p.mastery_criteria !== undefined
        ? (p.mastery_criteria ? String(p.mastery_criteria).trim() : null)
        : row.mastery_criteria,
  };

  const newKey = canonicalKeyForProgram(after);
  if (newKey !== row.canonical_key) {
    const clash = await prisma.abaMasterProgram.findUnique({
      where: { language_canonical_key: { language: row.language, canonical_key: newKey } },
    });
    if (clash && clash.id !== row.id) {
      return {
        ok: false,
        error: 'An identical program already exists — merge them instead',
        code: 409,
        conflictId: clash.id,
      };
    }
  }

  const before = programSnapshot(row);

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.abaMasterProgram.update({
      where: { id: row.id },
      data: {
        name: after.name,
        domain: after.domain,
        rationale: after.rationale,
        targets: after.targets as any,
        recommended_trials_per_day: after.recommended_trials_per_day,
        materials: after.materials as any,
        demo_video_url: after.demo_video_url,
        steps: after.steps as any,
        prompts: after.prompts as any,
        mastery_criteria: after.mastery_criteria,
        canonical_key: newKey,
        is_curated: true,
      },
    });
    await tx.abaMasterProgramEdit.create({
      data: {
        master_id: row.id,
        editor_id: input.editorId,
        before_json: before as any,
        after_json: programSnapshot(u) as any,
      },
    });
    return u;
  });

  return { ok: true, row: updated };
}

export async function setMasterProgramArchived(input: {
  id: string;
  archived: boolean;
}): Promise<CurationResult> {
  const row = await prisma.abaMasterProgram.findUnique({ where: { id: input.id } });
  if (!row) return { ok: false, error: 'Program not found', code: 404 };
  if (row.merged_into_id && !input.archived) {
    return { ok: false, error: 'This program was merged into another one', code: 409, conflictId: row.merged_into_id };
  }
  const updated = await prisma.abaMasterProgram.update({
    where: { id: input.id },
    data: { is_archived: input.archived },
  });
  return { ok: true, row: updated };
}

/**
 * Merge duplicates into one surviving master. Duplicates are archived and
 * redirect to the survivor, so future AI generations reuse the survivor
 * instead of resurrecting the duplicates.
 */
export async function mergeMasterPrograms(input: {
  keepId: string;
  mergeIds: string[];
}): Promise<CurationResult> {
  const mergeIds = [...new Set(input.mergeIds)].filter((id) => id !== input.keepId);
  if (!mergeIds.length) {
    return { ok: false, error: 'Select at least one duplicate to merge', code: 400 };
  }

  const keep = await prisma.abaMasterProgram.findUnique({ where: { id: input.keepId } });
  if (!keep) return { ok: false, error: 'Program to keep not found', code: 404 };
  if (keep.merged_into_id) {
    return { ok: false, error: 'The program to keep was itself merged into another one', code: 409, conflictId: keep.merged_into_id };
  }

  const dups = await prisma.abaMasterProgram.findMany({ where: { id: { in: mergeIds } } });
  if (dups.length !== mergeIds.length) {
    return { ok: false, error: 'Some selected programs no longer exist', code: 404 };
  }
  if (dups.some((d) => d.language !== keep.language)) {
    return { ok: false, error: 'Programs must be in the same language to merge', code: 400 };
  }

  const mergedUsage = dups.reduce((sum, d) => sum + (d.usage_count || 0), 0);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.abaMasterProgram.updateMany({
      where: { id: { in: mergeIds } },
      data: { merged_into_id: keep.id, is_archived: true },
    });
    // Flatten older chains that pointed at a duplicate.
    await tx.abaMasterProgram.updateMany({
      where: { merged_into_id: { in: mergeIds } },
      data: { merged_into_id: keep.id },
    });
    // Merging is a curation decision: the survivor becomes a protected exemplar.
    return tx.abaMasterProgram.update({
      where: { id: keep.id },
      data: {
        is_curated: true,
        usage_count: { increment: mergedUsage },
      },
    });
  });

  return { ok: true, row: updated };
}
