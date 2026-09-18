'use client';

import {
  IOField,
  IOSection,
  IOTemplateJson,
  ObsFlatFormState,
  FREQUENCY_CHOICES,
  IOChoice,
  PERCENT_CHOICES,
  SEVERITY_CHOICES,
  isFieldRequiredNow,
  labelForChoice,
  labelForField,
  observationFieldDomId,
  sectionProgress,
  titleForSection,
} from '@/lib/initialObservationTemplate';

type Props = {
  template: IOTemplateJson;
  language: 'en' | 'id';
  obs: ObsFlatFormState;
  onChange: (next: ObsFlatFormState) => void;
  obsIndex: number;
  /**
   * Keys of mandatory answers still missing, marked in place once the parent
   * has tried to submit. Before that the form stays quiet — nobody wants to be
   * told off for not having filled in a form they are still filling in.
   */
  missingKeys?: Set<string>;
};

/** Wrapper for one field, carrying the anchor id and the missing-gap outline. */
function FieldShell({
  fieldKey,
  obsIndex,
  missing,
  className,
  children,
}: {
  fieldKey: string;
  obsIndex: number;
  missing: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={observationFieldDomId(obsIndex, fieldKey)}
      tabIndex={-1}
      className={[
        'rounded-xl border p-4 focus:outline-none',
        missing
          ? 'border-red-300 bg-red-50/40 ring-1 ring-red-200'
          : 'border-[#E5E8EB] bg-[#FDF8F1]/40',
        className ?? '',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

/**
 * One anchored answer set. Full-width rows rather than a slider: on a 390px
 * screen each option is a 44px tap target with its meaning written on it,
 * where a slider gave six values about 165px and a small round thumb.
 */
function ChoiceGroup({
  name,
  choices,
  value,
  onPick,
  language,
  legend,
  skip,
}: {
  name: string;
  choices: IOChoice[];
  value: string;
  onPick: (next: string) => void;
  language: 'en' | 'id';
  legend?: string;
  /** "Belum yakin" — stored as missing rather than as a confident zero. */
  skip?: { label: string };
}) {
  return (
    <fieldset className="min-w-0">
      {legend && (
        <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#1A2B4C]/55">
          {legend}
        </legend>
      )}
      <div className="space-y-1.5">
        {choices.map((choice) => {
          const selected = value === choice.value;
          return (
            <button
              key={choice.value}
              type="button"
              name={name}
              aria-pressed={selected}
              onClick={() => onPick(selected ? '' : choice.value)}
              className={[
                'flex min-h-[44px] w-full items-center rounded-lg border px-3 py-2 text-left text-sm transition',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C1B2]/50',
                selected
                  ? 'border-[#00C1B2] bg-[#00C1B2]/10 font-semibold text-[#00776C]'
                  : 'border-[#E5E8EB] bg-white text-[#1A2B4C] hover:border-[#00C1B2]/40',
              ].join(' ')}
            >
              {labelForChoice(choice, language)}
            </button>
          );
        })}
      </div>
      {skip && (
        <button
          type="button"
          onClick={() => onPick('')}
          className="mt-1 inline-flex min-h-[44px] items-center rounded px-1 text-xs font-medium text-[#1A2B4C]/55 underline underline-offset-2 hover:text-[#00736C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C1B2]/40"
        >
          {skip.label}
        </button>
      )}
    </fieldset>
  );
}

function MissingHint({ show, language }: { show: boolean; language: 'en' | 'id' }) {
  if (!show) return null;
  return (
    <p className="mt-2 text-xs font-medium text-red-600">
      {language === 'id' ? 'Belum diisi' : 'Not filled in yet'}
    </p>
  );
}

function RequiredMark({ required, language }: { required: boolean; language: 'en' | 'id' }) {
  if (required) {
    return (
      <span className="ml-0.5 font-semibold text-red-600" title={language === 'id' ? 'Wajib diisi' : 'Mandatory'}>
        *
      </span>
    );
  }
  return (
    <span className="ml-1.5 text-xs font-normal text-[#1A2B4C]/45">
      {language === 'id' ? '(Opsional)' : '(Optional)'}
    </span>
  );
}

function FsField({
  field,
  language,
  obs,
  onChange,
  obsIndex,
  missing,
}: {
  field: IOField;
  language: 'en' | 'id';
  obs: ObsFlatFormState;
  onChange: (next: ObsFlatFormState) => void;
  obsIndex: number;
  missing: boolean;
}) {
  const fKey = `${field.key}_f`;
  const sKey = `${field.key}_s`;
  const fVal = String(obs[fKey] ?? '');
  const sVal = String(obs[sKey] ?? '');
  const requiredNow = isFieldRequiredNow(field, obs);

  return (
    <FieldShell fieldKey={field.key} obsIndex={obsIndex} missing={missing}>
      <div className="mb-3 text-sm font-medium text-[#1A2B4C]">
        {labelForField(field, language)}
        <RequiredMark required={requiredNow} language={language} />
      </div>
      <div className="space-y-4">
        <ChoiceGroup
          name={fKey}
          legend={language === 'id' ? 'Seberapa sering?' : 'How often?'}
          choices={FREQUENCY_CHOICES}
          value={fVal}
          language={language}
          onPick={(next) =>
            // "Never" answers severity too — there is nothing to rate.
            onChange({ ...obs, [fKey]: next, ...(next === '0' ? { [sKey]: '0' } : {}) })
          }
        />
        {fVal !== '' && fVal !== '0' && (
          <ChoiceGroup
            name={sKey}
            legend={language === 'id' ? 'Seberapa berat?' : 'How hard is it?'}
            choices={SEVERITY_CHOICES}
            value={sVal}
            language={language}
            onPick={(next) => onChange({ ...obs, [sKey]: next })}
          />
        )}
      </div>
      <MissingHint show={missing} language={language} />
    </FieldShell>
  );
}

function PercentField({
  field,
  language,
  obs,
  onChange,
  obsIndex,
  missing,
}: {
  field: IOField;
  language: 'en' | 'id';
  obs: ObsFlatFormState;
  onChange: (next: ObsFlatFormState) => void;
  obsIndex: number;
  missing: boolean;
}) {
  const val = String(obs[field.key] ?? '');
  return (
    <FieldShell fieldKey={field.key} obsIndex={obsIndex} missing={missing}>
      <div className="mb-2.5 block text-sm font-medium text-[#1A2B4C]">
        {labelForField(field, language)}
        <RequiredMark required={isFieldRequiredNow(field, obs)} language={language} />
      </div>
      <ChoiceGroup
        name={field.key}
        choices={PERCENT_CHOICES}
        value={val}
        language={language}
        onPick={(next) => onChange({ ...obs, [field.key]: next })}
        skip={{
          label: language === 'id' ? 'Belum yakin — lewati dulu' : "Not sure — skip for now",
        }}
      />
      <MissingHint show={missing} language={language} />
    </FieldShell>
  );
}

function renderField(
  field: IOField,
  language: 'en' | 'id',
  obs: ObsFlatFormState,
  onChange: (next: ObsFlatFormState) => void,
  obsIndex: number,
  missingKeys: Set<string>
) {
  const missing = missingKeys.has(field.key);
  if (field.type === 'fs_1_to_5') {
    return (
      <FsField
        key={field.key}
        field={field}
        language={language}
        obs={obs}
        onChange={onChange}
        obsIndex={obsIndex}
        missing={missing}
      />
    );
  }
  if (field.type === 'percent_0_100') {
    return (
      <PercentField
        key={field.key}
        field={field}
        language={language}
        obs={obs}
        onChange={onChange}
        obsIndex={obsIndex}
        missing={missing}
      />
    );
  }
  if (field.type === 'number_minutes') {
    return (
      <FieldShell key={field.key} fieldKey={field.key} obsIndex={obsIndex} missing={missing}>
        <label className="mb-1 block text-sm font-medium text-[#1A2B4C]">
          {labelForField(field, language)}
          <RequiredMark required={isFieldRequiredNow(field, obs)} language={language} />
        </label>
        <input
          type="number"
          min={0}
          value={obs[field.key] ?? ''}
          onChange={(e) => onChange({ ...obs, [field.key]: e.target.value })}
          className="w-full rounded-lg border border-[#E5E8EB] bg-white px-3 py-2 text-[#1A2B4C] focus:border-[#00C1B2] focus:outline-none focus:ring-2 focus:ring-[#00C1B2]/30"
        />
        <MissingHint show={missing} language={language} />
      </FieldShell>
    );
  }
  return (
    <FieldShell
      key={field.key}
      fieldKey={field.key}
      obsIndex={obsIndex}
      missing={missing}
      className="md:col-span-2"
    >
      <label className="mb-1 block text-sm font-medium text-[#1A2B4C]">
        {labelForField(field, language)}
        <RequiredMark required={isFieldRequiredNow(field, obs)} language={language} />
      </label>
      <input
        type="text"
        value={obs[field.key] ?? ''}
        onChange={(e) => onChange({ ...obs, [field.key]: e.target.value })}
        placeholder={language === 'id' ? 'Isi perilaku…' : 'Specify behavior…'}
        className="w-full rounded-lg border border-[#E5E8EB] bg-white px-3 py-2 text-[#1A2B4C] placeholder:text-[#1A2B4C]/35 focus:border-[#00C1B2] focus:outline-none focus:ring-2 focus:ring-[#00C1B2]/30"
      />
      <MissingHint show={missing} language={language} />
    </FieldShell>
  );
}

function renderSection(
  section: IOSection,
  language: 'en' | 'id',
  obs: ObsFlatFormState,
  onChange: (next: ObsFlatFormState) => void,
  obsIndex: number,
  missingKeys: Set<string>
) {
  // A per-section count, so the parent can see where the gaps are without
  // scrolling the whole form looking for red.
  const missingHere = section.fields.filter((f) => missingKeys.has(f.key)).length;
  return (
    <div key={section.key} className="rounded-2xl border border-[#E5E8EB] bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex flex-wrap items-center gap-2 font-montserrat text-lg font-bold text-[#1A2B4C]">
        <span>
          {titleForSection(section, language)}{' '}
          <span className="font-normal text-[#00736C]">— OBS {obsIndex + 1}</span>
        </span>
        {missingHere > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
            {missingHere} {language === 'id' ? 'lagi' : 'left'}
          </span>
        )}
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {section.fields.map((field) =>
          renderField(field, language, obs, onChange, obsIndex, missingKeys),
        )}
      </div>
    </div>
  );
}

export function InitialObservationForm({
  template,
  language,
  obs,
  onChange,
  obsIndex,
  missingKeys,
}: Props) {
  const marks = missingKeys ?? new Set<string>();
  return (
    <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start lg:gap-8">
      {/*
        Desktop has room for a section rail, so completion is visible without
        scrolling the checklist to find out.
      */}
      <nav className="mb-6 hidden lg:sticky lg:top-6 lg:mb-0 lg:block" aria-label="Bagian">
        <ul className="space-y-1">
          {template.sections.map((section) => {
            const { answered, total } = sectionProgress(section, obs);
            const done = total > 0 && answered === total;
            return (
              <li key={section.key}>
                <a
                  href={`#${observationFieldDomId(obsIndex, section.fields[0]?.key ?? section.key)}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-[#1A2B4C] hover:bg-[#FDF8F1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C1B2]/40"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    {done && (
                      <span className="text-[#00736C]" aria-hidden>
                        ✓
                      </span>
                    )}
                    <span className="truncate">{titleForSection(section, language)}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-[#1A2B4C]/50">
                    {answered}/{total}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 border-t border-[#E5E8EB] px-3 pt-4 text-xs leading-relaxed text-[#1A2B4C]/55">
          {language === 'id'
            ? 'Bisa berhenti kapan saja. Jawaban tersimpan sendiri.'
            : 'You can stop any time. Answers save themselves.'}
        </p>
      </nav>

      <div className="space-y-6">
        <p className="text-xs text-[#1A2B4C]/60">
          <span className="font-semibold text-red-600">*</span>{' '}
          {language === 'id'
            ? 'wajib diisi · kolom lain bertanda (Opsional)'
            : 'mandatory · other fields are marked (Optional)'}
        </p>
        {template.sections.map((section) =>
          renderSection(section, language, obs, onChange, obsIndex, marks),
        )}
      </div>
    </div>
  );
}
