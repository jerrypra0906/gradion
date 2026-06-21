import crypto from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../lib/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type MockCaseRow = {
  case_number: number;
  observation_text: string;
  initial_programs: string[];
};

function loadMockCases(): MockCaseRow[] {
  const raw = readFileSync(path.join(__dirname, '../data/mockAutismCases.json'), 'utf8');
  return JSON.parse(raw) as MockCaseRow[];
}

function tokenize(text: string): Set<string> {
  return new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function scoreObservationSimilarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (!ta.size || !tb.size) return 0;
  let overlap = 0;
  for (const t of ta) {
    if (tb.has(t)) overlap += 1;
  }
  return overlap / Math.sqrt(ta.size * tb.size);
}

function observationTextFromJson(obs: unknown): string {
  if (!obs || typeof obs !== 'object') return '';
  const root = obs as Record<string, unknown>;
  const obs1 = (root.obs1 && typeof root.obs1 === 'object' ? root.obs1 : root) as Record<
    string,
    unknown
  >;
  const parts: string[] = [];

  const behaviors = obs1.behaviors;
  if (behaviors && typeof behaviors === 'object' && !Array.isArray(behaviors)) {
    for (const [key, val] of Object.entries(behaviors as Record<string, unknown>)) {
      if (!val || typeof val !== 'object') continue;
      const row = val as Record<string, unknown>;
      const label = row.label ? String(row.label) : key.replace(/_/g, ' ');
      const f = row.f != null ? Number(row.f) : null;
      const s = row.s != null ? Number(row.s) : null;
      if (f != null && s != null) parts.push(`${label} F${f}/S${s}`);
    }
  }

  if (obs1.attention_span_minutes != null) {
    parts.push(`attention span ${obs1.attention_span_minutes} min`);
  }

  const eye = obs1.eye_contact;
  if (eye && typeof eye === 'object') {
    const e = eye as Record<string, unknown>;
    const vals = [
      e.on_request_pct != null ? `on request ${e.on_request_pct}%` : null,
      e.name_called_pct != null ? `name called ${e.name_called_pct}%` : null,
      e.talking_listening_pct != null ? `talk/listen ${e.talking_listening_pct}%` : null,
    ].filter(Boolean);
    if (vals.length) parts.push(`eye contact: ${vals.join(', ')}`);
  }

  if (obs1.looking_at_task_materials_pct != null) {
    parts.push(`task materials ${obs1.looking_at_task_materials_pct}%`);
  }
  if (obs1.follows_simple_directives_with_gestures_pct != null) {
    parts.push(`follows directives ${obs1.follows_simple_directives_with_gestures_pct}%`);
  }

  const compliance = obs1.compliance_pct;
  if (compliance && typeof compliance === 'object') {
    const vals = Object.values(compliance as Record<string, unknown>)
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n));
    if (vals.length) {
      const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      parts.push(`compliance avg ${avg}%`);
    }
  }

  return parts.join('; ').trim();
}

function stableGeneratedCaseId(childId: number) {
  return `ac_child_${childId}`;
}

function programNamesFromPlan(planJson: unknown): string[] {
  const plan = planJson as { programs?: Array<{ name?: string }> } | null;
  if (!plan?.programs?.length) return [];
  return plan.programs.map((p) => String(p?.name || '')).filter(Boolean);
}

export async function seedMockAutismCases(): Promise<{ inserted: number; updated: number }> {
  const rows = loadMockCases();
  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    const id = `mock_${row.case_number}`;
    const existing = await prisma.abaAutismCase.findUnique({ where: { id } });
    await prisma.abaAutismCase.upsert({
      where: { id },
      create: {
        id,
        case_number: row.case_number,
        observation_text: row.observation_text,
        initial_programs: row.initial_programs,
        source: 'mock',
        language: 'id',
      },
      update: {
        case_number: row.case_number,
        observation_text: row.observation_text,
        initial_programs: row.initial_programs,
        source: 'mock',
        language: 'id',
      },
    });
    if (existing) updated += 1;
    else inserted += 1;
  }

  return { inserted, updated };
}

