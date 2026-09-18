export type LangText = { en: string; id: string };

export type IOFieldType = 'fs_1_to_5' | 'percent_0_100' | 'number_minutes' | 'text';

export type IOField = {
  key: string;
  label: LangText;
  type: IOFieldType;
  required?: boolean;
};

export type IOSection = {
  key: string;
  title: LangText;
  fields: IOField[];
};

export type IOTemplateJson = {
  version: number;
  sections: IOSection[];
};

export type ObsFlatFormState = Record<string, string>;

const BEHAVIOR_FS_KEYS = new Set([
  'tantrums',
  'self_abuse',
  'aggression',
  'self_stim',
  'other_major_1',
  'other_major_2',
  'leaves_work_area',
  'hands_feet_restless',
]);

// "Other major disruptive behavior" F/S sliders only matter once the parent has
// actually named the behavior in the paired "(Specify)" text field. Map each
// conditional F/S key to the text key that gates whether it is required.
const CONDITIONAL_FS_LABEL_KEYS: Record<string, string> = {
  other_major_1: 'other_major_1_label',
  other_major_2: 'other_major_2_label',
};

export type IOChoice = { value: string; label: LangText };

/**
 * Anchored plain-language answers, in place of numeric estimates.
 *
 * The checklist used to ask for thirteen percentages and sixteen 0–5 slider
 * drags, with the help panel telling the parent to do the arithmetic
 * themselves ("nama dipanggil 10 kali, anak menoleh 6 kali → 60%"). A guessed
 * percentage is worse input than a chosen description, and on a 390px screen
 * two sliders sharing a row gave each about 165px for six values.
 *
 * The numbers stored are unchanged, so reports, the AI prompt and the existing
 * observation payload all keep working — only the way they are collected
 * changes. Band midpoints, so a description never claims more precision than
 * the parent gave.
 */
export const PERCENT_CHOICES: IOChoice[] = [
  { value: '90', label: { en: 'Almost always', id: 'Hampir selalu' } },
  { value: '70', label: { en: 'More often than not', id: 'Lebih sering iya daripada tidak' } },
  { value: '50', label: { en: 'About half the time', id: 'Kira-kira separuh waktu' } },
  { value: '25', label: { en: 'Rarely, now and then', id: 'Jarang, kadang-kadang saja' } },
  { value: '5', label: { en: 'Almost never', id: 'Hampir tidak pernah' } },
];

export const FREQUENCY_CHOICES: IOChoice[] = [
  { value: '0', label: { en: 'Never', id: 'Tidak pernah' } },
  { value: '1', label: { en: 'A few times a month', id: 'Beberapa kali sebulan' } },
  { value: '2', label: { en: 'A few times a week', id: 'Beberapa kali seminggu' } },
  { value: '3', label: { en: 'Most days', id: 'Hampir setiap hari' } },
  { value: '4', label: { en: 'Several times a day', id: 'Beberapa kali sehari' } },
  { value: '5', label: { en: 'Almost constantly', id: 'Hampir terus-menerus' } },
];

export const SEVERITY_CHOICES: IOChoice[] = [
  { value: '1', label: { en: 'Barely disruptive', id: 'Hampir tidak mengganggu' } },
  { value: '2', label: { en: 'Mild — passes quickly', id: 'Ringan — cepat reda' } },
  { value: '3', label: { en: 'Noticeable — needs calming', id: 'Cukup terasa — perlu ditenangkan' } },
  { value: '4', label: { en: 'Hard — stops the activity', id: 'Berat — aktivitas terhenti' } },
  { value: '5', label: { en: 'Very hard — unsafe or very long', id: 'Sangat berat — berbahaya atau sangat lama' } },
];

export function labelForChoice(choice: IOChoice, language: 'en' | 'id'): string {
  return language === 'id' ? choice.label.id || choice.label.en : choice.label.en || choice.label.id;
}

