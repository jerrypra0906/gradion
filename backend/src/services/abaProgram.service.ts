import {
  generateStructuredJsonFromImagePrompt,
  generateStructuredJsonFromPrompt,
} from './ai.service.js';

const EN_GUIDED_LINE2 = 'Give the instruction once. Prompt if needed (p).';
const ID_GUIDED_LINE2 = 'Beri instruksi sekali. Beri isyarat bila perlu (p).';
const EN_GUIDED_LINE3 = 'Mark each trial: + (independent), p (prompted), - (incorrect).';
const ID_GUIDED_LINE3 = 'Tandai setiap trial: + (mandiri), p (dibantu), - (salah).';

export async function translateWeeklyAbaPlanJson(input: {
  fromPlanJson: unknown;
  toLanguage: 'en' | 'id';
}): Promise<{ json: unknown; tokensUsed: number } | null> {
  const system = `You are a clinical program translator for parent-led ABA plans.

Return ONE JSON object only (no markdown, no commentary).

Rules:
- Preserve the EXACT JSON structure and keys from the input.
- Do NOT change any ids (program ids, activity ids, etc).
- Translate only human-facing strings (titles, rationale, targets, steps, materials, coaching text, hints).
- Keep symbols and tokens unchanged (+, -, p).
- Keep demo_video_url and video_url exactly as in the input (do not translate or alter URLs).
- Ensure output is valid JSON.`;

  const user = `Translate this plan JSON to language: ${input.toLanguage}.

--- INPUT JSON ---
${JSON.stringify(input.fromPlanJson)}
--- END ---`;

  const out = await generateStructuredJsonFromPrompt({
    systemInstruction: system,
    userText: user,
    maxOutputTokens: 1400,
    temperature: 0,
  });
  if (!out) return null;
  const translated: any = out.json as any;
  if (translated && typeof translated === 'object') {
    translated.language = input.toLanguage;
  }
  return { json: ensureGuidedFlow(translated), tokensUsed: out.tokensUsed };
}

function localizeKnownGuidedSteps(steps: string[], lang: 'en' | 'id'): string[] {
  if (!Array.isArray(steps) || lang !== 'id') return steps;

  return steps.map((raw) => {
    const s = String(raw ?? '');
    let out = s;
    out = out.replace(/^Prepare:\s*/i, 'Persiapan: ');
    if (out === EN_GUIDED_LINE2) return ID_GUIDED_LINE2;
    if (out === EN_GUIDED_LINE3) return ID_GUIDED_LINE3;
    return out;
  });
}

