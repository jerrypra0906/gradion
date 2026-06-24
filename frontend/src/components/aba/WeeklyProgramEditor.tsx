'use client';

import { Button } from '@/components/ui/Button';

type Program = {
  id?: string | number;
  name?: string;
  domain?: string;
  rationale?: string;
  targets?: unknown;
  materials?: unknown;
  demo_video_url?: string;
  [k: string]: unknown;
};

type Plan = {
  setting?: string;
  programs?: Program[];
  [k: string]: unknown;
};

const toStringArray = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);

const newProgramId = () => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `mp_${(crypto as Crypto).randomUUID().replace(/-/g, '').slice(0, 12)}`;
    }
  } catch {
    // ignore
  }
  return `mp_${Math.random().toString(36).slice(2, 14)}`;
};

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

/** A friendly add/remove list editor for an array of short text values. */
function ListEditor({
  label,
  items,
  onChange,
  addLabel,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-700 mb-1">{label}</div>
      <div className="space-y-2">
        {items.length === 0 && <div className="text-xs text-gray-400">—</div>}
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={item}
              placeholder={placeholder}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="shrink-0 h-8 w-8 rounded-md border border-gray-300 text-gray-500 hover:bg-red-50 hover:text-red-600"
              title="Remove"
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, ''])}>
          + {addLabel}
        </Button>
      </div>
    </div>
  );
}

/**
 * Friendly, no-code editor for a weekly ABA program plan. Edits the visible
 * fields (setting + each program's name, domain, rationale, targets, materials,
 * demo video) while preserving every other field in the plan on save.
 */
export function WeeklyProgramEditor({
  plan,
  language,
  onChange,
}: {
  plan: unknown;
  language: 'en' | 'id';
  onChange: (next: Plan) => void;
}) {
  const p: Plan = plan && typeof plan === 'object' ? (plan as Plan) : {};
  const programs: Program[] = Array.isArray(p.programs) ? p.programs : [];
  const L = (id: string, en: string) => (language === 'id' ? id : en);

  const update = (next: Partial<Plan>) => onChange({ ...p, ...next });
  const updateProgram = (idx: number, patch: Partial<Program>) =>
    update({ programs: programs.map((pr, i) => (i === idx ? { ...pr, ...patch } : pr)) });
  const addProgram = () =>
    update({
      programs: [
        ...programs,
        { id: newProgramId(), name: '', domain: '', rationale: '', targets: [], materials: [], demo_video_url: '' },
      ],
    });
  const removeProgram = (idx: number) =>
    update({ programs: programs.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {L('Lingkungan (mis. Rumah, Sekolah)', 'Setting (e.g. Home, School)')}
        </label>
        <input
          value={p.setting ?? ''}
          onChange={(e) => update({ setting: e.target.value })}
          className={inputClass}
          placeholder={L('Rumah', 'Home')}
        />
      </div>

      <div className="space-y-4">
        {programs.map((pr, idx) => {
          const targets = toStringArray(pr.targets);
          const materials = toStringArray(pr.materials);
          return (
            <div key={idx} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">
                  {L('Program', 'Program')} {idx + 1}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => removeProgram(idx)}
                >
                  {L('Hapus program', 'Remove program')}
                </Button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {L('Nama program', 'Program name')}
                </label>
                <input
                  value={pr.name ?? ''}
                  onChange={(e) => updateProgram(idx, { name: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {L('Area / domain', 'Area / domain')}
                </label>
                <input
                  value={pr.domain ?? ''}
                  onChange={(e) => updateProgram(idx, { domain: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {L('Alasan / penjelasan', 'Rationale / explanation')}
                </label>
                <textarea
                  value={pr.rationale ?? ''}
                  onChange={(e) => updateProgram(idx, { rationale: e.target.value })}
                  rows={3}
                  className={inputClass}
                />
              </div>

              <ListEditor
                label={L('Target', 'Targets')}
                items={targets}
                onChange={(items) => updateProgram(idx, { targets: items })}
                addLabel={L('Tambah target', 'Add target')}
                placeholder={L('mis. Menatap saat dipanggil', 'e.g. Looks when called')}
              />

              <ListEditor
                label={L('Alat / bahan', 'Materials')}
                items={materials}
                onChange={(items) => updateProgram(idx, { materials: items })}
                addLabel={L('Tambah alat', 'Add material')}
                placeholder={L('mis. Kartu gambar', 'e.g. Picture cards')}
              />

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {L('Tautan video demo (opsional)', 'Demo video link (optional)')}
                </label>
                <input
                  value={pr.demo_video_url ?? ''}
                  onChange={(e) => updateProgram(idx, { demo_video_url: e.target.value })}
                  className={inputClass}
                  placeholder="https://…"
                />
              </div>
            </div>
          );
        })}
      </div>

      <Button type="button" size="sm" onClick={addProgram}>
        + {L('Tambah program', 'Add program')}
      </Button>
    </div>
  );
}