export function defaultInitialObservationTemplate(): IOTemplateJson {
  return {
    version: 1,
    sections: [
      {
        key: 'behavior',
        title: { en: 'Behavior (F / S)', id: 'Perilaku (F / S)' },
        fields: [
          { key: 'tantrums', label: { en: 'Tantrums', id: 'Tantrum' }, type: 'fs_1_to_5', required: true },
          { key: 'self_abuse', label: { en: 'Self-Abuse', id: 'Melukai diri sendiri' }, type: 'fs_1_to_5', required: true },
          { key: 'aggression', label: { en: 'Aggression', id: 'Agresi' }, type: 'fs_1_to_5', required: true },
          { key: 'self_stim', label: { en: 'Self-stim', id: 'Stimulasi diri' }, type: 'fs_1_to_5', required: true },
          {
            key: 'other_major_1_label',
            label: { en: 'Other Major Disruptive Behavior (Specify) 1', id: 'Perilaku mengganggu lain (isi) 1' },
            type: 'text',
            required: false,
          },
          {
            key: 'other_major_1',
            label: { en: 'Other Major Disruptive Behavior 1 (F / S)', id: 'Perilaku mengganggu lain 1 (F / S)' },
            type: 'fs_1_to_5',
            required: true,
          },
          {
            key: 'other_major_2_label',
            label: { en: 'Other Major Disruptive Behavior (Specify) 2', id: 'Perilaku mengganggu lain (isi) 2' },
            type: 'text',
            required: false,
          },
          {
            key: 'other_major_2',
            label: { en: 'Other Major Disruptive Behavior 2 (F / S)', id: 'Perilaku mengganggu lain 2 (F / S)' },
            type: 'fs_1_to_5',
            required: true,
          },
          { key: 'leaves_work_area', label: { en: 'Leaves Work Area/chair', id: 'Meninggalkan area kerja/kursi' }, type: 'fs_1_to_5', required: true },
          { key: 'hands_feet_restless', label: { en: 'Hands and Feet Restless', id: 'Tangan dan kaki gelisah' }, type: 'fs_1_to_5', required: true },
        ],
      },
      {
        key: 'attention_eye_contact',
        title: { en: 'Attention & Eye Contact', id: 'Perhatian & Kontak Mata' },
        fields: [
          {
            key: 'attention_span_minutes',
            label: { en: 'Attention Span (Average Duration, minutes)', id: 'Rentang perhatian (rata-rata, menit)' },
            type: 'number_minutes',
            required: true,
          },
          {
            key: 'eye_contact_on_request_pct',
            label: { en: 'Eye-to-Face-Contact: looking on request (%)', id: 'Kontak mata: menatap saat diminta (%)' },
            type: 'percent_0_100',
            required: true,
          },
          {
            key: 'eye_contact_name_called_pct',
            label: { en: 'Eye-to-Face-Contact: name is called (%)', id: 'Kontak mata: saat dipanggil namanya (%)' },
            type: 'percent_0_100',
            required: true,
          },
          {
            key: 'eye_contact_talking_listening_pct',
            label: { en: 'Eye-to-Face-Contact: talking/listening (%)', id: 'Kontak mata: saat berbicara/mendengarkan (%)' },
            type: 'percent_0_100',
            required: true,
          },
          {
            key: 'looking_at_task_materials_pct',
            label: { en: 'Looking at Task Materials (%)', id: 'Melihat bahan/tugas (%)' },
            type: 'percent_0_100',
            required: true,
          },
          {
            key: 'follows_simple_directives_with_gestures_pct',
            label: { en: 'Follows Simple Directives with Gestures (%)', id: 'Mengikuti instruksi sederhana dengan isyarat (%)' },
            type: 'percent_0_100',
            required: true,
          },
        ],
      },
      {
        key: 'compliance',
        title: { en: 'Compliance (%)', id: 'Kepatuhan (%)' },
        fields: [
          { key: 'compliance_come_here_5ft_pct', label: { en: 'Come here from 5 feet away (%)', id: 'Datang dari jarak 5 kaki (%)' }, type: 'percent_0_100', required: true },
          { key: 'compliance_come_from_across_room_pct', label: { en: 'Come from across room (%)', id: 'Datang dari seberang ruangan (%)' }, type: 'percent_0_100', required: true },
          { key: 'compliance_come_from_other_parts_house_pct', label: { en: 'Come from other parts of house (%)', id: 'Datang dari bagian lain rumah (%)' }, type: 'percent_0_100', required: true },
          { key: 'compliance_come_outside_close_confined_pct', label: { en: 'Come when outside at close distance in confined area (%)', id: 'Datang saat di luar (jarak dekat, area terbatas) (%)' }, type: 'percent_0_100', required: true },
          { key: 'compliance_come_outside_longer_distance_pct', label: { en: 'Come outside at longer distance (%)', id: 'Datang saat di luar (jarak lebih jauh) (%)' }, type: 'percent_0_100', required: true },
          { key: 'compliance_sit_down_pct', label: { en: 'Sit down (%)', id: 'Duduk (%)' }, type: 'percent_0_100', required: true },
          { key: 'compliance_stand_up_pct', label: { en: 'Stand up (%)', id: 'Berdiri (%)' }, type: 'percent_0_100', required: true },
          { key: 'compliance_hands_down_pct', label: { en: 'Hands down (%)', id: 'Tangan turun (%)' }, type: 'percent_0_100', required: true },
        ],
      },
    ],
  };
}

