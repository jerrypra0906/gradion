'use client';

import {
  asEnrichedSkills,
  parseTrialStats,
  parseTrialTokens,
  trialTokenClass,
  trialTokenLabel,
  type EnrichedSkillPractice,
} from '@/lib/abaTrialDisplay';
import { ParentLog } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ActivityLogEntryBodyProps {
  log: ParentLog;
  language: 'en' | 'id';
  compact?: boolean;
}

function AccuracyBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E5E8EB]">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct >= 80 ? 'bg-[#00C1B2]' : pct >= 50 ? 'bg-[#FFB900]' : 'bg-red-400',
          )}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-[#1A2B4C]/70">{pct}%</span>
    </div>
  );
}

function TrialChipRow({
  trialData,
  language,
  maxVisible = 20,
}: {
  trialData?: string;
  language: 'en' | 'id';
  maxVisible?: number;
}) {
  const tokens = parseTrialTokens(trialData);
  if (!tokens.length) return null;

  const visible = tokens.slice(0, maxVisible);
  const hidden = tokens.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1" aria-label={language === 'id' ? 'Hasil trial' : 'Trial results'}>
      {visible.map((token, i) => (
        <span
          key={i}
          title={trialTokenLabel(token, language)}
          className={cn(
            'inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md border px-1 text-xs font-bold',
            trialTokenClass(token),
          )}
        >
          {token}
        </span>
      ))}
      {hidden > 0 && (
        <span className="inline-flex h-6 items-center px-1 text-xs text-[#1A2B4C]/45">+{hidden}</span>
      )}
    </div>
  );
}

function AbaProgramResultCard({
  skill,
  language,
}: {
  skill: EnrichedSkillPractice;
  language: 'en' | 'id';
}) {
  const stats = parseTrialStats(skill.trial_data);

  return (
    <div className="rounded-xl border border-[#E5E8EB] bg-[#FDF8F1]/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-[#1A2B4C]">{skill.name}</p>
          {skill.domain && (
            <p className="mt-0.5 text-xs text-[#1A2B4C]/50">{skill.domain}</p>
          )}
          {skill.target && (
            <p className="mt-1 text-xs text-[#1A2B4C]/65">
              <span className="font-medium text-[#1A2B4C]/80">
                {language === 'id' ? 'Target' : 'Target'}:
              </span>{' '}
              {skill.target}
            </p>
          )}
        </div>
        {stats.total > 0 && (
          <div className="shrink-0 text-right">
            <p className="text-xs font-medium text-[#1A2B4C]/55">
              {language === 'id' ? 'Akurasi mandiri' : 'Independent accuracy'}
            </p>
            <p className="text-sm font-bold text-[#00A896]">
              {stats.independent}/{stats.total}
            </p>
          </div>
        )}
      </div>

      {stats.total > 0 && (
        <div className="mt-2 space-y-2">
          <AccuracyBar pct={stats.accuracyPct} />
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#1A2B4C]/55">
            <span>
              <span className="font-semibold text-[#00A896]">+</span> {stats.independent}{' '}
              {language === 'id' ? 'mandiri' : 'independent'}
            </span>
            <span>
              <span className="font-semibold text-[#B8860B]">p</span> {stats.prompted}{' '}
              {language === 'id' ? 'dibantu' : 'prompted'}
            </span>
            <span>
              <span className="font-semibold text-red-600">−</span> {stats.incorrect}{' '}
              {language === 'id' ? 'salah' : 'incorrect'}
            </span>
            {stats.other > 0 && (
              <span>
                <span className="font-semibold text-[#1A2B4C]/60">os</span> {stats.other}
              </span>
            )}
          </div>
          <TrialChipRow trialData={skill.trial_data} language={language} />
        </div>
      )}
    </div>
  );
}

function ManualSkillsList({
  skills,
}: {
  skills: Array<{ name: string; rating: number }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill, idx) => (
        <span
          key={idx}
          className="rounded-full border border-[#00C1B2]/25 bg-[#00C1B2]/10 px-2.5 py-0.5 text-xs font-medium text-[#00A896]"
        >
          {skill.name} ({skill.rating}/5)
        </span>
      ))}
    </div>
  );
}

export function ActivityLogEntryBody({ log, language, compact = false }: ActivityLogEntryBodyProps) {
  const isAba = Boolean(log.aba_session_id);
  const rawSkills = (log.skills_practiced || []) as EnrichedSkillPractice[];
  const hasTrialData = rawSkills.some((s) => s.trial_data);
  const enrichedSkills = asEnrichedSkills(rawSkills);

  if (isAba && hasTrialData) {
    return (
      <div className={cn('space-y-2', compact ? 'mt-2' : 'mt-3')}>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1A2B4C]/45">
          {language === 'id' ? 'Program yang dilakukan' : 'Programs completed'}
        </p>
        <div className="space-y-2">
          {enrichedSkills.map((skill, idx) => (
            <AbaProgramResultCard key={idx} skill={skill} language={language} />
          ))}
        </div>
      </div>
    );
  }

  if (isAba && enrichedSkills.length > 0) {
    return (
      <div className={cn('space-y-2', compact ? 'mt-2' : 'mt-3')}>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1A2B4C]/45">
          {language === 'id' ? 'Program yang dilakukan' : 'Programs completed'}
        </p>
        <div className="space-y-2">
          {enrichedSkills.map((skill, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-[#E5E8EB] bg-[#FDF8F1]/40 px-3 py-2.5"
            >
              <p className="text-sm font-semibold text-[#1A2B4C]">{skill.name}</p>
              {skill.domain && (
                <p className="mt-0.5 text-xs text-[#1A2B4C]/50">{skill.domain}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (rawSkills.length > 0) {
    return (
      <div className={cn(compact ? 'mt-2' : 'mt-3')}>
        <p className="mb-1.5 text-sm font-medium text-[#1A2B4C]/80">
          {language === 'id' ? 'Keterampilan yang dilatih' : 'Skills practiced'}
        </p>
        <ManualSkillsList skills={enrichedSkills} />
      </div>
    );
  }

  if (log.activities) {
    return (
      <p className={cn('text-sm text-[#1A2B4C]/70', compact ? 'mt-2' : 'mt-3')}>{log.activities}</p>
    );
  }

  return null;
}
