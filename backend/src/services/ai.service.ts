import OpenAI from 'openai';
import { GoogleGenerativeAI, type Part } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { getPlanConfig, expireTrialIfNeeded, ensureAITokenWallet } from '../lib/subscription.js';
import type { SubscriptionPlan } from '@prisma/client';

let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!config.ai.openaiApiKey) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: config.ai.openaiApiKey,
    });
  }

  return openaiClient;
}

function hasGemini(): boolean {
  return Boolean(config.ai.geminiApiKey);
}

function hasOpenAI(): boolean {
  return Boolean(config.ai.openaiApiKey);
}

function hasAnthropic(): boolean {
  return Boolean(config.ai.anthropicApiKey);
}

function hasAnyAiProvider(): boolean {
  return hasGemini() || hasOpenAI() || hasAnthropic();
}

function formatProviderError(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    if (typeof e.message === 'string') {
      const status = typeof e.status === 'number' ? ` (HTTP ${e.status})` : '';
      return `${e.message}${status}`;
    }
    const nested = e.error;
    if (nested && typeof nested === 'object' && typeof (nested as { message?: string }).message === 'string') {
      return (nested as { message: string }).message;
    }
  }
  return error instanceof Error ? error.message : String(error);
}

let lastTextGenerationError: string | null = null;

function captureTextGenerationError(
  error: unknown,
  provider: string,
  model: string
): void {
  lastTextGenerationError = `${provider} (${model}): ${formatProviderError(error)}`;
  logger.error({ err: error, provider, model }, 'AI text generation failed');
}

export function getLastTextGenerationError(): string | null {
  return lastTextGenerationError;
}

function getAnthropicClient(): Anthropic | null {
  if (!config.ai.anthropicApiKey) return null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: config.ai.anthropicApiKey });
  }
  return anthropicClient;
}

async function generateTextGemini(
  systemInstruction: string,
  userText: string,
  options: { maxOutputTokens: number; temperature: number }
): Promise<{ text: string; tokensUsed: number } | null> {
  if (!config.ai.geminiApiKey) {
    return null;
  }
  try {
    const genAI = new GoogleGenerativeAI(config.ai.geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: config.ai.geminiModel,
      systemInstruction,
    });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: {
        maxOutputTokens: options.maxOutputTokens,
        temperature: options.temperature,
      },
    });
    const text = result.response.text().trim();
    const meta = result.response.usageMetadata;
    const tokensUsed =
      meta?.totalTokenCount ?? Math.ceil((userText.length + text.length) / 4);
    if (!text) {
      return null;
    }
    return { text, tokensUsed };
  } catch (error: unknown) {
    captureTextGenerationError(error, 'Gemini', config.ai.geminiModel);
    return null;
  }
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString: '"' | "'" | null = null;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch as '"' | "'";
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

async function generateJsonGemini(
  systemInstruction: string,
  userParts: Part[],
  options: { maxOutputTokens: number; temperature: number }
): Promise<{ text: string; tokensUsed: number } | null> {
  if (!config.ai.geminiApiKey) return null;
  try {
    const genAI = new GoogleGenerativeAI(config.ai.geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: config.ai.geminiModel,
      systemInstruction,
    });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: userParts }],
      generationConfig: {
        maxOutputTokens: options.maxOutputTokens,
        temperature: options.temperature,
      },
    });
    const text = result.response.text().trim();
    const meta = result.response.usageMetadata;
    const tokensUsed =
      meta?.totalTokenCount ?? Math.ceil(text.length / 4);
    if (!text) return null;
    return { text, tokensUsed };
  } catch (error: unknown) {
    captureTextGenerationError(error, 'Gemini', config.ai.geminiModel);
    return null;
  }
}

async function generateTextOpenAI(
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens: number; temperature: number }
): Promise<{ text: string; tokensUsed: number } | null> {
  const client = getOpenAIClient();
  if (!client) {
    return null;
  }
  try {
    const response = await client.chat.completions.create({
      model: config.ai.openaiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_completion_tokens: options.maxTokens,
      temperature: options.temperature,
    });
    const text = response.choices[0]?.message?.content?.trim() || '';
    const tokensUsed = response.usage?.total_tokens || 0;
    if (!text) {
      return null;
    }
    return { text, tokensUsed };
  } catch (error: unknown) {
    captureTextGenerationError(error, 'OpenAI', config.ai.openaiModel);
    return null;
  }
}

