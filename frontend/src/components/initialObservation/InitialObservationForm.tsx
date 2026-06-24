'use client';

import {
  IOField,
  IOSection,
  IOTemplateJson,
  ObsFlatFormState,
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
    background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, rgb(229 231 235) ${pct}%, rgb(229 231 235) 100%)`,
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
  const fVal = String(obs[fKey] ?? '').trim() === '' ? 1 : Number(obs[fKey]);
  const sVal = String(obs[sKey] ?? '').trim() === '' ? 1 : Number(obs[sKey]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-sm font-medium text-gray-900 mb-3">{labelForField(field, language)}</div>
      <div className="grid grid-cols-2 gap-3">
        {(['f', 's'] as const).map((side) => {
          const key = side === 'f' ? fKey : sKey;
          const val = side === 'f' ? fVal : sVal;
          return (
            <div key={side}>
              <label className="block text-xs text-gray-600 mb-1">
                {side === 'f' ? (language === 'id' ? 'Frekuensi' : 'Frequency') : 'Severity'}
              </label>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={val}
                onChange={(e) => onChange({ ...obs, [key]: e.target.value })}
                className="w-full"
                style={rangeTrackStyle(val, 1, 5, sliderColorGreenToRed(val, 1, 5))}
              />
              <div className="mt-1 text-xs text-gray-600">
                {String(obs[key] ?? '').trim() === '' ? '—' : obs[key]}
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
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <label className="block text-sm font-medium text-gray-900 mb-1">{labelForField(field, language)}</label>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={val}
        onChange={(e) => onChange({ ...obs, [field.key]: e.target.value })}
        className="w-full"
        style={rangeTrackStyle(val, 0, 100, sliderColorRedToGreen(val, 0, 100))}
      />
      <div className="mt-1 text-xs text-gray-600">
        {String(obs[field.key] ?? '').trim() === '' ? '—' : `${obs[field.key]}%`}
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
      <div key={field.key} className="rounded-lg border border-gray-200 bg-white p-4">
        <label className="block text-sm font-medium text-gray-900 mb-1">{labelForField(field, language)}</label>
        <input
          type="number"
          min={0}
          value={obs[field.key] ?? ''}
          onChange={(e) => onChange({ ...obs, [field.key]: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
    );
  }
  return (
    <div key={field.key} className="rounded-lg border border-gray-200 bg-white p-4 md:col-span-2">
      <label className="block text-sm font-medium text-gray-900 mb-1">{labelForField(field, language)}</label>
      <input
        type="text"
        value={obs[field.key] ?? ''}
        onChange={(e) => onChange({ ...obs, [field.key]: e.target.value })}
        placeholder={language === 'id' ? 'Isi perilaku…' : 'Specify behavior…'}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
    <div key={section.key}>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        {titleForSection(section, language)} — OBS {obsIndex + 1}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {section.fields.map((field) => renderField(field, language, obs, onChange))}
      </div>
    </div>
  );
}

export function InitialObservationForm({ template, language, obs, onChange, obsIndex }: Props) {
  return (
    <div className="space-y-6">
      {template.sections.map((section) => renderSection(section, language, obs, onChange, obsIndex))}
    </div>
  );
}
