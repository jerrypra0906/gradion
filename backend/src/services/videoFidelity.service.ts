import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface FidelityReport {
  overall_fidelity_score: number;
  summary: string;
  prompt_fidelity: {
    score: number;
    notes: string;
    observations: Array<{ timestamp: string; detail: string }>;
  };
  reinforcer_timing: {
    score: number;
    notes: string;
    events: Array<{ timestamp: string; assessment: string }>;
  };
  improvements: string[];
}

function buildAnalysisPrompt(params: {
  childName: string;
  abcContext: string | null;
  goalSummary: string | null;
}): string {
  return `You are an expert Board Certified Behavior Analyst (BCBA) reviewing a home-based ABA session video.

Child nickname: ${params.childName}
${params.goalSummary ? `Active goal / target (context): ${params.goalSummary}` : ''}
${params.abcContext ? `Parent/therapist described session / ABC protocol:\n${params.abcContext}` : ''}

Watch the video and produce a structured fidelity audit focused on:
1) Trial prompting (visual, verbal, gestural, physical prompts as applicable) — were prompts appropriate, least-to-most as needed, and aligned with the stated target?
2) Reinforcer delivery — timing immediately after correct behavior, appropriateness, and thinning/slimming if visible in clip.

Respond with **only valid JSON** (no markdown fences) matching this exact shape:
{
  "overall_fidelity_score": <number 0-100>,
  "summary": "<2-4 sentences>",
  "prompt_fidelity": {
    "score": <number 0-100>,
    "notes": "<short paragraph>",
    "observations": [{ "timestamp": "MM:SS or approximate", "detail": "<what you saw>" }]
  },
  "reinforcer_timing": {
    "score": <number 0-100>,
    "notes": "<short paragraph>",
    "events": [{ "timestamp": "MM:SS or approximate", "assessment": "<timing / quality note>" }]
  },
  "improvements": ["<actionable item>", "..."]
}

If something cannot be judged from the footage, lower confidence in scores and say so in notes. Use timestamps roughly when possible.`;
}

function parseReportJson(text: string): FidelityReport {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : trimmed;
  const parsed = JSON.parse(jsonStr) as FidelityReport;
  if (typeof parsed.overall_fidelity_score !== 'number') {
    throw new Error('Invalid report: missing overall_fidelity_score');
  }
  return {
    overall_fidelity_score: parsed.overall_fidelity_score,
    summary: String(parsed.summary || ''),
    prompt_fidelity: {
      score: Number(parsed.prompt_fidelity?.score ?? 0),
      notes: String(parsed.prompt_fidelity?.notes || ''),
      observations: Array.isArray(parsed.prompt_fidelity?.observations)
        ? parsed.prompt_fidelity.observations
        : [],
    },
    reinforcer_timing: {
      score: Number(parsed.reinforcer_timing?.score ?? 0),
      notes: String(parsed.reinforcer_timing?.notes || ''),
      events: Array.isArray(parsed.reinforcer_timing?.events)
        ? parsed.reinforcer_timing.events
        : [],
    },
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(String) : [],
  };
}

/**
 * Uploads a local video file to Gemini Files API, runs multimodal analysis, deletes the remote file.
 */
export async function analyzeSessionVideo(params: {
  filePath: string;
  mimeType: string;
  childName: string;
  abcContext: string | null;
  goalSummary: string | null;
}): Promise<{ report: FidelityReport; tokensUsed: number; rawText: string }> {
  if (!config.ai.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const fileManager = new GoogleAIFileManager(config.ai.geminiApiKey);
  const uploadResult = await fileManager.uploadFile(params.filePath, {
    mimeType: params.mimeType,
    displayName: 'aba-session',
  });

  const fileName = uploadResult.file.name;
  let meta = uploadResult.file;
  let attempts = 0;
  while (meta.state === FileState.PROCESSING && attempts < 90) {
    await new Promise((r) => setTimeout(r, 2000));
    meta = await fileManager.getFile(fileName);
    attempts += 1;
  }

  if (meta.state !== FileState.ACTIVE) {
    await fileManager.deleteFile(fileName).catch(() => undefined);
    const errMsg = meta.error?.message || 'Video failed to process in Gemini Files API';
    throw new Error(errMsg);
  }

  const genAI = new GoogleGenerativeAI(config.ai.geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: config.ai.geminiVideoModel,
  });

  const prompt = buildAnalysisPrompt(params);

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              fileData: {
                fileUri: meta.uri,
                mimeType: params.mimeType,
              },
            },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    });

    const rawText = result.response.text().trim();
    const usage = result.response.usageMetadata;
    const tokensUsed =
      usage?.totalTokenCount ??
      Math.ceil(rawText.length / 4) + Math.ceil(prompt.length / 4);

    let report: FidelityReport;
    try {
      report = parseReportJson(rawText);
    } catch (parseErr) {
      logger.warn({ parseErr, rawText: rawText.slice(0, 500) }, 'Failed to parse JSON fidelity report; wrapping raw');
      report = {
        overall_fidelity_score: 0,
        summary: rawText.slice(0, 2000),
        prompt_fidelity: { score: 0, notes: 'Model output was not valid JSON.', observations: [] },
        reinforcer_timing: { score: 0, notes: '', events: [] },
        improvements: ['Re-run analysis or shorten the clip if the response was truncated.'],
      };
    }

    return { report, tokensUsed, rawText };
  } finally {
    await fileManager.deleteFile(fileName).catch((e) => {
      logger.warn({ e }, 'Failed to delete Gemini file after analysis');
    });
  }
}
