'use client';

import {
  IOField,
  IOSection,
  IOTemplateJson,
  ObsFlatFormState,
  isFieldRequiredNow,
  labelForField,
  titleForSection,
} from '@/lib/initialObservationTemplate';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function sliderColorRedToGreen(value: number, min: number, max: number) {
  const t = (clamp(value, min, max) - min) / (max - min);
  return `hsl(${lerp(0, 120, t)} 80% 45%)`;
}

function sliderColorGreenToRed(value: number, min: number, max: number) {
  const t = (clamp(value, min, max) - min) / (max - min);
  return `hsl(${lerp(120, 0, t)} 80% 45%)`;
}

function rangeTrackStyle(value: number, min: number, max: number, color: string) {
  const pct = ((clamp(value, min, max) - min) / (max - min)) * 100;
  return {
    background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #E5E8EB ${pct}%, #E5E8EB 100%)`,
    height: '8px',
    borderRadius: '9999px',
    appearance: 'none' as const,
  };
}

type Props = {
  template: IOTemplateJson;
  language: 'en' | 'id';
  obs: ObsFlatFormState;
  onChange: (next: ObsFlatFormState) => void;
  obsIndex: number;
};

function RequiredMark({ required, language }: { required: boolean; language: 'en' | 'id' }) {
  if (required) {
    return (
      <span className="ml-0.5 font-semibold text-red-500" title={language === 'id' ? 'Wajib diisi' : 'Mandatory'}>
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
}: {
  field: IOField;
  language: 'en' | 'id';
  obs: ObsFlatFormState;
  onChange: (next: ObsFlatFormState) => void;
}) {
  const fKey = `${field.key}_f`;
  const sKey = `${field.key}_s`;
  const fVal = String(obs[fKey] ?? '').trim() === '' ? 0 : Number(obs[fKey]);
  const sVal = String(obs[sKey] ?? '').trim() === '' ? 0 : Number(obs[sKey]);
  const requiredNow = isFieldRequiredNow(field, obs);

  return (
    <div className="rounded-xl border border-[#E5E8EB] bg-[#FDF8F1]/40 p-4">
      <div className="mb-3 text-sm font-medium text-[#1A2B4C]">
        {labelForField(field, language)}
        <RequiredMark required={requiredNow} language={language} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(['f', 's'] as const).map((side) => {
          const key = side === 'f' ? fKey : sKey;
          const val = side === 'f' ? fVal : sVal;
          return (
            <div key={side}>
              <label className="mb-1 block text-xs text-[#1A2B4C]/60">
                {side === 'f' ? (language === 'id' ? 'Frekuensi' : 'Frequency') : 'Severity'}
              </label>
              <input
                type="range"
                min={0}
                max={5}
                step={1}
                value={val}
                onChange={(e) => onChange({ ...obs, [key]: e.target.value })}
                className="w-full accent-[#00C1B2]"
                style={rangeTrackStyle(val, 0, 5, sliderColorGreenToRed(val, 0, 5))}
              />
              <div className="mt-1 text-xs font-medium text-[#1A2B4C]/70">
                {String(obs[key] ?? '').trim() === '' ? '0' : obs[key]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PercentField({
  field,
  language,
  obs,
  onChange,
}: {
  field: IOField;
  language: 'en' | 'id';
  obs: ObsFlatFormState;
  onChange: (next: ObsFlatFormState) => void;
}) {
  const val = String(obs[field.key] ?? '').trim() === '' ? 0 : Number(obs[field.key]);
  return (
    <div className="rounded-xl border border-[#E5E8EB] bg-[#FDF8F1]/40 p-4">
      <label className="mb-1 block text-sm font-medium text-[#1A2B4C]">
        {labelForField(field, language)}
        <RequiredMark required={isFieldRequiredNow(field, obs)} language={language} />
      </label>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={val}
        onChange={(e) => onChange({ ...obs, [field.key]: e.target.value })}
        className="w-full accent-[#00C1B2]"
        style={rangeTrackStyle(val, 0, 100, sliderColorRedToGreen(val, 0, 100))}
      />
      <div className="mt-1 text-xs font-medium text-[#1A2B4C]/70">
        {String(obs[field.key] ?? '').trim() === ''
          ? language === 'id'
            ? 'Belum diisi — geser untuk mengisi'
            : 'Not set — move the slider to fill'
          : `${obs[field.key]}%`}
      </div>
    </div>
  );
}

function renderField(
  field: IOField,
  language: 'en' | 'id',
  obs: ObsFlatFormState,
  onChange: (next: ObsFlatFormState) => void
) {
  if (field.type === 'fs_1_to_5') {
    return <FsField key={field.key} field={field} language={language} obs={obs} onChange={onChange} />;
  }
  if (field.type === 'percent_0_100') {
    return <PercentField key={field.key} field={field} language={language} obs={obs} onChange={onChange} />;
  }
  if (field.type === 'number_minutes') {
    return (
      <div key={field.key} className="rounded-xl border border-[#E5E8EB] bg-[#FDF8F1]/40 p-4">
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
      </div>
    );
  }
  return (
    <div key={field.key} className="rounded-xl border border-[#E5E8EB] bg-[#FDF8F1]/40 p-4 md:col-span-2">
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
    </div>
  );
}

function renderSection(
  section: IOSection,
  language: 'en' | 'id',
  obs: ObsFlatFormState,
  onChange: (next: ObsFlatFormState) => void,
  obsIndex: number
) {
  return (
    <div key={section.key} className="rounded-2xl border border-[#E5E8EB] bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-montserrat text-lg font-bold text-[#1A2B4C]">
        {titleForSection(section, language)}{' '}
        <span className="font-normal text-[#00C1B2]">— OBS {obsIndex + 1}</span>
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {section.fields.map((field) => renderField(field, language, obs, onChange))}
      </div>
    </div>
  );
}

export function InitialObservationForm({ template, language, obs, onChange, obsIndex }: Props) {
  return (
    <div className="space-y-6">
      <p className="text-xs text-[#1A2B4C]/60">
        <span className="font-semibold text-red-500">*</span>{' '}
        {language === 'id'
          ? 'wajib diisi · kolom lain bertanda (Opsional)'
          : 'mandatory · other fields are marked (Optional)'}
      </p>
      {template.sections.map((section) => renderSection(section, language, obs, onChange, obsIndex))}
    </div>
  );
}
