'use client';

import { useState } from 'react';

type ProgramItem = {
  id?: string | number;
  name?: string;
  domain?: string;
  rationale?: string;
  targets?: unknown;
  materials?: unknown;
  demo_video_url?: string;
};

type Plan = {
  setting?: string;
  language?: string;
  programs?: ProgramItem[];
  [key: string]: unknown;
};

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x)).filter((x) => x.trim() !== '') : [];

/**
 * Renders a weekly ABA program plan as the same expandable program cards the
 * parent sees on the child page (name, domain, rationale, targets, materials,
 * demo video) — read-only, for admin review. Parent-only affordances
 * (execution counts, "Start" buttons) are intentionally omitted.
 */
export function WeeklyProgramView({
  plan,
  language,
}: {
  plan: unknown;
  language: 'en' | 'id';
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const p = (plan && typeof plan === 'object' ? plan : {}) as Plan;
  const programs = Array.isArray(p.programs) ? p.programs : [];

  if (programs.length === 0) {
    return (
      <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto">
        {JSON.stringify(plan ?? {}, null, 2)}
      </pre>
    );
  }

  return (
    <div className="space-y-2">
      {p.setting && (
        <div className="text-xs text-gray-600">
          <span className="font-semibold text-gray-900">
            {language === 'id' ? 'Lingkungan' : 'Setting'}:
          </span>{' '}
          {p.setting}
        </div>
      )}
      <div className="text-sm font-medium text-gray-900">
        {language === 'id' ? 'Program' : 'Programs'} ({programs.length})
      </div>
      <ul className="space-y-2">
        {programs.map((prog, idx) => {
          const pid = String(prog.id ?? idx);
          const expanded = expandedId === pid;
          const targets = asStringArray(prog.targets);
          const materials = asStringArray(prog.materials);
          const demoUrl =
            typeof prog.demo_video_url === 'string' && prog.demo_video_url.trim()
              ? prog.demo_video_url.trim()
              : '';
          return (
            <li key={pid} className="rounded-md border border-gray-200 bg-white">
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-start justify-between gap-3"
                onClick={() => setExpandedId((cur) => (cur === pid ? null : pid))}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">
                    {prog.name || `Program ${idx + 1}`}
                  </div>
                  {prog.domain && <div className="mt-0.5 text-xs text-gray-600">{prog.domain}</div>}
                </div>
                <span className="text-gray-400 text-sm shrink-0" aria-hidden>
                  {expanded ? '▾' : '▸'}
                </span>
              </button>
              {expanded && (
                <div className="px-3 pb-3 text-sm text-gray-700 space-y-3 border-t border-gray-100">
                  {prog.rationale && <div className="text-xs text-gray-700 pt-2">{prog.rationale}</div>}
                  {targets.length > 0 && (
                    <div className="text-xs">
                      <div className="font-semibold text-gray-900">
                        {language === 'id' ? 'Target' : 'Targets'}
                      </div>
                      <div className="mt-1 text-gray-700">{targets.join(' · ')}</div>
                    </div>
                  )}
                  {materials.length > 0 && (
                    <div className="text-xs">
                      <div className="font-semibold text-gray-900">
                        {language === 'id' ? 'Alat' : 'Materials'}
                      </div>
                      <div className="mt-1 text-gray-700">{materials.join(' · ')}</div>
                    </div>
                  )}
                  {demoUrl ? (
                    <div className="text-xs space-y-1">
                      <div className="font-semibold text-gray-900">
                        {language === 'id' ? 'Video Demo' : 'Demo Video'}
                      </div>
                      <a
                        href={demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 underline break-all"
                      >
                        {demoUrl}
                      </a>
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
