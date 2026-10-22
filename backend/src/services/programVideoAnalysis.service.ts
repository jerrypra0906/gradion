import { GoogleGenAI, FileState, MediaResolution, createPartFromUri } from '@google/genai';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { downloadToTemp } from '../lib/privateMedia.js';
import { checkTokenQuota, hasAIAccess, updateTokenUsage } from './ai.service.js';
import { overlayMasterTeachingFields } from './abaMasterProgram.service.js';
import { notifyAdminsOfPendingAiContent } from './reviewNotification.service.js';

// --- Report shape -------------------------------------------------------------

export type StepVerdict = 'followed' | 'partial' | 'missed' | 'not_observable';
export type TrialMatchVerdict = 'matches' | 'partially_matches' | 'does_not_match' | 'not_applicable';

export interface ProgramVideoReport {
  /** 0-100: how closely the parent followed this program's guidance. */
  overall_score: number;
  confidence: 'high' | 'medium' | 'low';
  /** Clinical summary for the reviewing admin. */
  summary: string;
  video_quality: { usable: boolean; issues: string[] };
  steps: Array<{ step: string; verdict: StepVerdict; timestamp: string | null; note: string }>;
  prompting: { score: number; notes: string; events: Array<{ timestamp: string; detail: string }> };
  reinforcement: { score: number; notes: string; events: Array<{ timestamp: string; detail: string }> };
  trial_recording_match: { verdict: TrialMatchVerdict; notes: string };
  /** Parent-facing. */
  strengths: string[];
  /** Parent-facing. */
  improvements: string[];
  /** Parent-facing message, warm and specific. */
  parent_feedback: string;
}

const STEP_VERDICTS: StepVerdict[] = ['followed', 'partial', 'missed', 'not_observable'];
const MATCH_VERDICTS: TrialMatchVerdict[] = ['matches', 'partially_matches', 'does_not_match', 'not_applicable'];

const REPORT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    overall_score: { type: 'integer', minimum: 0, maximum: 100 },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    summary: { type: 'string' },
    video_quality: {
      type: 'object',
      properties: { usable: { type: 'boolean' }, issues: { type: 'array', items: { type: 'string' } } },
      required: ['usable', 'issues'],
    },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          step: { type: 'string' },
          verdict: { type: 'string', enum: STEP_VERDICTS },
          timestamp: { type: ['string', 'null'] },
          note: { type: 'string' },
        },
        required: ['step', 'verdict', 'note'],
      },
    },
    prompting: {
      type: 'object',
      properties: {
        score: { type: 'integer', minimum: 0, maximum: 100 },
        notes: { type: 'string' },
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: { timestamp: { type: 'string' }, detail: { type: 'string' } },
            required: ['timestamp', 'detail'],
          },
        },
      },
      required: ['score', 'notes', 'events'],
    },
    reinforcement: {
      type: 'object',
      properties: {
        score: { type: 'integer', minimum: 0, maximum: 100 },
        notes: { type: 'string' },
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: { timestamp: { type: 'string' }, detail: { type: 'string' } },
            required: ['timestamp', 'detail'],
          },
        },
      },
      required: ['score', 'notes', 'events'],
    },
    trial_recording_match: {
      type: 'object',
      properties: { verdict: { type: 'string', enum: MATCH_VERDICTS }, notes: { type: 'string' } },
      required: ['verdict', 'notes'],
    },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
    parent_feedback: { type: 'string' },
  },
  required: [
    'overall_score',
    'confidence',
    'summary',
    'video_quality',
    'steps',
    'prompting',
    'reinforcement',
    'trial_recording_match',
    'strengths',
    'improvements',
    'parent_feedback',
  ],
};