export function ensureGuidedFlow(plan: any) {
  const safePlan: any = plan && typeof plan === 'object' ? plan : {};
  const programs: any[] = Array.isArray(safePlan.programs) ? safePlan.programs : [];

  if (!safePlan.language) safePlan.language = 'en';
  const planLang: 'en' | 'id' = safePlan.language === 'id' ? 'id' : 'en';

  const programById = new Map<string, any>();
  for (const p of programs) {
    if (p?.id != null) programById.set(String(p.id), p);
  }

  const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const getProgram = (i: number) => programs[i % Math.max(1, programs.length)] || null;

  const makeActivity = (day: string, idx: number, program: any) => {
    const programId = program?.id ? String(program.id) : 'program_1';
    const programName = program?.name ? String(program.name) : 'Home practice';
    const target = Array.isArray(program?.targets) && program.targets.length ? String(program.targets[0]) : 'Follow simple instruction';
    const expected = Math.max(
      8,
      Math.min(20, Number(program?.recommended_trials_per_day || 10))
    );
    const defaultMatEn = '2–3 simple items';
    const defaultMatId = '2–3 barang sederhana';
    const mat0 =
      Array.isArray(program?.materials) && program.materials.length
        ? String(program.materials[0])
        : planLang === 'id'
          ? defaultMatId
          : defaultMatEn;
    const stepsEn = [`Prepare: ${mat0}.`, EN_GUIDED_LINE2, EN_GUIDED_LINE3];
    const stepsId = [`Persiapan: ${mat0}.`, ID_GUIDED_LINE2, ID_GUIDED_LINE3];
    const demoUrl =
      program?.demo_video_url && String(program.demo_video_url).trim()
        ? String(program.demo_video_url).trim()
        : null;
    return {
      id: `${day}_a${idx + 1}`,
      title: `${programName}: ${target}`,
      duration_seconds: 600,
      linked_program_id: programId,
      steps: planLang === 'id' ? stepsId : stepsEn,
      timer_seconds: 300,
      video_url: demoUrl,
      parent_records: {
        type: 'trial_string',
        expected_length: expected,
        hint: '+ + p - + ...',
      },
    };
  };

  let flow: any[] = Array.isArray(safePlan.daily_guided_flow) ? safePlan.daily_guided_flow : [];
  // Normalize days: keep only mon-fri, fill missing.
  const byDay = new Map<string, any>();
  for (const row of flow) {
    const d = row?.day ? String(row.day).toLowerCase().trim() : '';
    if (days.includes(d)) byDay.set(d, row);
  }

  const normalizedFlow = days.map((d) => {
    const row = byDay.get(d) || { day: d, activities: [] };
    const acts = Array.isArray(row.activities) ? row.activities : [];
    if (acts.length > 0) return { day: d, activities: acts };

    // Auto-fill 3 activities if empty/missing.
    const filled = [0, 1, 2].map((i) => makeActivity(d, i, getProgram(i)));
    return { day: d, activities: filled };
  });

  safePlan.daily_guided_flow = normalizedFlow;

  for (const row of safePlan.daily_guided_flow) {
    const acts = Array.isArray(row?.activities) ? row.activities : [];
    for (const act of acts) {
      if (Array.isArray(act?.steps)) {
        act.steps = localizeKnownGuidedSteps(act.steps, planLang);
      }
      const lid = act?.linked_program_id != null ? String(act.linked_program_id) : '';
      const prog = lid ? programById.get(lid) : null;
      const demo =
        prog?.demo_video_url && String(prog.demo_video_url).trim()
          ? String(prog.demo_video_url).trim()
          : '';
      if (demo && (!act.video_url || !String(act.video_url).trim())) {
        act.video_url = demo;
      }
    }
  }

  if (!safePlan.setting) safePlan.setting = 'Home (10–20 minutes/day)';
  if (!safePlan.parent_coaching) {
    safePlan.parent_coaching = {
      reinforcement: ['Praise immediately for correct attempts', 'Use small rewards for effort'],
      error_correction: ['Brief prompt, then try again', 'Keep it calm and short'],
      prompting: ['Start with help, fade slowly', 'Use p when you helped'],
    };
  }

  return safePlan;
}

