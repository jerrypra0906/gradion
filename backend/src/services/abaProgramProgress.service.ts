/**
 * Per-program execution/score stats for a weekly ABA plan, and the gate that
 * decides when the parent may generate the NEXT program:
 *  - average score >= 75% and every program executed >= 3 times ("advance"), or
 *  - average score  < 75% and every program executed >= 6 times ("reinforce" —
 *    the old programs are carried over into the new plan with additions).
 * Refreshing the current program is never gated.
 */

export const ADVANCE_SCORE_PCT = 75;
export const ADVANCE_MIN_EXECUTIONS = 3;
export const REINFORCE_MIN_EXECUTIONS = 6;

export type ProgramProgress = {
  program_id: string;
  program_name: string;
  executions: number;
  trials: number;
  score_pct: number | null;
};

export type WeekProgramProgress = {
  per_program: ProgramProgress[];
  avg_score_pct: number | null;
  min_executions: number;
  required_executions: number;
  can_generate_new: boolean;
  mode: 'advance' | 'reinforce';
};

function normName(x: unknown) {
  return String(x ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function countTokens(raw: unknown): { independent: number; counted: number } {
  const tokens = String(raw ?? '')
    .split(/\s+/)
    .filter(Boolean);
  let independent = 0;
  let counted = 0;
  for (const t of tokens) {
    if (t === '+') {
      independent += 1;
      counted += 1;
    } else if (t === 'p' || t === 'P' || t === '-') {
      counted += 1;
    }
    // other tokens (e.g. "os") are not scored
  }
  return { independent, counted };
}

export function computeWeekProgramProgress(week: {
  plan_json: unknown;
  therapy_notes_json?: unknown | null;
  sessions?: Array<{ status: string; guided_results_json?: unknown | null }> | null;
}): WeekProgramProgress | null {
  const plan = week.plan_json as { programs?: Array<Record<string, unknown>> } | null;
  const programs = Array.isArray(plan?.programs) ? plan!.programs! : [];
  if (!programs.length) return null;

  const byId = new Map<string, { name: string; executions: number; independent: number; counted: number }>();
  const idByName = new Map<string, string>();
  for (const p of programs) {
    const id = p?.id != null ? String(p.id) : '';
    if (!id) continue;
    const name = String(p?.name ?? id);
    byId.set(id, { name, executions: 0, independent: 0, counted: 0 });
    idByName.set(normName(name), id);
  }

  const record = (programId: string, trialData: unknown) => {
    const row = byId.get(programId);
    if (!row) return;
    const { independent, counted } = countTokens(trialData);
    if (counted === 0) return;
    row.executions += 1;
    row.independent += independent;
    row.counted += counted;
  };

  // Guided sessions: results are stored either as trial_sets (current) or a
  // single trial_string (legacy).
  const sessions = Array.isArray(week.sessions) ? week.sessions : [];
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const results = s.guided_results_json as {
      activities?: Array<{
        linked_program_id?: string | null;
        trial_string?: string;
        trial_sets?: Array<{ trial_data?: string }>;
      }>;
    } | null;
    const acts = Array.isArray(results?.activities) ? results!.activities! : [];
    for (const a of acts) {
      const pid = a?.linked_program_id != null ? String(a.linked_program_id) : '';
      if (!pid) continue;
      if (Array.isArray(a.trial_sets) && a.trial_sets.length) {
        const combined = a.trial_sets.map((ts) => String(ts?.trial_data ?? '')).join(' ');
        record(pid, combined);
      } else if (a.trial_string) {
        record(pid, a.trial_string);
      }
    }
  }

  // Uploaded therapy notes (OCR): match rows to programs by extracted mapping
  // hints when present, otherwise by (normalized) program name.
  const notes = week.therapy_notes_json as {
    rows?: Array<{ program?: string; trial_data?: string }>;
    matched_program_ids?: Array<{ row_index?: number; program_id?: string | null }>;
  } | null;
  const rows = Array.isArray(notes?.rows) ? notes!.rows! : [];
  const matches = Array.isArray(notes?.matched_program_ids) ? notes!.matched_program_ids! : [];
  const matchByRow = new Map<number, string>();
  for (const m of matches) {
    if (m?.program_id && Number.isInteger(m?.row_index)) {
      matchByRow.set(Number(m.row_index), String(m.program_id));
    }
  }
  rows.forEach((r, i) => {
    const pid = matchByRow.get(i) || idByName.get(normName(r?.program)) || '';
    if (pid) record(pid, r?.trial_data);
  });

  const per_program: ProgramProgress[] = [...byId.entries()].map(([program_id, r]) => ({
    program_id,
    program_name: r.name,
    executions: r.executions,
    trials: r.counted,
    score_pct: r.counted > 0 ? Math.round((r.independent / r.counted) * 100) : null,
  }));

  const scored = per_program.filter((p) => p.score_pct !== null);
  const avg_score_pct = scored.length
    ? Math.round(scored.reduce((sum, p) => sum + (p.score_pct as number), 0) / scored.length)
    : null;
  const min_executions = per_program.reduce(
    (min, p) => Math.min(min, p.executions),
    Number.POSITIVE_INFINITY
  );
  const minExec = Number.isFinite(min_executions) ? min_executions : 0;

  const advancing = avg_score_pct !== null && avg_score_pct >= ADVANCE_SCORE_PCT;
  const required_executions = advancing ? ADVANCE_MIN_EXECUTIONS : REINFORCE_MIN_EXECUTIONS;
  const can_generate_new = avg_score_pct !== null && minExec >= required_executions;

  return {
    per_program,
    avg_score_pct,
    min_executions: minExec,
    required_executions,
    can_generate_new,
    mode: advancing ? 'advance' : 'reinforce',
  };
}