function clampScore(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function str(v: unknown, max = 4000): string {
  return String(v ?? '').trim().slice(0, max);
}

function strList(v: unknown, maxItems = 12): string[] {
  return Array.isArray(v) ? v.map((x) => str(x, 600)).filter(Boolean).slice(0, maxItems) : [];
}

function eventList(v: unknown): Array<{ timestamp: string; detail: string }> {
  if (!Array.isArray(v)) return [];
  return v
    .map((e: any) => ({ timestamp: str(e?.timestamp, 16), detail: str(e?.detail, 600) }))
    .filter((e) => e.detail)
    .slice(0, 30);
}

/** Coerce model output (or an admin-edited report) into a well-formed report. */
export function normalizeReport(raw: unknown): ProgramVideoReport {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const confidence = ['high', 'medium', 'low'].includes(r.confidence) ? r.confidence : 'low';
  return {
    overall_score: clampScore(r.overall_score),
    confidence,
    summary: str(r.summary),
    video_quality: {
      usable: r.video_quality?.usable !== false,
      issues: strList(r.video_quality?.issues),
    },
    steps: Array.isArray(r.steps)
      ? r.steps
          .map((s: any) => ({
            step: str(s?.step, 600),
            verdict: (STEP_VERDICTS.includes(s?.verdict) ? s.verdict : 'not_observable') as StepVerdict,
            timestamp: s?.timestamp ? str(s.timestamp, 16) : null,
            note: str(s?.note, 800),
          }))
          .filter((s: { step: string }) => s.step)
          .slice(0, 20)
      : [],
    prompting: {
      score: clampScore(r.prompting?.score),
      notes: str(r.prompting?.notes),
      events: eventList(r.prompting?.events),
    },
    reinforcement: {
      score: clampScore(r.reinforcement?.score),
      notes: str(r.reinforcement?.notes),
      events: eventList(r.reinforcement?.events),
    },
    trial_recording_match: {
      verdict: (MATCH_VERDICTS.includes(r.trial_recording_match?.verdict)
        ? r.trial_recording_match.verdict
        : 'not_applicable') as TrialMatchVerdict,
      notes: str(r.trial_recording_match?.notes),
    },
    strengths: strList(r.strengths),
    improvements: strList(r.improvements),
    parent_feedback: str(r.parent_feedback),
  };
}

/** Starting point for an admin reviewing a video the AI could not analyze. */
export function emptyReport(steps: string[]): ProgramVideoReport {
  return normalizeReport({
    overall_score: 0,
    confidence: 'low',
    video_quality: { usable: true, issues: [] },
    steps: steps.map((step) => ({ step, verdict: 'not_observable', timestamp: null, note: '' })),
    prompting: { score: 0, notes: '', events: [] },
    reinforcement: { score: 0, notes: '', events: [] },
    trial_recording_match: { verdict: 'not_applicable', notes: '' },
    strengths: [],
    improvements: [],
    parent_feedback: '',
  });
}

// --- Context assembly ---------------------------------------------------------

export type ProgramGuidance = {
  id: string;
  name: string;
  domain: string | null;
  rationale: string | null;
  targets: string[];
  materials: string[];
  steps: string[];
  prompts: string[];
  mastery_criteria: string | null;
  recommended_trials_per_day: number | null;
  guided_activity_steps: string[];
};

/** The program's "About this program" + "Guide", as the parent saw it. */
export async function loadProgramGuidance(planJson: unknown, programId: string): Promise<ProgramGuidance | null> {
  const [plan] = (await overlayMasterTeachingFields([planJson])) as any[];
  const program = Array.isArray(plan?.programs)
    ? plan.programs.find((p: any) => String(p?.id) === programId)
    : null;
  if (!program) return null;

  const activitySteps: string[] = [];
  const flow = Array.isArray(plan?.daily_guided_flow) ? plan.daily_guided_flow : [];
  for (const day of flow) {
    for (const a of Array.isArray(day?.activities) ? day.activities : []) {
      if (String(a?.linked_program_id || '') !== programId) continue;
      for (const s of Array.isArray(a?.steps) ? a.steps : []) {
        const t = str(s, 400);
        if (t && !activitySteps.includes(t)) activitySteps.push(t);
      }
    }
  }

  return {
    id: programId,
    name: str(program.name, 200) || 'Program',
    domain: program.domain ? str(program.domain, 120) : null,
    rationale: program.rationale ? str(program.rationale, 1200) : null,
    targets: strList(program.targets),
    materials: strList(program.materials),
    steps: strList(program.steps, 20),
    prompts: strList(program.prompts, 20),
    mastery_criteria: program.mastery_criteria ? str(program.mastery_criteria, 500) : null,
    recommended_trials_per_day: Number.isFinite(Number(program.recommended_trials_per_day))
      ? Number(program.recommended_trials_per_day)
      : null,
    guided_activity_steps: activitySteps,
  };
}

export type TrialEvent = { result: string; phase_or_target: string; at: number | null };

/** The trials the parent tapped for this program during the session. */
export function extractProgramTrials(guidedResults: unknown, programId: string): TrialEvent[] {
  const activities = (guidedResults as { activities?: unknown })?.activities;
  if (!Array.isArray(activities)) return [];
  const out: TrialEvent[] = [];
  for (const a of activities as any[]) {
    if (String(a?.linked_program_id || '') !== programId) continue;
    // Newer sessions carry per-tap timestamps; older ones only the trial strings.
    if (Array.isArray(a?.trial_events) && a.trial_events.length) {
      for (const e of a.trial_events) {
        out.push({
          result: str(e?.result, 4),
          phase_or_target: str(e?.phase_or_target, 200),
          at: Number.isFinite(Number(e?.at)) ? Number(e.at) : null,
        });
      }
      continue;
    }
    for (const set of Array.isArray(a?.trial_sets) ? a.trial_sets : []) {
      const tokens = String(set?.trial_data ?? '').split(/\s+/).filter(Boolean);
      for (const t of tokens) {
        out.push({ result: t, phase_or_target: str(set?.phase_or_target, 200), at: null });
      }
    }
  }
  return out;
}

function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Human-readable trial log, aligned to video time when the app recorded it. */
export function describeTrials(params: {
  trials: TrialEvent[];
  source: 'recording' | 'upload';
  recordingStartedAt: Date | null;
  durationSeconds: number | null;
}): string {
  const { trials } = params;
  if (!trials.length) return 'No trials were recorded by the parent for this program.';
  const start = params.recordingStartedAt?.getTime() ?? null;
  const aligned = params.source === 'recording' && start !== null && trials.some((t) => t.at !== null);
  const lines = trials.map((t, i) => {
    const label = `${t.result}${t.phase_or_target ? ` (${t.phase_or_target})` : ''}`;
    if (aligned && t.at !== null) {
      const offset = (t.at - start!) / 1000;
      const inVideo =
        offset >= -2 && (params.durationSeconds === null || offset <= params.durationSeconds + 5);
      return `${i + 1}. ${inVideo ? mmss(offset) : '(outside recording)'} → ${label}`;
    }
    return `${i + 1}. ${label}`;
  });
  const header = aligned
    ? 'Recorded in the app while filming; times are relative to the start of the video.'
    : 'The video was uploaded separately, so taps cannot be aligned to video time — compare the order and count only.';
  return `${header}\n${lines.join('\n')}`;
}

// --- Learning loop -------------------------------------------------------------

/**
 * Recent admin corrections, to calibrate the next analysis: the same program
 * first, then meaningful corrections elsewhere (score moved ≥10, or a rejection).
 */
export async function getVideoCalibrationExamples(params: {
  programId: string;
  language: string;
  take?: number;
}): Promise<unknown[]> {
  const take = params.take ?? 5;
  const select = {
    program_name: true,
    decision: true,
    ai_json: true,
    admin_json: true,
    score_delta: true,
  } as const;

  const sameProgram = await prisma.abaProgramVideoReviewEdit.findMany({
    where: { program_id: params.programId },
    orderBy: { created_at: 'desc' },
    take: 3,
    select,
  });
  const others = await prisma.abaProgramVideoReviewEdit.findMany({
    where: {
      program_id: { not: params.programId },
      language: params.language,
      OR: [{ score_delta: { gte: 10 } }, { score_delta: { lte: -10 } }, { decision: 'rejected' }],
    },
    orderBy: { created_at: 'desc' },
    take: Math.max(0, take - sameProgram.length),
    select,
  });

  return [...sameProgram, ...others].map((e) => {
    const ai = normalizeReport((e.ai_json as any)?.report);
    const admin = normalizeReport((e.admin_json as any)?.report);
    const changedSteps = admin.steps
      .map((s) => {
        const before = ai.steps.find((x) => x.step === s.step);
        return before && before.verdict !== s.verdict
          ? { step: s.step.slice(0, 160), ai: before.verdict, admin: s.verdict }
          : null;
      })
      .filter(Boolean)
      .slice(0, 4);
    return {
      program: e.program_name,
      admin_decision: e.decision,
      ai_score: (e.ai_json as any)?.score ?? null,
      admin_score: (e.admin_json as any)?.score ?? null,
      ai_summary: ai.summary.slice(0, 240),
      admin_feedback_to_parent: String((e.admin_json as any)?.feedback_text ?? '').slice(0, 300),
      admin_rejection_reason: (e.admin_json as any)?.rejection_reason ?? null,
      step_verdict_corrections: changedSteps,
    };
  });
}

// --- Prompt -------------------------------------------------------------------

export function buildVideoPrompt(params: {
  childFirstName: string;
  language: 'en' | 'id';
  guidance: ProgramGuidance;
  trialLog: string;
  calibration: unknown[];
}): string {
  const lang = params.language === 'id' ? 'Bahasa Indonesia' : 'English';
  return `You are an experienced Board Certified Behavior Analyst (BCBA) reviewing a parent's home video of ONE practice run of ONE ABA program with their child (${params.childFirstName}).

Your job: judge how closely the PARENT carried out this program as described in its guidance below — the "About this program" details and the "Guide" (steps, prompt hierarchy, mastery criteria). Score the parent's fidelity to the guidance, not the child's ability.

Write EVERY text field in ${lang}.
- "summary", step "note", "notes", event "detail": for the clinical reviewer — precise, observable facts.
- "strengths", "improvements", "parent_feedback": shown to the parent. Warm, encouraging, specific and practical; plain language, no jargon; never shame. Celebrate what went well first. At most 2-3 improvements, each a concrete thing to try next time.

PROGRAM GUIDANCE (what the parent was asked to do):
${JSON.stringify(params.guidance, null, 2)}

TRIALS THE PARENT RECORDED IN THE APP (+ = independent, p = prompted, - = incorrect, os = other/not scored):
${params.trialLog}

${
  params.calibration.length
    ? `CALIBRATION — how the clinical admins corrected previous AI reviews. Apply the same standards (scoring strictness, what counts as followed, tone of parent feedback):
${JSON.stringify(params.calibration, null, 2)}
`
    : ''
}SCORING (overall_score, prompting.score, reinforcement.score: 0-100):
- 90-100: guide steps followed in order; prompts follow the stated hierarchy and fade appropriately; reinforcement immediate and contingent.
- 70-89: mostly followed with minor deviations (e.g. a late reinforcer, an unnecessary repeat of the instruction).
- 50-69: several steps missed or prompting/reinforcement often off-protocol.
- below 50: the program was largely not carried out as described.

INSTRUCTIONS:
- Fill "steps" with one entry per guide step (use the program's "steps"; fall back to "guided_activity_steps"), with a verdict and the MM:SS where it happened (null if not observable).
- Timestamps are MM:SS from the start of the video.
- "trial_recording_match": compare the parent's recorded trials with what you see (independent vs prompted vs incorrect). Use "not_applicable" if no trials were recorded.
- If the video is unusable (child or parent not visible, too dark, a different activity, too short to judge), set video_quality.usable=false, confidence "low", list the issues, and do not give a high score.
- Never invent events you cannot see or hear.`;
}

// --- Gemini -------------------------------------------------------------------

function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Model output was not JSON');
    return JSON.parse(m[0]);
  }
}