const WEEKLY_PLAN_SYSTEM = `You are an experienced BCBA designing a ONE-WEEK parent-led home practice plan.

Hard requirements:
- Output MUST be a single JSON object (no markdown, no commentary).
- Keep it realistic for busy parents (short sessions, clear steps).
- Keep ALL strings short. Prefer short phrases over long paragraphs.
- Programs should reflect the child's Initial Observation (priorities + strengths) AND Initial Assessment report.
- Use similar_autism_cases_json as reference exemplars: match program types/domains to observation patterns, but personalize targets for THIS child.
- If prior week's therapy notes or guided session results are provided, adjust targets, trial counts, and difficulty based on observed accuracy/prompting.
- If learning_insights_json is provided, follow its recommendations (increase/decrease difficulty, fade prompts, swap programs that underperformed).
- If clinical_review_comments_json is provided, incorporate therapist/parent review feedback (especially flagged items) into program selection, targets, and parent coaching.
- Include a boolean field "mainstream_goal_met" ONLY when the assessment + notes strongly indicate the child is ready to transition toward mainstream-style routines with minimal ABA intensity. Otherwise set false.
- If master_program_library_json is provided and a program clearly matches an existing master, REUSE that master program by copying its id + core fields (do not invent a new id).
- Masters with "curated": true are admin-approved exemplars. Prefer reusing curated masters when they fit the child. When you create a NEW program, imitate the curated masters' naming style, tone, target structure, materials style, and level of detail.
- If admin_curation_examples_json is provided, it shows how clinic admins corrected AI-generated programs (before -> after). Learn from these corrections and apply the same standards (wording, specificity, realistic trials/materials) to EVERY program in this plan.
- For the FIRST weekly program (is_first_program=true), prioritize foundational programs similar to the reference cases (reinforcer development, waiting/tolerance, imitation, receptive instructions) before advanced skills.
- If carry_over_programs_json is provided (the child scored below the advancement threshold), you MUST include ALL of those programs in this plan — keep their ids, names, and core content identical (you may simplify targets or reduce trials slightly for reinforcement) — and ADD 2-3 NEW complementary programs that address the observed weaknesses.

JSON shape (all keys required unless empty arrays):
{
  "language": "en" | "id",
  "week_start": "YYYY-MM-DD",
  "setting": string,
  "parent_coaching": { "reinforcement": string[], "error_correction": string[], "prompting": string[] },
  "programs": [
    {
      "id": string,
      "name": string,
      "domain": string,
      "rationale": string,
      "targets": string[],
      "recommended_trials_per_day": number,
      "materials": string[],
      "demo_video_url": string | null,
      "steps": string[],
      "prompts": string[],
      "mastery_criteria": string,
      "data_collection": {
        "symbols": ["+","-","p"],
        "trial_string_example": string
      }
    }
  ],
  "daily_guided_flow": [
    {
      "day": "mon"|"tue"|"wed"|"thu"|"fri"|"sat"|"sun",
      "activities": [
        {
          "id": string,
          "title": string,
          "duration_seconds": number,
          "linked_program_id": string,
          "steps": string[],
          "timer_seconds": number,
          "video_url": string | null,
          "parent_records": {
            "type": "trial_string",
            "expected_length": number,
            "hint": string
          }
        }
      ]
    }
  ],
  "mainstream_goal_met": boolean
}

Rules for daily_guided_flow:
- Provide EXACTLY 5 days (mon-fri) with 3-4 activities each.
- Each steps array MUST be 2-4 short steps max.
- Each activity must include timer_seconds (>=60 unless a quick check-in) and duration_seconds (total guidance window).
- parent_records.expected_length should match recommended trial count for that activity (10-20 typical).
- linked_program_id must match a programs[].id.
- When language is "id", every parent-facing string (names, steps, hints, materials, coaching) MUST be Bahasa Indonesia (no English fragments).
- demo_video_url / video_url: optional. Use a stable public YouTube watch URL ONLY when you are confident it matches the skill (ABA parent coaching / modeling). If unsure, set null.

Programs list:
- 5-8 programs total, each with concrete targets and materials parents likely have at home.
- EVERY program MUST include all three teaching fields, written for parents (no jargon):
  - "steps" (Langkah): 3-6 short numbered steps describing exactly how to run one trial of the program.
  - "prompts": 2-4 prompt levels from most to least help (e.g. full physical -> partial -> gestural/verbal -> independent), phrased as what the parent does.
  - "mastery_criteria": ONE short measurable sentence (e.g. "80% independent across 3 consecutive days").
- Match the wording style of these fields to the master_program_library_json entries (especially curated ones) so the library stays consistent.`;

const THERAPY_NOTES_OCR_SYSTEM = `You read photos of handwritten ABA "Therapy Notes" forms (Indonesian/English mix).

Return ONE JSON object only (no markdown).

Expected JSON:
{
  "header": { "date"?: string, "time"?: string, "therapist"?: string },
  "rows": [
    {
      "program": string,
      "phase_or_target": string,
      "trial_count"?: number,
      "estimate_band": "0-25"|"26-50"|"51-75"|"76-100"|null,
      "trial_data": string,
      "remarks"?: string
    }
  ],
  "summary"?: string
}

Rules:
- trial_data must be a string containing only tokens separated by spaces: + - p (prompted). Preserve order.
- Map checked estimate column to estimate_band. If unclear, null.
- If handwriting is unclear, best-effort guess and keep trial_data length close to trial_count when trial_count is known.`;