async function generateTextClaude(
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens: number; temperature: number }
): Promise<{ text: string; tokensUsed: number } | null> {
  const client = getAnthropicClient();
  if (!client) return null;
  try {
    const resp = await client.messages.create({
      model: config.ai.anthropicModel,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text =
      resp.content
        .filter((c) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n')
        .trim() || '';

    const tokensUsed =
      (resp.usage?.input_tokens ?? 0) + (resp.usage?.output_tokens ?? 0);

    if (!text) return null;
    return { text, tokensUsed };
  } catch (error: unknown) {
    captureTextGenerationError(error, 'Anthropic', config.ai.anthropicModel);
    return null;
  }
}

async function generateJsonClaudeVision(
  systemPrompt: string,
  userText: string,
  image: {
    mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    base64: string;
  },
  options: { maxTokens: number; temperature: number }
): Promise<{ text: string; tokensUsed: number } | null> {
  const client = getAnthropicClient();
  if (!client) return null;
  try {
    const resp = await client.messages.create({
      model: config.ai.anthropicModel,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: image.mimeType,
                data: image.base64,
              },
            },
          ],
        },
      ],
    });

    const text =
      resp.content
        .filter((c) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n')
        .trim() || '';

    const tokensUsed =
      (resp.usage?.input_tokens ?? 0) + (resp.usage?.output_tokens ?? 0);

    if (!text) return null;
    return { text, tokensUsed };
  } catch (error: unknown) {
    logger.error({ err: error }, 'Claude vision JSON generation failed');
    return null;
  }
}

export async function translateInitialAssessmentMarkdownToIndonesian(
  englishMarkdown: string
): Promise<{ reportMarkdown: string; tokensUsed: number } | null> {
  const system =
    'You are a professional medical/clinical translator. Translate English to Bahasa Indonesia accurately and naturally. Preserve Markdown structure (headings, lists, emphasis). Do not add new content. Do not remove content.';

  const user = `Translate the following Markdown report into Bahasa Indonesia.

Rules:
- Preserve Markdown formatting and structure.
- Keep names as-is.
- Do not add commentary or extra sections.
- Output ONLY the translated Markdown.

--- BEGIN REPORT ---
${englishMarkdown}
--- END REPORT ---`;

  const out = await generateTextClaude(system, user, { maxTokens: 1100, temperature: 0.2 });
  if (!out) return null;
  return { reportMarkdown: out.text, tokensUsed: out.tokensUsed };
}

const INITIAL_ASSESSMENT_SYSTEM_PROMPT = `You are a compassionate BCBA (early intervention, ESDM-informed). Your goal is to help parents understand the checklist results quickly, clearly, and kindly.`;

// Keep this prompt short to reduce latency and cost.
// Output must stay structured (Markdown headings) because the UI renders it.
const INITIAL_ASSESSMENT_USER_PROMPT_TEMPLATE = `You will receive an "Initial Observation Checklist" summary.

Write a short, parent-friendly report that is supportive and easy to understand. Avoid scary language and avoid over-confident conclusions.

Output EXACTLY these sections in Markdown:

## 1. What we’re seeing (from the checklist)
- 3-5 bullet points. Use plain language. Mention strengths too.

## 2. What this may mean (simple explanation)
- 2-4 bullet points. No jargon. If you use a term, explain it in one short sentence.

## 3. What to try this week (gentle, practical steps)
- 5-7 numbered steps that are doable at home.
- Keep each step 1-2 sentences.

Important:
- This is NOT a medical diagnosis. Say that once (gently).
- Be warm and reassuring. Many parents feel overwhelmed—acknowledge that.
- Use ONLY the provided data. If something isn’t measured, say “not captured in this checklist”.

--- INPUT SUMMARY ---
{{SUMMARY}}

--- RAW JSON (for reference) ---
{{RAW_JSON}}`;

export type InitialAssessmentResult =
  | { ok: true; reportMarkdown: string; tokensUsed: number }
  | { ok: false; error: string };