function geminiMimeType(mime: string): string {
  // Gemini lists .mov as video/mov.
  return mime === 'video/quicktime' ? 'video/mov' : mime;
}

async function runGeminiVideoAnalysis(params: {
  filePath: string;
  mimeType: string;
  prompt: string;
}): Promise<{ json: unknown; tokensUsed: number | null }> {
  const ai = new GoogleGenAI({ apiKey: config.ai.geminiApiKey! });
  const mimeType = geminiMimeType(params.mimeType);
  const uploaded = await ai.files.upload({
    file: params.filePath,
    config: { mimeType, displayName: 'aba-practice-video' },
  });
  const name = uploaded.name;
  if (!name) throw new Error('Gemini Files API returned no file name');

  try {
    let file = uploaded;
    // Video processing usually takes seconds to a minute; allow up to 5 min.
    for (let i = 0; file.state === FileState.PROCESSING && i < 150; i += 1) {
      await new Promise((r) => setTimeout(r, 2000));
      file = await ai.files.get({ name });
    }
    if (file.state !== FileState.ACTIVE || !file.uri) {
      throw new Error(file.error ? JSON.stringify(file.error) : `Video not ready (state ${file.state})`);
    }

    const response = await ai.models.generateContent({
      model: config.ai.geminiVideoModel,
      contents: [
        {
          role: 'user',
          parts: [createPartFromUri(file.uri, file.mimeType || mimeType), { text: params.prompt }],
        },
      ],
      config: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseJsonSchema: REPORT_JSON_SCHEMA,
        // ~70 tokens per frame: Google's recommended setting for action recognition.
        mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
      },
    });

    const text = response.text ?? '';
    return { json: parseJsonLoose(text), tokensUsed: response.usageMetadata?.totalTokenCount ?? null };
  } finally {
    await ai.files.delete({ name }).catch((err) => {
      logger.warn({ err }, 'Failed to delete Gemini file after video analysis');
    });
  }
}