export function ensureTemplateShape(json: unknown): IOTemplateJson {
  const raw = json as Record<string, unknown> | null;
  const version = Number(raw?.version || 1);
  const sections: IOSection[] = Array.isArray(raw?.sections) ? (raw!.sections as IOSection[]) : [];
  return {
    version,
    sections: sections.map((s) => ({
      key: String((s as IOSection)?.key || ''),
      title: {
        en: String((s as IOSection)?.title?.en || ''),
        id: String((s as IOSection)?.title?.id || ''),
      },
      fields: Array.isArray((s as IOSection)?.fields)
        ? (s as IOSection).fields.map((f) => ({
            key: String(f?.key || ''),
            label: { en: String(f?.label?.en || ''), id: String(f?.label?.id || '') },
            type: (String(f?.type || 'text') as IOFieldType) || 'text',
            required: Boolean(f?.required),
          }))
        : [],
    })),
  };
}

export function flatKeysForTemplate(template: IOTemplateJson): string[] {
  const keys: string[] = [];
  for (const section of template.sections) {
    for (const field of section.fields) {
      if (field.type === 'fs_1_to_5') {
        keys.push(`${field.key}_f`, `${field.key}_s`);
      } else {
        keys.push(field.key);
      }
    }
  }
  return keys;
}

export function createEmptyObsFromTemplate(template: IOTemplateJson): ObsFlatFormState {
  const state: ObsFlatFormState = {};
  for (const section of template.sections) {
    for (const field of section.fields) {
      // Nothing is pre-selected. A default of 0 meant an untouched question was
      // stored as the real answer "never" — and because it never registered as
      // missing, a parent could submit the whole checklist without answering
      // any of it. "Tidak pernah" is now one tap, and a genuine answer.
      if (field.type === 'fs_1_to_5') {
        state[`${field.key}_f`] = '';
        state[`${field.key}_s`] = '';
      } else {
        state[field.key] = '';
      }
    }
  }
  return state;
}

/**
 * Whether a field must be filled right now, given the current answers.
 * The "Other major" F/S sliders only become required once their paired
 * "(Specify)" text field has been filled in.
 */
export function isFieldRequiredNow(field: IOField, obs: ObsFlatFormState): boolean {
  if (!field.required) return false;
  const labelKey = CONDITIONAL_FS_LABEL_KEYS[field.key];
  if (labelKey && String(obs[labelKey] ?? '').trim() === '') return false;
  return true;
}

/** Localized labels of every mandatory field that is still unanswered. */
export function missingRequiredFieldsForTemplate(
  template: IOTemplateJson,
  obs: ObsFlatFormState,
  language: 'en' | 'id',
): string[] {
  const missing: string[] = [];
  for (const section of template.sections) {
    for (const field of section.fields) {
      if (!isFieldRequiredNow(field, obs)) continue;
      if (field.type === 'fs_1_to_5') {
        if (
          String(obs[`${field.key}_f`] ?? '').trim() === '' ||
          String(obs[`${field.key}_s`] ?? '').trim() === ''
        ) {
          missing.push(labelForField(field, language));
        }
      } else if (String(obs[field.key] ?? '').trim() === '') {
        missing.push(labelForField(field, language));
      }
    }
  }
  return missing;
}

/**
 * Field keys of every mandatory answer still missing, in template order.
 *
 * The submit handler used to join the localized labels into one red paragraph
 * naming all of them — a screen of red text on a phone, after which the parent
 * still had to find each field by name in a long scrolling form. Keys let the
 * form mark the gaps where they are and jump to the first one.
 */