export async function generateInitialAssessmentFromObservation(input: {
  childName: string;
  diagnosis?: string | null;
  initialObservation: unknown;
  language?: 'en' | 'id';
}): Promise<InitialAssessmentResult> {
  // Minimal, robust mapping from our saved OBS1 payload into the prompt's schema
  const raw = input.initialObservation as any;
  const obs1 = raw?.obs1 ?? raw?.obs?.obs1 ?? raw;

  const eye = obs1?.eye_contact ?? {};
  const compliance = obs1?.compliance_pct ?? {};
  const behaviors = obs1?.behaviors ?? {};

  const getFS = (b: any) => (b ? `F=${b.f ?? 'N/A'}, S=${b.s ?? 'N/A'}` : 'N/A');

  const summaryLines: string[] = [
    `Child: ${input.childName}${input.diagnosis ? ` (Dx noted: ${input.diagnosis})` : ''}`,
    '',
    `Attention span (avg minutes): ${obs1?.attention_span_minutes ?? 'N/A'}`,
    `Eye contact (%): on request=${eye.on_request_pct ?? 'N/A'}, name called=${eye.name_called_pct ?? 'N/A'}, talking/listening=${eye.talking_listening_pct ?? 'N/A'}`,
    `Engagement (%): looking at task materials=${obs1?.looking_at_task_materials_pct ?? 'N/A'}, follows simple directives w/gestures=${obs1?.follows_simple_directives_with_gestures_pct ?? 'N/A'}`,
    `Compliance (%): 5ft=${compliance.come_here_5ft ?? 'N/A'}, across room=${compliance.come_from_across_room ?? 'N/A'}, other parts house=${compliance.come_from_other_parts_house ?? 'N/A'}, outside close/confined=${compliance.come_outside_close_confined ?? 'N/A'}, outside longer=${compliance.come_outside_longer_distance ?? 'N/A'}, sit=${compliance.sit_down ?? 'N/A'}, stand=${compliance.stand_up ?? 'N/A'}, hands down=${compliance.hands_down ?? 'N/A'}`,
    '',
    `Behavior (frequency/severity 1-5):`,
    `- Tantrums: ${getFS(behaviors.tantrums)}`,
    `- Aggression: ${getFS(behaviors.aggression)}`,
    `- Self-abuse: ${getFS(behaviors.self_abuse)}`,
    `- Self-stim: ${getFS(behaviors.self_stim)}`,
    `- Leaves work area: ${getFS(behaviors.leaves_work_area)}`,
    `- Restlessness: ${getFS(behaviors.hands_feet_restless)}`,
    `- Other 1 (${behaviors.other_major_1?.label ?? 'not specified'}): ${getFS(behaviors.other_major_1)}`,
    `- Other 2 (${behaviors.other_major_2?.label ?? 'not specified'}): ${getFS(behaviors.other_major_2)}`,
    '',
    `Not captured in this checklist: direct measures of initiating communication, independent play, and broader language skills.`,
  ];

  const languageInstruction =
    input.language === 'id'
      ? '\n\nWrite the entire report in natural, clear Bahasa Indonesia.'
      : '\n\nWrite the entire report in clear, parent-friendly English.';

  const userPrompt = (INITIAL_ASSESSMENT_USER_PROMPT_TEMPLATE + languageInstruction)
    .replace('{{SUMMARY}}', summaryLines.join('\n'))
    .replace('{{RAW_JSON}}', JSON.stringify(input.initialObservation, null, 2));

  // Allow enough tokens for the full multi-section report; 650 truncated it
  // mid-sentence. ~1800 comfortably fits the complete assessment.
  const maxOut = 1800;
  const temp = 0.35;
  lastTextGenerationError = null;

  const out =
    (await generateTextGemini(INITIAL_ASSESSMENT_SYSTEM_PROMPT, userPrompt, {
      maxOutputTokens: maxOut,
      temperature: temp,
    })) ||
    (await generateTextOpenAI(INITIAL_ASSESSMENT_SYSTEM_PROMPT, userPrompt, {
      maxTokens: maxOut,
      temperature: temp,
    })) ||
    (await generateTextClaude(INITIAL_ASSESSMENT_SYSTEM_PROMPT, userPrompt, {
      maxTokens: maxOut,
      temperature: temp,
    }));

  if (!out) {
    if (!hasAnyAiProvider()) {
      logger.warn(
        'No AI keys configured (GEMINI/OPENAI/ANTHROPIC). Cannot generate initial assessment.'
      );
      return {
        ok: false,
        error:
          'AI Initial Assessment is not configured. Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY on the server.',
      };
    }

    logger.warn(
      {
        gemini: hasGemini() ? config.ai.geminiModel : 'off',
        openai: hasOpenAI() ? config.ai.openaiModel : 'off',
        anthropic: hasAnthropic() ? config.ai.anthropicModel : 'off',
        lastError: lastTextGenerationError,
      },
      'Initial assessment generation failed'
    );

    const providerHint = [
      hasGemini() ? `Gemini (${config.ai.geminiModel})` : null,
      hasOpenAI() ? `OpenAI (${config.ai.openaiModel})` : null,
      hasAnthropic() ? `Anthropic (${config.ai.anthropicModel})` : null,
    ]
      .filter(Boolean)
      .join(', ');

    return {
      ok: false,
      error:
        lastTextGenerationError ??
        `AI generation failed for configured provider(s): ${providerHint}. Check API keys and model IDs.`,
    };
  }

  return { ok: true, reportMarkdown: out.text, tokensUsed: out.tokensUsed };
}