// --- Analysis of one video ----------------------------------------------------

async function sendToManualReview(videoId: number, reason: string, notify: { childId: number; childName: string }) {
  await prisma.abaProgramVideo.update({
    where: { id: videoId },
    data: { status: 'manual_review', ai_error: reason.slice(0, 2000) },
  });
  logger.warn({ videoId, reason }, 'Practice video sent to manual review');
  void notifyAdminsOfPendingAiContent({ kind: 'program_video', ...notify });
}

async function analyzeVideo(videoId: number): Promise<void> {
  const video = await prisma.abaProgramVideo.findUnique({
    where: { id: videoId },
    include: {
      child: { select: { id: true, name: true, parent_id: true } },
      week: { select: { plan_json: true } },
      session: { select: { guided_results_json: true } },
    },
  });
  if (!video) return;
  const notify = { childId: video.child.id, childName: video.child.name };

  if (video.video_deleted_at) {
    return sendToManualReview(videoId, 'Video file has already been deleted', notify);
  }
  if (!config.features.ai || !config.ai.geminiApiKey) {
    return sendToManualReview(videoId, 'AI video analysis is not configured (GEMINI_API_KEY)', notify);
  }

  // Families pay a flat credit per analyzed video (raw usage would exceed whole
  // plan quotas), once: an admin re-run of an already-analyzed video is on us.
  const billingUserId = video.child.parent_id;
  const charge = config.ai.programVideoTokenCharge;
  const billable = video.ai_report_json === null;
  if (billable) {
    const access = await hasAIAccess(billingUserId);
    if (!access.hasAccess) {
      return sendToManualReview(videoId, `Family has no AI access: ${access.reason || 'not available'}`, notify);
    }
    const quota = await checkTokenQuota(billingUserId, charge);
    if (!quota.hasQuota) {
      return sendToManualReview(videoId, 'Family AI token quota exhausted', notify);
    }
  }

  const guidance = await loadProgramGuidance(video.week.plan_json, video.program_id);
  if (!guidance) {
    return sendToManualReview(videoId, 'Program not found in the weekly plan', notify);
  }
  const planLanguage = (video.week.plan_json as { language?: string } | null)?.language === 'en' ? 'en' : 'id';
  const trials = extractProgramTrials(video.session.guided_results_json, video.program_id);
  const calibration = await getVideoCalibrationExamples({
    programId: video.program_id,
    language: planLanguage,
  });
  const prompt = buildVideoPrompt({
    childFirstName: video.child.name.split(/\s+/)[0] || video.child.name,
    language: planLanguage,
    guidance,
    trialLog: describeTrials({
      trials,
      source: video.source,
      recordingStartedAt: video.recording_started_at,
      durationSeconds: video.duration_seconds,
    }),
    calibration,
  });

  let temp: { path: string; cleanup: () => Promise<void> } | null = null;
  try {
    temp = await downloadToTemp(video.storage_key);
    const result = await runGeminiVideoAnalysis({
      filePath: temp.path,
      mimeType: video.mime_type,
      prompt,
    });
    const report = normalizeReport(result.json);

    await prisma.abaProgramVideo.update({
      where: { id: videoId },
      data: {
        status: 'analyzed',
        ai_report_json: report as any,
        ai_score: report.overall_score,
        ai_model: config.ai.geminiVideoModel,
        ai_tokens_used: result.tokensUsed,
        ai_error: null,
        analyzed_at: new Date(),
      },
    });
    if (billable) {
      await updateTokenUsage(billingUserId, charge, {
        childId: video.child.id,
        feature: 'program_video_analysis',
      });
    }
    logger.info({ videoId, score: report.overall_score, tokens: result.tokensUsed }, 'Practice video analyzed');
    void notifyAdminsOfPendingAiContent({ kind: 'program_video', ...notify });
  } catch (err: any) {
    await sendToManualReview(videoId, `AI analysis failed: ${err?.message || String(err)}`, notify);
  } finally {
    await temp?.cleanup();
  }
}