export function missingRequiredFieldKeysForTemplate(
  template: IOTemplateJson,
  obs: ObsFlatFormState,
): string[] {
  const missing: string[] = [];
  for (const section of template.sections) {
    for (const field of section.fields) {
      if (!isFieldRequiredNow(field, obs)) continue;
      if (field.type === 'fs_1_to_5') {
        if (
          String(obs[`${field.key}_f`] ?? '').trim() === '' ||
          String(obs[`${field.key}_s`] ?? '').trim() === ''
        ) {
          missing.push(field.key);
        }
      } else if (String(obs[field.key] ?? '').trim() === '') {
        missing.push(field.key);
      }
    }
  }
  return missing;
}

/** DOM id of a field's wrapper, so the form can scroll to and focus a gap. */
export function observationFieldDomId(obsIndex: number, fieldKey: string): string {
  return `obs-${obsIndex}-${fieldKey}`;
}

export function isObsCompleteForTemplate(template: IOTemplateJson, obs: ObsFlatFormState): boolean {
  for (const section of template.sections) {
    for (const field of section.fields) {
      if (!field.required) continue;
      if (field.type === 'fs_1_to_5') {
        // The conditional "Other major" F/S is only required once its paired
        // "(Specify)" text field has been filled in.
        const labelKey = CONDITIONAL_FS_LABEL_KEYS[field.key];
        if (labelKey && String(obs[labelKey] ?? '').trim() === '') continue;
        if (String(obs[`${field.key}_f`] ?? '').trim() === '') return false;
        if (String(obs[`${field.key}_s`] ?? '').trim() === '') return false;
      } else if (String(obs[field.key] ?? '').trim() === '') {
        return false;
      }
    }
  }
  return true;
}

function complianceKeyFromFlat(flatKey: string): string | null {
  if (!flatKey.startsWith('compliance_') || !flatKey.endsWith('_pct')) return null;
  return flatKey.slice('compliance_'.length, -'_pct'.length);
}

export function buildObsPayloadFromFlat(obs: ObsFlatFormState) {
  const behaviors: Record<string, { f: number | null; s: number | null; label?: string | null }> = {};
  const compliance_pct: Record<string, number> = {};
  const eye_contact: Record<string, number> = {};

  let attention_span_minutes = 0;
  let looking_at_task_materials_pct = 0;
  let follows_simple_directives_with_gestures_pct = 0;

  for (const base of BEHAVIOR_FS_KEYS) {
    const f = obs[`${base}_f`];
    const s = obs[`${base}_s`];
    if (f === undefined && s === undefined) continue;
    // Unanswered reaches the AI as missing, not as a confident zero.
    const entry: { f: number | null; s: number | null; label?: string | null } = {
      f: String(f ?? '').trim() === '' ? null : Number(f),
      s: String(s ?? '').trim() === '' ? null : Number(s),
    };
    if (base === 'other_major_1' || base === 'other_major_2') {
      const labelKey = `${base}_label`;
      entry.label = obs[labelKey]?.trim() ? obs[labelKey].trim() : null;
    }
    behaviors[base] = entry;
  }

  if (obs.attention_span_minutes !== undefined && obs.attention_span_minutes !== '') {
    attention_span_minutes = Number(obs.attention_span_minutes);
  }
  if (obs.looking_at_task_materials_pct !== undefined && obs.looking_at_task_materials_pct !== '') {
    looking_at_task_materials_pct = Number(obs.looking_at_task_materials_pct);
  }
  if (obs.follows_simple_directives_with_gestures_pct !== undefined && obs.follows_simple_directives_with_gestures_pct !== '') {
    follows_simple_directives_with_gestures_pct = Number(obs.follows_simple_directives_with_gestures_pct);
  }

  const eyeMap: Record<string, string> = {
    eye_contact_on_request_pct: 'on_request_pct',
    eye_contact_name_called_pct: 'name_called_pct',
    eye_contact_talking_listening_pct: 'talking_listening_pct',
  };
  for (const [flat, nested] of Object.entries(eyeMap)) {
    if (obs[flat] !== undefined && obs[flat] !== '') {
      eye_contact[nested] = Number(obs[flat]);
    }
  }

  for (const key of Object.keys(obs)) {
    const complianceKey = complianceKeyFromFlat(key);
    if (complianceKey && obs[key] !== '') {
      compliance_pct[complianceKey] = Number(obs[key]);
    }
  }

  return {
    behaviors,
    attention_span_minutes,
    eye_contact,
    looking_at_task_materials_pct,
    follows_simple_directives_with_gestures_pct,
    compliance_pct,
  };
}