/**
 * Check if user has AI access based on subscription
 */
export async function hasAIAccess(userId: number): Promise<{
  hasAccess: boolean;
  reason?: string;
  subscription?: { plan_type: SubscriptionPlan; status: string };
  planConfig?: { aiAccess: boolean };
}> {
  try {
    // Get user's subscription
    let subscription = await prisma.subscription.findUnique({
      where: { user_id: userId },
    });

    if (!subscription) {
      return { hasAccess: false, reason: 'No subscription found' };
    }

    subscription = await expireTrialIfNeeded(subscription);

    // Trial has AI access for Initial Observation + Weekly ABA during the trial window
    if (subscription.status === 'trial') {
      const now = new Date();
      if (subscription.end_date && subscription.end_date < now) {
        return {
          hasAccess: false,
          reason:
            'Your free trial has ended. Upgrade to Pro or Premium to continue using AI features.',
          subscription: {
            plan_type: subscription.plan_type,
            status: subscription.status,
          },
        };
      }

      return {
        hasAccess: true,
        subscription: {
          plan_type: subscription.plan_type,
          status: subscription.status,
        },
        planConfig: { aiAccess: true },
      };
    }

    // For active subscriptions, check if plan has AI access
    if (subscription.status === 'active') {
      const planConfig = await getPlanConfig(subscription.plan_type);

      if (!planConfig.aiAccess) {
        return {
          hasAccess: false,
          reason: 'Your plan does not include AI features',
          subscription: {
            plan_type: subscription.plan_type,
            status: subscription.status,
          },
          planConfig,
        };
      }

      // Check if subscription has expired
      const now = new Date();
      if (subscription.end_date && subscription.end_date < now) {
        return {
          hasAccess: false,
          reason: 'Subscription has expired',
          subscription: {
            plan_type: subscription.plan_type,
            status: subscription.status,
          },
          planConfig,
        };
      }

      return {
        hasAccess: true,
        subscription: {
          plan_type: subscription.plan_type,
          status: subscription.status,
        },
        planConfig,
      };
    }

    return {
      hasAccess: false,
      reason: `Subscription status is ${subscription.status}`,
      subscription: {
        plan_type: subscription.plan_type,
        status: subscription.status,
      },
    };
  } catch (error: any) {
    logger.error('Error checking AI access:', error);
    return { hasAccess: false, reason: 'Error checking subscription status' };
  }
}

/**
 * Check if user has enough tokens in their wallet
 */
export async function checkTokenQuota(
  userId: number,
  tokensNeeded: number
): Promise<{
  hasQuota: boolean;
  tokensRemaining: number;
  wallet?: any;
  reason?: string;
}> {
  try {
    const { wallet } = await ensureAITokenWallet(userId);
    const tokensRemaining = wallet.monthly_token_limit - wallet.current_token_usage;

    if (tokensRemaining < tokensNeeded) {
      return {
        hasQuota: false,
        tokensRemaining,
        wallet,
        reason: `Insufficient tokens. You have ${tokensRemaining} tokens remaining, but need ${tokensNeeded}.`,
      };
    }

    return {
      hasQuota: true,
      tokensRemaining,
      wallet,
    };
  } catch (error: any) {
    logger.error('Error checking token quota:', error);
    return {
      hasQuota: false,
      tokensRemaining: 0,
      reason: 'Error checking token quota',
    };
  }
}

/**
 * Update token wallet after AI usage. When child/feature context is provided,
 * the spend is also recorded in the per-child usage ledger so token
 * utilization can be reported per child.
 */