// --- Background worker --------------------------------------------------------

let running = false;
let rerun = false;

async function claimNextQueued(): Promise<number | null> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const next = await prisma.abaProgramVideo.findFirst({
      where: { status: 'queued' },
      orderBy: { created_at: 'asc' },
      select: { id: true },
    });
    if (!next) return null;
    // Atomic claim so two kicks never analyze (and bill) the same video twice.
    const claimed = await prisma.abaProgramVideo.updateMany({
      where: { id: next.id, status: 'queued' },
      data: { status: 'analyzing' },
    });
    if (claimed.count === 1) return next.id;
  }
  return null;
}

async function runWorker(): Promise<void> {
  running = true;
  try {
    do {
      rerun = false;
      for (let id = await claimNextQueued(); id !== null; id = await claimNextQueued()) {
        try {
          await analyzeVideo(id);
        } catch (err) {
          logger.error({ err, videoId: id }, 'Practice video worker error');
          await prisma.abaProgramVideo
            .update({ where: { id }, data: { status: 'manual_review', ai_error: 'Unexpected worker error' } })
            .catch(() => {});
        }
      }
    } while (rerun);
  } finally {
    running = false;
  }
}

/** Process queued videos now (single-flight: a running worker picks up new work). */
export function kickProgramVideoWorker(): void {
  if (running) {
    rerun = true;
    return;
  }
  void runWorker();
}