export async function listAutismCases(input: {
  source?: 'mock' | 'generated' | 'all';
  language?: 'en' | 'id';
  search?: string;
  take?: number;
  skip?: number;
}) {
  const source = input.source || 'all';
  const language = input.language;
  const search = String(input.search || '').trim();
  const take = Math.max(1, Math.min(500, input.take ?? 100));
  const skip = Math.max(0, input.skip ?? 0);

  const where: {
    source?: string;
    language?: string;
    OR?: Array<{ observation_text?: { contains: string; mode: 'insensitive' }; id?: { contains: string; mode: 'insensitive' } }>;
  } = {
    ...(source !== 'all' ? { source } : {}),
    ...(language ? { language } : {}),
    ...(search
      ? {
          OR: [
            { observation_text: { contains: search, mode: 'insensitive' } },
            { id: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.abaAutismCase.findMany({
      where,
      orderBy: [{ source: 'asc' }, { case_number: 'asc' }, { updated_at: 'desc' }],
      take,
      skip,
      include: {
        child: { select: { id: true, name: true } },
      },
    }),
    prisma.abaAutismCase.count({ where }),
  ]);

  return { rows, total };
}

export async function findSimilarAutismCases(input: {
  observationText: string;
  take?: number;
}): Promise<
  Array<{
    id: string;
    case_number: number | null;
    observation_text: string;
    initial_programs: unknown;
    source: string;
    similarity: number;
  }>
> {
  const take = Math.max(1, Math.min(10, input.take ?? 5));
  const query = String(input.observationText || '').trim();
  if (!query) {
    const fallback = await prisma.abaAutismCase.findMany({
      where: { source: 'mock' },
      orderBy: { case_number: 'asc' },
      take,
    });
    return fallback.map((r) => ({
      id: r.id,
      case_number: r.case_number,
      observation_text: r.observation_text,
      initial_programs: r.initial_programs,
      source: r.source,
      similarity: 0,
    }));
  }

  const all = await prisma.abaAutismCase.findMany({
    orderBy: [{ source: 'asc' }, { case_number: 'asc' }],
    take: 200,
  });

  const scored = all
    .map((r) => ({
      id: r.id,
      case_number: r.case_number,
      observation_text: r.observation_text,
      initial_programs: r.initial_programs,
      source: r.source,
      similarity: scoreObservationSimilarity(query, r.observation_text),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, take);

  return scored;
}

export function buildObservationText(input: {
  initialObservation?: unknown;
  assessmentMarkdown?: string;
  diagnosis?: string | null;
  childName?: string;
}): string {
  const fromJson = observationTextFromJson(input.initialObservation);
  const parts = [
    input.childName ? `Child: ${input.childName}` : '',
    input.diagnosis ? `Diagnosis: ${input.diagnosis}` : '',
    fromJson,
    input.assessmentMarkdown
      ? input.assessmentMarkdown.replace(/^#+\s*/gm, '').slice(0, 400)
      : '',
  ].filter(Boolean);
  return parts.join('\n').trim();
}

export async function syncAutismCaseFromWeeklyPlan(input: {
  childId: number;
  childName: string;
  language: 'en' | 'id';
  initialObservation?: unknown;
  assessmentMarkdown?: string;
  diagnosis?: string | null;
  planJson: unknown;
  isFirstProgram: boolean;
}) {
  const observationText = buildObservationText({
    initialObservation: input.initialObservation,
    assessmentMarkdown: input.assessmentMarkdown,
    diagnosis: input.diagnosis,
    childName: input.childName,
  });

  if (!observationText) return null;

  const programNames = programNamesFromPlan(input.planJson);
  const id = stableGeneratedCaseId(input.childId);
  const canonicalKey = crypto
    .createHash('sha1')
    .update(`${input.childId}::${observationText.slice(0, 500)}`)
    .digest('hex')
    .slice(0, 16);

  const data = {
    case_number: null as number | null,
    observation_text: observationText,
    observation_json: input.initialObservation ?? undefined,
    initial_programs: programNames.length ? programNames : [],
    plan_snapshot_json: input.planJson as object,
    source: 'generated',
    child_id: input.childId,
    language: input.language,
  };

  const existing = await prisma.abaAutismCase.findUnique({ where: { id } });

  if (existing) {
    return prisma.abaAutismCase.update({
      where: { id },
      data: {
        ...data,
        observation_json: data.observation_json as object | undefined,
        initial_programs: data.initial_programs as string[],
        plan_snapshot_json: data.plan_snapshot_json,
      },
    });
  }

  if (!input.isFirstProgram) {
    const generatedId = `ac_gen_${canonicalKey}`;
    return prisma.abaAutismCase.upsert({
      where: { id: generatedId },
      create: {
        id: generatedId,
        ...data,
        observation_json: data.observation_json as object | undefined,
        initial_programs: data.initial_programs as string[],
        plan_snapshot_json: data.plan_snapshot_json,
      },
      update: {
        ...data,
        observation_json: data.observation_json as object | undefined,
        initial_programs: data.initial_programs as string[],
        plan_snapshot_json: data.plan_snapshot_json,
      },
    });
  }

  return prisma.abaAutismCase.create({
    data: {
      id,
      ...data,
      observation_json: data.observation_json as object | undefined,
      initial_programs: data.initial_programs as string[],
      plan_snapshot_json: data.plan_snapshot_json,
    },
  });
}