export async function updateTokenUsage(
  userId: number,
  tokensUsed: number,
  context?: { childId?: number | null; feature?: string }
): Promise<void> {
  try {
    await prisma.aITokenWallet.update({
      where: { user_id: userId },
      data: {
        current_token_usage: {
          increment: tokensUsed,
        },
      },
    });
  } catch (error: any) {
    logger.error('Error updating token usage:', error);
    throw error;
  }

  // Ledger write is best-effort: a logging failure must not undo the AI call.
  try {
    await prisma.aITokenUsageLog.create({
      data: {
        user_id: userId,
        child_id: context?.childId ?? null,
        feature: context?.feature ?? 'unknown',
        tokens: tokensUsed,
      },
    });
  } catch (error: any) {
    logger.warn({ err: error, userId }, 'Failed to record AI token usage log');
  }
}

/**
 * Generate AI summary for a parent log
 */
export async function generateLogSummary(logData: {
  skills_practiced: Array<{ name: string; rating: number }>;
  activities: string;
  rating: number;
  behavior_notes?: string | null;
  child_name?: string;
}): Promise<{ summary: string; tokensUsed: number } | null> {
  const skillsText = logData.skills_practiced
    .map((skill) => `${skill.name} (rated ${skill.rating}/5)`)
    .join(', ');

  const userPrompt = `You are an AI assistant helping parents track their child's progress. Generate a concise, helpful summary (2-3 sentences) of this activity log.

Child: ${logData.child_name || 'Child'}
Skills Practiced: ${skillsText}
Overall Rating: ${logData.rating}/5
Activities: ${logData.activities}
${logData.behavior_notes ? `Behavior Notes: ${logData.behavior_notes}` : ''}

Provide a brief summary that highlights key achievements, progress areas, and any notable observations. Keep it encouraging and focused on the child's development.`;

  const system =
    'You are a helpful AI assistant that summarizes activity logs for children with autism. Provide concise, encouraging summaries that highlight progress and achievements.';

  let out =
    (await generateTextGemini(system, userPrompt, {
      maxOutputTokens: config.ai.openaiMaxTokens,
      temperature: 0.7,
    })) ||
    (await generateTextOpenAI(system, userPrompt, {
      maxTokens: config.ai.openaiMaxTokens,
      temperature: 0.7,
    }));

  if (!out) {
    if (!hasGemini() && !hasOpenAI()) {
      logger.warn(
        'Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured. Skipping AI summary generation.'
      );
    }
    return null;
  }

  return { summary: out.text, tokensUsed: out.tokensUsed };
}

/**
 * Generate concise, insightful AI summary and recommendations based on report data
 * Optimized for speed and relevance with diagnosis-aware insights
 * Supports bilingual output (English and Bahasa Indonesia)
 */