export function buildInitialObservationPayload(
  template: IOTemplateJson,
  observations: ObsFlatFormState[]
) {
  const obs1 = buildObsPayloadFromFlat(observations[0] || {});
  return {
    version: template.version || 1,
    completedAt: new Date().toISOString(),
    obs1,
    ...(observations[1] ? { obs2: buildObsPayloadFromFlat(observations[1]) } : {}),
    ...(observations[2] ? { obs3: buildObsPayloadFromFlat(observations[2]) } : {}),
    ...(observations[3] ? { obs4: buildObsPayloadFromFlat(observations[3]) } : {}),
  };
}

/**
 * Labels are authored with clinician notation — "(%)", "(F / S)" — which meant
 * nothing to the parent answering the question and now describes a control
 * that no longer exists. Strip it at display time so admin-edited templates
 * keep working without a migration.
 */
function stripClinicianNotation(label: string): string {
  return label
    .replace(/\s*\((?:%|F\s*\/\s*S)\)\s*$/i, '')
    .replace(/\s*\(F\s*\/\s*S\)/i, '')
    .trim();
}

export function labelForField(field: IOField, language: 'en' | 'id'): string {
  const raw = language === 'id' ? field.label.id || field.label.en : field.label.en || field.label.id;
  return stripClinicianNotation(raw) || raw;
}

export function titleForSection(section: IOSection, language: 'en' | 'id'): string {
  const raw = language === 'id' ? section.title.id || section.title.en : section.title.en || section.title.id;
  return stripClinicianNotation(raw) || raw;
}

/**
 * Answered vs required for one section, for the desktop section rail. A parent
 * filling a long checklist needs to see where they are without scrolling it.
 */
export function sectionProgress(
  section: IOSection,
  obs: ObsFlatFormState,
): { answered: number; total: number } {
  let answered = 0;
  let total = 0;
  for (const field of section.fields) {
    if (!isFieldRequiredNow(field, obs)) continue;
    total += 1;
    if (field.type === 'fs_1_to_5') {
      if (
        String(obs[`${field.key}_f`] ?? '').trim() !== '' &&
        String(obs[`${field.key}_s`] ?? '').trim() !== ''
      ) {
        answered += 1;
      }
    } else if (String(obs[field.key] ?? '').trim() !== '') {
      answered += 1;
    }
  }
  return { answered, total };
}

/**
 * Read a stored number back as the description the parent actually chose.
 *
 * The child page still showed the observation as raw 0–5 numbers and disabled
 * sliders — the shape of the old form, not of the answers now being collected.
 * A parent who picked "Beberapa kali seminggu" should read that back.
 */
function nearestChoice(choices: IOChoice[], value: number): IOChoice | null {
  let best: IOChoice | null = null;
  let bestGap = Infinity;
  for (const c of choices) {
    const gap = Math.abs(Number(c.value) - value);
    if (gap < bestGap) {
      bestGap = gap;
      best = c;
    }
  }
  return best;
}

export function describeFrequency(value: unknown, language: 'en' | 'id'): string | null {
  if (!Number.isFinite(Number(value))) return null;
  const c = nearestChoice(FREQUENCY_CHOICES, Number(value));
  return c ? labelForChoice(c, language) : null;
}

export function describeSeverity(value: unknown, language: 'en' | 'id'): string | null {
  if (!Number.isFinite(Number(value))) return null;
  const n = Number(value);
  if (n <= 0) return language === 'id' ? 'Tidak ada' : 'None';
  const c = nearestChoice(SEVERITY_CHOICES, n);
  return c ? labelForChoice(c, language) : null;
}

export function describePercent(value: unknown, language: 'en' | 'id'): string | null {
  if (!Number.isFinite(Number(value))) return null;
  const c = nearestChoice(PERCENT_CHOICES, Number(value));
  return c ? labelForChoice(c, language) : null;
}
