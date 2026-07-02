export type TrialToken = '+' | 'p' | '-' | 'os';

export interface TrialStats {
  total: number;
  independent: number;
  prompted: number;
  incorrect: number;
  other: number;
  accuracyPct: number;
}

export interface EnrichedSkillPractice {
  name: string;
  rating: number;
  target?: string;
  trial_data?: string;
  domain?: string;
}

const MP_ID_PATTERN = /^mp_[a-f0-9]+$/i;

export function isMasterProgramId(value: string): boolean {
  return MP_ID_PATTERN.test(value.trim());
}

export function parseTrialStats(trialData?: string): TrialStats {
  const tokens = (trialData || '').split(/\s+/).filter(Boolean);
  let independent = 0;
  let prompted = 0;
  let incorrect = 0;
  let other = 0;

  for (const raw of tokens) {
    const t = raw.toLowerCase();
    if (t === '+') independent += 1;
    else if (t === 'p') prompted += 1;
    else if (t === '-') incorrect += 1;
    else other += 1;
  }

  const total = tokens.length;
  const accuracyPct = total > 0 ? Math.round((independent / total) * 100) : 0;

  return { total, independent, prompted, incorrect, other, accuracyPct };
}

export function parseTrialTokens(trialData?: string): TrialToken[] {
  return (trialData || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => {
      const lower = t.toLowerCase();
      if (lower === '+') return '+';
      if (lower === 'p') return 'p';
      if (lower === '-') return '-';
      return 'os';
    });
}

export function trialTokenClass(token: TrialToken): string {
  switch (token) {
    case '+':
      return 'bg-[#00C1B2]/15 text-[#00A896] border-[#00C1B2]/30';
    case 'p':
      return 'bg-[#FFB900]/15 text-[#B8860B] border-[#FFB900]/35';
    case '-':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-[#1A2B4C]/5 text-[#1A2B4C]/60 border-[#1A2B4C]/15';
  }
}

export function trialTokenLabel(token: TrialToken, language: 'en' | 'id'): string {
  if (language === 'id') {
    switch (token) {
      case '+':
        return 'Mandiri';
      case 'p':
        return 'Dibantu';
      case '-':
        return 'Salah';
      default:
        return 'Lainnya';
    }
  }
  switch (token) {
    case '+':
      return 'Independent';
    case 'p':
      return 'Prompted';
    case '-':
      return 'Incorrect';
    default:
      return 'Other';
  }
}

export function formatSkillDisplayName(name: string): string {
  if (!isMasterProgramId(name)) return name;
  return 'Home program';
}

export function asEnrichedSkills(
  skills: Array<{ name: string; rating: number; target?: string; trial_data?: string; domain?: string }>,
): EnrichedSkillPractice[] {
  return skills.map((s) => ({
    ...s,
    name: formatSkillDisplayName(s.name),
  }));
}