export async function generateReportSummary(reportData: {
  childName: string;
  diagnosis: string;
  rangeDays: number;
  totalLogs: number;
  totalSessions: number;
  avgRating: number | null;
  logsByDate: Array<{ date: string; count: number; avgRating: number }>;
  skillsFrequency: Array<{ skill: string; count: number }>;
  sessionsByWeek: Array<{ week_start: string; count: number }>;
  goalStatusCounts: Array<{ status: string; count: number }>;
  recentLogs: Array<{
    log_date: string;
    rating: number;
    activities: string;
    skills_practiced: Array<{ name: string; rating: number }>;
  }>;
  allActivityLogs: Array<{
    log_date: string;
    rating: number;
    activities: string;
    behavior_notes: string;
    therapist_comment: string;
    skills_practiced: Array<{ name: string; rating: number }>;
  }>;
  language?: 'en' | 'id';
}): Promise<{ summary: string; recommendations: string; tokensUsed: number } | null> {
  try {
    // Determine target language (default English)
    const lang = reportData.language || 'en';

    // Build concise, focused prompt from report data
    const topSkills = reportData.skillsFrequency
      .slice(0, 5)
      .map((s) => `${s.skill} (${s.count}x)`)
      .join(', ');

    // Extract key insights from all activity logs
    const activitiesSummary = reportData.allActivityLogs
      .filter((log) => log.activities && log.activities.trim())
      .slice(0, 10) // Limit to avoid token bloat
      .map((log) => {
        const date = new Date(log.log_date).toLocaleDateString(
          lang === 'id' ? 'id-ID' : 'en-US',
          { month: 'short', day: 'numeric' }
        );
        const activities = log.activities.substring(0, 100); // Truncate long activities
        return `${date}: ${activities}`;
      })
      .join(' | ');

    // Extract behavior notes and comments
    const behaviorInsights = reportData.allActivityLogs
      .filter((log) => log.behavior_notes && log.behavior_notes.trim())
      .slice(0, 8)
      .map((log) => log.behavior_notes.substring(0, 80))
      .join('; ');

    const therapistInsights = reportData.allActivityLogs
      .filter((log) => log.therapist_comment && log.therapist_comment.trim())
      .slice(0, 8)
      .map((log) => log.therapist_comment.substring(0, 80))
      .join('; ');

    const avgLogsPerDay =
      reportData.logsByDate.length > 0
        ? (reportData.totalLogs / reportData.rangeDays).toFixed(1)
        : '0';

    const languageInstruction =
      lang === 'id'
        ? 'Write the SUMMARY and RECOMMENDATIONS in natural, clear Bahasa Indonesia.'
        : 'Write the SUMMARY and RECOMMENDATIONS in clear, parent-friendly English.';

    const prompt = `Analyze this ${reportData.rangeDays}-day progress report for ${reportData.childName} (Diagnosis: ${reportData.diagnosis}).

IMPORTANT: Only analyze activity logs within this ${reportData.rangeDays}-day period. Do not consider any data outside this date range.

KEY METRICS (within date range only):
- ${reportData.totalLogs} activity logs (${avgLogsPerDay}/day avg)
- ${reportData.totalSessions} therapy sessions
- Avg rating: ${reportData.avgRating?.toFixed(1) || 'N/A'}/5
- Top skills: ${topSkills || 'None'}

ACTIVITY INSIGHTS (from ${reportData.totalLogs} logs in this period only):
${activitiesSummary || 'No activities recorded'}

BEHAVIOR NOTES (from logs in this period):
${behaviorInsights || 'No behavior notes'}

THERAPIST COMMENTS (from logs in this period):
${therapistInsights || 'No therapist comments'}

Provide:
1. SUMMARY: One concise paragraph (2-3 sentences) highlighting key progress, patterns, and notable observations specific to ${reportData.diagnosis} based ONLY on data from this ${reportData.rangeDays}-day period.

2. RECOMMENDATIONS: Format as follows:
   - First, provide 2-3 general strategic recommendations (1 sentence each) as bullet points starting with "-" or "*", based on the child's diagnosis and current progress. DO NOT include a "RECOMMENDATIONS:" header - just start with the bullet points.
   - Then, on a new line, write exactly "WEEKLY THERAPY ACTIVITIES:" (this marker is needed for parsing) followed by 4-6 concrete, actionable therapy activities for the next 1 week. List each activity as a numbered item (1., 2., 3., etc.). Each activity should be:
     * Clear and easy to understand
     * Specific enough to be actionable (include what to do, when, and how often)
     * Tailored to the child's diagnosis and skill gaps identified in the report
     * Focused on improving the required skills that showed lower performance or need more practice

Format the recommendations section clearly with bullet points for general recommendations and numbered items for weekly activities. Make it easy for parents and therapists to read and implement.

Be specific, evidence-based, and diagnosis-aware. Base all insights ONLY on the ${reportData.totalLogs} activity logs within the selected date range.

${languageInstruction}`;

    const systemInstruction =
      'You are an expert autism therapy specialist. Provide concise, insightful summaries and diagnosis-specific recommendations. Be sharp, actionable, and evidence-based. Format: "SUMMARY:" followed by 2-3 sentences, then "RECOMMENDATIONS:" with general recommendations as bullet points, followed by "WEEKLY THERAPY ACTIVITIES:" with numbered weekly activities. The output will be displayed in three separate sections: Summary, General Recommendations, and Weekly Therapy Activities.';

    logger.info(
      `Generating AI report summary (Gemini: ${hasGemini() ? config.ai.geminiModel : 'off'}, OpenAI fallback: ${hasOpenAI() ? config.ai.openaiModel : 'off'})`
    );

    const gen =
      (await generateTextGemini(systemInstruction, prompt, {
        maxOutputTokens: 800,
        temperature: 0.6,
      })) ||
      (await generateTextOpenAI(systemInstruction, prompt, {
        maxTokens: 800,
        temperature: 0.6,
      }));

    if (!gen) {
      if (!hasGemini() && !hasOpenAI()) {
        logger.warn(
          'Neither GEMINI_API_KEY nor OPENAI_API_KEY configured. Skipping AI report generation.'
        );
      }
      return null;
    }

    const content = gen.text;
    const tokensUsed = gen.tokensUsed;

    if (!content) {
      logger.warn('AI returned empty report summary');
      return null;
    }

    // Extract summary and recommendations from text response
    // Look for "SUMMARY:" and "RECOMMENDATIONS:" sections
    const summaryMatch = content.match(/SUMMARY:?\s*(.+?)(?=\n\s*RECOMMENDATIONS?:|$)/is);
    const recommendationsMatch = content.match(/RECOMMENDATIONS?:?\s*(.+?)$/is);
    
    if (summaryMatch && recommendationsMatch) {
      return {
        summary: summaryMatch[1].trim(),
        recommendations: recommendationsMatch[1].trim(),
        tokensUsed,
      };
    }
    
    // Fallback: try to find JSON in the response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.summary && parsed.recommendations) {
          return {
            summary: parsed.summary,
            recommendations: parsed.recommendations,
            tokensUsed,
          };
        }
      }
    } catch (parseError) {
      // Not JSON, continue with text extraction
    }
    
    // Try alternative patterns
    const altSummaryMatch = content.match(/(?:summary|overview)[:\s]*(.+?)(?:\n\n|recommendations|$)/is);
    const altRecommendationsMatch = content.match(/(?:recommendations?|suggestions?)[:\s]*(.+?)$/is);
    
    if (altSummaryMatch || altRecommendationsMatch) {
      return {
        summary: altSummaryMatch?.[1]?.trim() || content.split('\n\n')[0] || content,
        recommendations: altRecommendationsMatch?.[1]?.trim() || content.split('\n\n').slice(1).join('\n\n') || 'Please review the summary for recommendations.',
        tokensUsed,
      };
    }
    
    // Last resort: split by paragraphs
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    if (paragraphs.length >= 2) {
      return {
        summary: paragraphs.slice(0, Math.ceil(paragraphs.length / 2)).join('\n\n'),
        recommendations: paragraphs.slice(Math.ceil(paragraphs.length / 2)).join('\n\n'),
        tokensUsed,
      };
    }
    
    // Final fallback
    return {
      summary: content,
      recommendations: 'Please review the summary above for actionable recommendations.',
      tokensUsed,
    };
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string };
    logger.error(
      { err: error, stack: err.stack },
      'Error generating AI report summary'
    );
    return null;
  }
}

