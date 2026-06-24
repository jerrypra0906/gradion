'use client';

import { useRef } from 'react';
import { AssessmentReportView } from './AssessmentReportView';

type Edit = { next: string; selStart: number; selEnd: number };

function wrapSelection(ta: HTMLTextAreaElement, before: string, after: string): Edit {
  const { selectionStart: s, selectionEnd: e, value } = ta;
  const sel = value.slice(s, e);
  const next = value.slice(0, s) + before + sel + after + value.slice(e);
  return { next, selStart: s + before.length, selEnd: e + before.length };
}

function selectedLineRange(value: string, s: number, e: number) {
  const lineStart = value.lastIndexOf('\n', s - 1) + 1;
  const nextNl = value.indexOf('\n', e);
  const lineEnd = nextNl === -1 ? value.length : nextNl;
  return { lineStart, lineEnd };
}

function prefixLines(ta: HTMLTextAreaElement, prefix: string): Edit {
  const { selectionStart: s, selectionEnd: e, value } = ta;
  const { lineStart, lineEnd } = selectedLineRange(value, s, e);
  const block = value.slice(lineStart, lineEnd);
  const newBlock = block
    .split('\n')
    .map((l) => prefix + l)
    .join('\n');
  const next = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
  return { next, selStart: lineStart, selEnd: lineStart + newBlock.length };
}

function numberLines(ta: HTMLTextAreaElement): Edit {
  const { selectionStart: s, selectionEnd: e, value } = ta;
  const { lineStart, lineEnd } = selectedLineRange(value, s, e);
  const block = value.slice(lineStart, lineEnd);
  const newBlock = block
    .split('\n')
    .map((l, i) => `${i + 1}. ${l}`)
    .join('\n');
  const next = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
  return { next, selStart: lineStart, selEnd: lineStart + newBlock.length };
}

/**
 * A non-technical, toolbar-driven editor for the assessment report. Formatting
 * buttons insert Markdown for the admin (so they never type ** or #), and a live
 * preview shows exactly what the parent will see. Content stays Markdown, which
 * keeps it lossless and compatible with the parent-facing renderer.
 */
export function MarkdownRichEditor({
  value,
  onChange,
  language,
}: {
  value: string;
  onChange: (next: string) => void;
  language: 'en' | 'id';
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const L = (id: string, en: string) => (language === 'id' ? id : en);

  const apply = (fn: (ta: HTMLTextAreaElement) => Edit) => {
    const ta = ref.current;
    if (!ta) return;
    const { next, selStart, selEnd } = fn(ta);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  };

  const Btn = ({
    onClick,
    title,
    children,
  }: {
    onClick: () => void;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="px-2 py-1 rounded text-sm text-gray-700 hover:bg-gray-200"
    >
      {children}
    </button>
  );

  return (
    <div className="rounded-lg border border-gray-300 overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1">
        <Btn title={L('Judul', 'Heading')} onClick={() => apply((ta) => prefixLines(ta, '## '))}>
          <span className="font-bold">H</span>
        </Btn>
        <Btn title={L('Tebal', 'Bold')} onClick={() => apply((ta) => wrapSelection(ta, '**', '**'))}>
          <span className="font-bold">B</span>
        </Btn>
        <Btn title={L('Miring', 'Italic')} onClick={() => apply((ta) => wrapSelection(ta, '_', '_'))}>
          <span className="italic">I</span>
        </Btn>
        <span className="mx-1 h-4 w-px bg-gray-300" aria-hidden />
        <Btn title={L('Daftar poin', 'Bullet list')} onClick={() => apply((ta) => prefixLines(ta, '- '))}>
          • {L('Poin', 'List')}
        </Btn>
        <Btn title={L('Daftar bernomor', 'Numbered list')} onClick={() => apply((ta) => numberLines(ta))}>
          1. {L('Angka', 'Numbered')}
        </Btn>
        <Btn title={L('Kutipan', 'Quote')} onClick={() => apply((ta) => prefixLines(ta, '> '))}>
          ❝ {L('Kutipan', 'Quote')}
        </Btn>
      </div>

      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        placeholder={L('Tulis laporan di sini…', 'Write the report here…')}
        className="w-full px-3 py-2 text-sm focus:outline-none"
      />

      <div className="border-t border-gray-200 bg-gray-50 px-3 py-3">
        <div className="text-xs font-semibold text-gray-500 mb-2">
          {L('Pratinjau (seperti yang dilihat orang tua)', 'Preview (as the parent sees it)')}
        </div>
        {value.trim() ? (
          <div className="rounded border border-gray-200 bg-white p-3">
            <AssessmentReportView markdown={value} />
          </div>
        ) : (
          <div className="text-xs text-gray-400">—</div>
        )}
      </div>
    </div>
  );
}