export async function generateWeeklyAbaPlanJson(input: {
  language: 'en' | 'id';
  weekStartYmd: string;
  childName: string;
  diagnosis?: string | null;
  assessmentMarkdown: string;
  initialObservationJson?: unknown | null;
  previousTherapyNotesJson?: unknown | null;
  previousGuidedResultsJson?: unknown | null;
  learningInsights?: unknown | null;
  similarAutismCases?: unknown | null;
  masterPrograms?: unknown | null;
  curationExamples?: unknown | null;
  carryOverPrograms?: unknown | null;
  isFirstProgram?: boolean;
  statedGoals?: unknown | null;
  clinicalReviewComments?: unknown | null;
}): Promise<{ json: unknown; tokensUsed: number } | null> {
  const prevNotes =
    input.previousTherapyNotesJson === null || input.previousTherapyNotesJson === undefined
      ? 'null'
      : JSON.stringify(input.previousTherapyNotesJson);

  const prevGuided =
    input.previousGuidedResultsJson === null || input.previousGuidedResultsJson === undefined
      ? 'null'
      : JSON.stringify(input.previousGuidedResultsJson);

  const learning =
    input.learningInsights === null || input.learningInsights === undefined
      ? 'null'
      : JSON.stringify(input.learningInsights);

  const similarCases =
    input.similarAutismCases === null || input.similarAutismCases === undefined
      ? 'null'
      : JSON.stringify(input.similarAutismCases);

  const master =
    input.masterPrograms === null || input.masterPrograms === undefined
      ? 'null'
      : JSON.stringify(input.masterPrograms);

  const curation =
    input.curationExamples === null || input.curationExamples === undefined
      ? 'null'
      : JSON.stringify(input.curationExamples);

  const carryOver =
    input.carryOverPrograms === null || input.carryOverPrograms === undefined
      ? 'null'
      : JSON.stringify(input.carryOverPrograms);

  const observation =
    input.initialObservationJson === null || input.initialObservationJson === undefined
      ? 'null'
      : JSON.stringify(input.initialObservationJson);

  const goals =
    input.statedGoals === null || input.statedGoals === undefined
      ? 'null'
      : JSON.stringify(input.statedGoals);

  const clinicalReviews =
    input.clinicalReviewComments === null || input.clinicalReviewComments === undefined
      ? 'null'
      : JSON.stringify(input.clinicalReviewComments);

  const user = `Create the weekly plan.

language: ${input.language}
week_start: ${input.weekStartYmd}
child_name: ${input.childName}
diagnosis: ${input.diagnosis || 'unknown'}
is_first_program: ${input.isFirstProgram ? 'true' : 'false'}

master_program_library_json:
${master}

admin_curation_examples_json (how admins corrected AI programs — imitate the "after" style):
${curation}

carry_over_programs_json (score below threshold — keep ALL of these in the new plan and add 2-3 new ones):
${carryOver}

similar_autism_cases_json (reference exemplars from master case library):
${similarCases}

initial_observation_json (raw checklist from parent):
${observation}

initial_assessment_markdown:
---
${input.assessmentMarkdown}
---

stated_goals_json (therapist/parent goals if any):
${goals}

previous_week_therapy_notes_json:
${prevNotes}

previous_week_guided_results_json:
${prevGuided}

learning_insights_json (prior weeks — use recommendations to improve this plan):
${learning}

clinical_review_comments_json (therapist/parent log & session reviews — address flagged concerns):
${clinicalReviews}
`;

  // Attempt 1: full plan. Each program now carries steps/prompts/mastery
  // fields, so the JSON needs substantially more room than the old shape.
  const out1 = await generateStructuredJsonFromPrompt({
    systemInstruction: WEEKLY_PLAN_SYSTEM,
    userText: user,
    maxOutputTokens: 2600,
    temperature: 0.15,
  });
  if (out1) return { json: ensureGuidedFlow(out1.json), tokensUsed: out1.tokensUsed };

  // Attempt 2 (fallback): even smaller, to avoid model truncation / invalid JSON.
  const fallbackUser = `${user}\n\nExtra constraints (must follow):\n- Keep daily_guided_flow activities per day to exactly 3.\n- Keep each step under 90 characters.\n- Use very short rationales (<= 140 characters).\n- Use 5 programs exactly.\n`;
  const out2 = await generateStructuredJsonFromPrompt({
    systemInstruction: WEEKLY_PLAN_SYSTEM,
    userText: fallbackUser,
    maxOutputTokens: 2000,
    temperature: 0.1,
  });
  if (!out2) return null;
  return { json: ensureGuidedFlow(out2.json), tokensUsed: out2.tokensUsed };
}

export async function extractTherapyNotesJsonFromImage(input: {
  imageBase64: string;
  mimeType: string;
  expectedPrograms?: Array<{ id: string; name: string }>;
}): Promise<{ json: unknown; tokensUsed: number } | null> {
  const expected =
    input.expectedPrograms && input.expectedPrograms.length
      ? JSON.stringify(input.expectedPrograms)
      : 'null';

  const user = `Extract therapy notes from this image.

Optional mapping hints (program id + name):
${expected}

If hints are provided, also include a field "matched_program_ids" as an array of { "row_index": number, "program_id": string|null, "confidence": number } for each row index (0-based).`;

  const out = await generateStructuredJsonFromImagePrompt({
    systemInstruction: THERAPY_NOTES_OCR_SYSTEM,
    userText: user,
    image: { mimeType: input.mimeType, base64: input.imageBase64 },
    maxOutputTokens: 2000,
    temperature: 0.05,
  });
  if (!out) return null;
  return { json: out.json, tokensUsed: out.tokensUsed };
}