export function parseJsonObjectFromModelText(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Handle fenced code blocks like ```json ... ```
    const unfenced = trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    try {
      return JSON.parse(unfenced);
    } catch {
      // continue
    }
    const extracted = extractFirstJsonObject(trimmed);
    if (!extracted) {
      throw new Error('Model did not return valid JSON');
    }
    return JSON.parse(extracted);
  }
}

async function repairJsonToSingleObjectClaude(input: string): Promise<string | null> {
  const system =
    'You convert model output into STRICT valid JSON. Output ONLY the final JSON. No markdown, no code fences, no commentary.';
  const user = `Fix/repair the following text into ONE valid JSON object.\n\nRules:\n- Output must be a JSON object (starts with { and ends with }).\n- Remove any trailing commas.\n- If input is incomplete/truncated, reconstruct the most likely complete object.\n- Do not add extra keys beyond what is clearly intended.\n\n--- INPUT ---\n${input}\n--- END INPUT ---`;

  const out = await generateTextClaude(system, user, { maxTokens: 1800, temperature: 0 });
  return out?.text || null;
}

/**
 * Generate a single JSON object from a prompt. Provider order: Claude → Gemini → OpenAI.
 */
export async function generateStructuredJsonFromPrompt(params: {
  systemInstruction: string;
  userText: string;
  maxOutputTokens?: number;
  temperature?: number;
}): Promise<{ json: unknown; rawText: string; tokensUsed: number } | null> {
  const maxOut = params.maxOutputTokens ?? 1200;
  const temperature = params.temperature ?? 0.35;

  const claude =
    (await generateTextClaude(params.systemInstruction, params.userText, {
      maxTokens: maxOut,
      temperature,
    })) || null;

  const gemini =
    (await generateJsonGemini(
      params.systemInstruction,
      [{ text: params.userText }],
      { maxOutputTokens: maxOut, temperature }
    )) ||
    null;

  const first =
    claude ||
    gemini ||
    (await generateTextOpenAI(params.systemInstruction, params.userText, {
      maxTokens: maxOut,
      temperature,
    }));

  if (!first?.text) return null;

  try {
    const json = parseJsonObjectFromModelText(first.text);
    return { json, rawText: first.text, tokensUsed: first.tokensUsed };
  } catch (err: any) {
    // One repair attempt (common when models return markdown or slightly invalid JSON).
    const repaired = await repairJsonToSingleObjectClaude(first.text);
    if (!repaired) return null;
    try {
      const json = parseJsonObjectFromModelText(repaired);
      return { json, rawText: repaired, tokensUsed: first.tokensUsed };
    } catch {
      // One more attempt: force a full rewrite into valid JSON (not a repair).
      const rewriteSystem =
        'You output STRICT valid JSON only (single JSON object). No markdown, no prose.';
      const rewriteUser = `Rewrite the following into ONE valid JSON object.\n\nIf content is not recoverable, create the smallest valid JSON object that matches the intended schema and preserves as much meaning as possible.\n\n--- INPUT ---\n${first.text}\n--- END INPUT ---`;
      const rewritten = await generateTextClaude(rewriteSystem, rewriteUser, {
        maxTokens: Math.max(1400, maxOut),
        temperature: 0,
      });
      if (!rewritten?.text) throw err;
      const json = parseJsonObjectFromModelText(rewritten.text);
      return { json, rawText: rewritten.text, tokensUsed: first.tokensUsed };
    }
  }
}

