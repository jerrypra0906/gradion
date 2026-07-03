/** Minimum wallet balance required before an AI operation runs (pre-check). */
export const AI_TOKEN_COST_ESTIMATES = {
  initialAssessment: {
    preCheck: 900,
    label: 'Initial Observation report',
  },
  weeklyAbaProgram: {
    preCheck: 1400,
    label: 'Weekly ABA program',
  },
  weeklyProgramTranslate: {
    preCheck: 900,
    label: 'Weekly program translation',
  },
  therapyNotesOcr: {
    preCheck: 1200,
    label: 'Therapy notes photo (OCR)',
  },
} as const;