/**
 * Start the worker. Videos left "analyzing" by a crashed or restarted process
 * are re-queued once stale, and a periodic tick catches anything a kick missed.
 */
export function startProgramVideoWorker(): void {
  const recoverStale = async () => {
    const stale = await prisma.abaProgramVideo.updateMany({
      where: { status: 'analyzing', updated_at: { lt: new Date(Date.now() - 20 * 60 * 1000) } },
      data: { status: 'queued' },
    });
    if (stale.count) logger.warn({ count: stale.count }, 'Re-queued stale practice video analyses');
  };
  const tick = () => {
    recoverStale()
      .catch((err) => logger.error({ err }, 'Practice video stale recovery failed'))
      .finally(() => kickProgramVideoWorker());
  };
  tick();
  setInterval(tick, 2 * 60 * 1000);
  logger.info({ model: config.ai.geminiVideoModel }, 'Practice video analysis worker started');
}

/** After a practice session is submitted, its uploaded videos move to the analysis queue. */
export async function queueSessionVideos(sessionId: number): Promise<number> {
  const res = await prisma.abaProgramVideo.updateMany({
    where: { session_id: sessionId, status: 'uploaded' },
    data: { status: 'queued' },
  });
  if (res.count) kickProgramVideoWorker();
  return res.count;
}