/**
 * Vision JSON extraction. Claude preferred; Gemini fallback; OpenAI fallback if configured.
 */
export async function generateStructuredJsonFromImagePrompt(params: {
  systemInstruction: string;
  userText: string;
  image: { mimeType: string; base64: string };
  maxOutputTokens?: number;
  temperature?: number;
}): Promise<{ json: unknown; rawText: string; tokensUsed: number } | null> {
  const maxOut = params.maxOutputTokens ?? 1800;
  const temperature = params.temperature ?? 0.1;

  const mimeNormalized = (() => {
    const m = (params.image.mimeType || '').toLowerCase().trim();
    if (m === 'image/jpg') return 'image/jpeg';
    return m;
  })();

  if (
    mimeNormalized === 'image/jpeg' ||
    mimeNormalized === 'image/png' ||
    mimeNormalized === 'image/gif' ||
    mimeNormalized === 'image/webp'
  ) {
    const claude = await generateJsonClaudeVision(
      params.systemInstruction,
      params.userText,
      { mimeType: mimeNormalized, base64: params.image.base64 },
      { maxTokens: maxOut, temperature }
    );
    if (claude?.text) {
      const json = parseJsonObjectFromModelText(claude.text);
      return { json, rawText: claude.text, tokensUsed: claude.tokensUsed };
    }
  }

  const imagePart: Part = {
    inlineData: { mimeType: params.image.mimeType, data: params.image.base64 },
  };

  const gemini =
    (await generateJsonGemini(params.systemInstruction, [{ text: params.userText }, imagePart], {
      maxOutputTokens: maxOut,
      temperature,
    })) || null;

  if (gemini?.text) {
    const json = parseJsonObjectFromModelText(gemini.text);
    return { json, rawText: gemini.text, tokensUsed: gemini.tokensUsed };
  }

  const client = getOpenAIClient();
  if (!client) return null;

  try {
    const resp = await client.chat.completions.create({
      model: config.ai.openaiModel,
      messages: [
        { role: 'system', content: params.systemInstruction },
        {
          role: 'user',
          content: [
            { type: 'text', text: params.userText },
            {
              type: 'image_url',
              image_url: { url: `data:${params.image.mimeType};base64,${params.image.base64}` },
            },
          ] as any,
        },
      ],
      max_completion_tokens: maxOut,
      temperature,
    });
    const text = resp.choices[0]?.message?.content?.trim() || '';
    const tokensUsed = resp.usage?.total_tokens || 0;
    if (!text) return null;
    const json = parseJsonObjectFromModelText(text);
    return { json, rawText: text, tokensUsed };
  } catch (error: unknown) {
    logger.error({ err: error }, 'OpenAI vision JSON generation failed');
    return null;
  }
}

