'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, InitialObservationTemplate } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

import {
  defaultInitialObservationTemplate,
  ensureTemplateShape,
  type IOTemplateJson,
  type IOField,
  type IOSection,
  type IOFieldType,
  type LangText,
} from '@/lib/initialObservationTemplate';

function newLangText(en = '', id = ''): LangText {
  return { en, id };
}

function defaultTemplateFromCurrentUI(): IOTemplateJson {
  return defaultInitialObservationTemplate();
}

function moveItem<T>(arr: T[], from: number, to: number) {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export default function AdminInitialObservationTemplatePage() {
  const { user } = useAuthStore();
  const [rows, setRows] = useState<InitialObservationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => rows.find((r) => r.id === editingId) || null, [rows, editingId]);

  const [keyValue, setKeyValue] = useState('initial-observation-v1');
  const [versionValue, setVersionValue] = useState(1);
  const [activeValue, setActiveValue] = useState(true);
  const [template, setTemplate] = useState<IOTemplateJson>(defaultTemplateFromCurrentUI());

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get<ApiResponse<InitialObservationTemplate[]>>(
        '/admin/initial-observation-templates'
      );
      if (res.data.success) setRows(res.data.data || []);
      else setError(res.data.error || 'Failed to load templates');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') fetchAll();
  }, [user]);

  useEffect(() => {
    if (!editing) return;
    setKeyValue(editing.key);
    setVersionValue(editing.version);
    setActiveValue(editing.is_active);
    setTemplate(ensureTemplateShape(editing.template_json));
  }, [editingId, editing]);

  const importDefaults = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await apiClient.post<ApiResponse<InitialObservationTemplate>>(
        '/admin/initial-observation-templates',
        {
          key: 'initial-observation-v1',
          version: 1,
          is_active: true,
          template_json: defaultTemplateFromCurrentUI(),
        }
      );
      if (!res.data.success) {
        setError(res.data.error || 'Failed to import defaults');
        return;
      }
      await fetchAll();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to import defaults');
    } finally {
      setSaving(false);
    }
  };

  const startCreate = () => {
    setEditingId(null);
    setKeyValue('initial-observation-v1');
    setVersionValue(1);
    setActiveValue(true);
    setTemplate(defaultTemplateFromCurrentUI());
  };

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      if (editing) {
        const res = await apiClient.put<ApiResponse<InitialObservationTemplate>>(
          `/admin/initial-observation-templates/${editing.id}`,
          {
            key: keyValue,
            version: versionValue,
            is_active: activeValue,
            template_json: template,
          }
        );
        if (!res.data.success) setError(res.data.error || 'Failed to save');
      } else {
        const res = await apiClient.post<ApiResponse<InitialObservationTemplate>>(
          '/admin/initial-observation-templates',
          {
            key: keyValue,
            version: versionValue,
            is_active: activeValue,
            template_json: template,
          }
        );
        if (!res.data.success) setError(res.data.error || 'Failed to create');
      }
      await fetchAll();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (id: number) => {
    if (!window.confirm('Delete this template?')) return;
    setError('');
    setSaving(true);
    try {
      await apiClient.delete(`/admin/initial-observation-templates/${id}`);
      setEditingId(null);
      await fetchAll();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'admin') return null;

  const hasAny = rows.length > 0;

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0 space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Initial Observation CMS</h1>
            <p className="mt-1 text-gray-600 text-sm">
              Manage the checklist fields shown during Add Child (no JSON required).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!hasAny && (
              <Button onClick={importDefaults} disabled={saving}>
                {saving ? 'Importing…' : 'Import current defaults'}
              </Button>
            )}
            <Button variant="outline" onClick={startCreate} disabled={saving}>
              New template
            </Button>
            <Button variant="outline" onClick={fetchAll} disabled={loading || saving}>
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">Templates</div>
            </div>
            {loading ? (
              <div className="p-4 text-sm text-gray-600">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="p-4 text-sm text-gray-600">
                No templates yet. Click <span className="font-semibold">Import current defaults</span>.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setEditingId(r.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                      editingId === r.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-gray-900">{r.key}</div>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          r.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Version {r.version}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-gray-900">
                  {editing ? 'Edit template' : 'Create template'}
                </div>
                {editing && (
                  <Button variant="danger" size="sm" onClick={() => deleteRow(editing.id)} disabled={saving}>
                    Delete
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Key" value={keyValue} onChange={(e) => setKeyValue(e.target.value)} />
                <Input
                  label="Version"
                  type="number"
                  value={String(versionValue)}
                  onChange={(e) => setVersionValue(parseInt(e.target.value || '1', 10))}
                />
                <div className="flex items-end gap-2">
                  <label className="text-sm text-gray-700 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={activeValue}
                      onChange={(e) => setActiveValue(e.target.checked)}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-700">
                Tip: You can reorder sections/fields with ↑ ↓. Keys should be unique.
              </div>
            </div>

            <div className="space-y-4">
              {template.sections.map((section, sIdx) => (
                <div key={section.key || sIdx} className="rounded-lg border border-gray-200 bg-white">
                  <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={sIdx === 0}
                        onClick={() =>
                          setTemplate((p) => ({
                            ...p,
                            sections: moveItem(p.sections, sIdx, sIdx - 1),
                          }))
                        }
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={sIdx === template.sections.length - 1}
                        onClick={() =>
                          setTemplate((p) => ({
                            ...p,
                            sections: moveItem(p.sections, sIdx, sIdx + 1),
                          }))
                        }
                      >
                        ↓
                      </Button>
                      <div className="text-sm font-semibold text-gray-900">
                        Section
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        setTemplate((p) => ({
                          ...p,
                          sections: p.sections.filter((_, i) => i !== sIdx),
                        }))
                      }
                    >
                      Remove section
                    </Button>
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        label="Section key"
                        value={section.key}
                        onChange={(e) =>
                          setTemplate((p) => ({
                            ...p,
                            sections: p.sections.map((s, i) =>
                              i === sIdx ? { ...s, key: e.target.value } : s
                            ),
                          }))
                        }
                      />
                      <Input
                        label="Title (EN)"
                        value={section.title.en}
                        onChange={(e) =>
                          setTemplate((p) => ({
                            ...p,
                            sections: p.sections.map((s, i) =>
                              i === sIdx ? { ...s, title: { ...s.title, en: e.target.value } } : s
                            ),
                          }))
                        }
                      />
                      <Input
                        label="Title (ID)"
                        value={section.title.id}
                        onChange={(e) =>
                          setTemplate((p) => ({
                            ...p,
                            sections: p.sections.map((s, i) =>
                              i === sIdx ? { ...s, title: { ...s.title, id: e.target.value } } : s
                            ),
                          }))
                        }
                      />
                    </div>

                    <div className="rounded border border-gray-200 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="px-3 py-2 text-left">Key</th>
                            <th className="px-3 py-2 text-left">Label (EN)</th>
                            <th className="px-3 py-2 text-left">Label (ID)</th>
                            <th className="px-3 py-2 text-left">Type</th>
                            <th className="px-3 py-2 text-left">Required</th>
                            <th className="px-3 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {section.fields.map((f, fIdx) => (
                            <tr key={f.key || fIdx}>
                              <td className="px-3 py-2">
                                <input
                                  className="w-full rounded border border-gray-300 px-2 py-1"
                                  value={f.key}
                                  onChange={(e) =>
                                    setTemplate((p) => ({
                                      ...p,
                                      sections: p.sections.map((s, i) =>
                                        i !== sIdx
                                          ? s
                                          : {
                                              ...s,
                                              fields: s.fields.map((x, xi) =>
                                                xi === fIdx ? { ...x, key: e.target.value } : x
                                              ),
                                            }
                                      ),
                                    }))
                                  }
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  className="w-full rounded border border-gray-300 px-2 py-1"
                                  value={f.label.en}
                                  onChange={(e) =>
                                    setTemplate((p) => ({
                                      ...p,
                                      sections: p.sections.map((s, i) =>
                                        i !== sIdx
                                          ? s
                                          : {
                                              ...s,
                                              fields: s.fields.map((x, xi) =>
                                                xi === fIdx
                                                  ? { ...x, label: { ...x.label, en: e.target.value } }
                                                  : x
                                              ),
                                            }
                                      ),
                                    }))
                                  }
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  className="w-full rounded border border-gray-300 px-2 py-1"
                                  value={f.label.id}
                                  onChange={(e) =>
                                    setTemplate((p) => ({
                                      ...p,
                                      sections: p.sections.map((s, i) =>
                                        i !== sIdx
                                          ? s
                                          : {
                                              ...s,
                                              fields: s.fields.map((x, xi) =>
                                                xi === fIdx
                                                  ? { ...x, label: { ...x.label, id: e.target.value } }
                                                  : x
                                              ),
                                            }
                                      ),
                                    }))
                                  }
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  className="w-full rounded border border-gray-300 px-2 py-1"
                                  value={f.type}
                                  onChange={(e) =>
                                    setTemplate((p) => ({
                                      ...p,
                                      sections: p.sections.map((s, i) =>
                                        i !== sIdx
                                          ? s
                                          : {
                                              ...s,
                                              fields: s.fields.map((x, xi) =>
                                                xi === fIdx ? { ...x, type: e.target.value as IOFieldType } : x
                                              ),
                                            }
                                      ),
                                    }))
                                  }
                                >
                                  <option value="fs_1_to_5">F/S (1–5)</option>
                                  <option value="percent_0_100">Percent (0–100)</option>
                                  <option value="number_minutes">Minutes (number)</option>
                                  <option value="text">Text</option>
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={Boolean(f.required)}
                                  onChange={(e) =>
                                    setTemplate((p) => ({
                                      ...p,
                                      sections: p.sections.map((s, i) =>
                                        i !== sIdx
                                          ? s
                                          : {
                                              ...s,
                                              fields: s.fields.map((x, xi) =>
                                                xi === fIdx ? { ...x, required: e.target.checked } : x
                                              ),
                                            }
                                      ),
                                    }))
                                  }
                                />
                              </td>
                              <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={fIdx === 0}
                                  onClick={() =>
                                    setTemplate((p) => ({
                                      ...p,
                                      sections: p.sections.map((s, i) =>
                                        i !== sIdx
                                          ? s
                                          : { ...s, fields: moveItem(s.fields, fIdx, fIdx - 1) }
                                      ),
                                    }))
                                  }
                                >
                                  ↑
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={fIdx === section.fields.length - 1}
                                  onClick={() =>
                                    setTemplate((p) => ({
                                      ...p,
                                      sections: p.sections.map((s, i) =>
                                        i !== sIdx
                                          ? s
                                          : { ...s, fields: moveItem(s.fields, fIdx, fIdx + 1) }
                                      ),
                                    }))
                                  }
                                >
                                  ↓
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() =>
                                    setTemplate((p) => ({
                                      ...p,
                                      sections: p.sections.map((s, i) =>
                                        i !== sIdx
                                          ? s
                                          : { ...s, fields: s.fields.filter((_, xi) => xi !== fIdx) }
                                      ),
                                    }))
                                  }
                                >
                                  Remove
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setTemplate((p) => ({
                            ...p,
                            sections: p.sections.map((s, i) =>
                              i !== sIdx
                                ? s
                                : {
                                    ...s,
                                    fields: [
                                      ...s.fields,
                                      {
                                        key: `field_${s.fields.length + 1}`,
                                        label: newLangText('New field', 'Field baru'),
                                        type: 'text',
                                        required: false,
                                      },
                                    ],
                                  }
                            ),
                          }))
                        }
                      >
                        + Add field
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() =>
                    setTemplate((p) => ({
                      ...p,
                      sections: [
                        ...p.sections,
                        {
                          key: `section_${p.sections.length + 1}`,
                          title: newLangText('New section', 'Bagian baru'),
                          fields: [],
                        },
                      ],
                    }))
                  }
                >
                  + Add section
                </Button>

                <Button onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : 'Save template'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

