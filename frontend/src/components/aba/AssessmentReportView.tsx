'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Hide any "Prepared by ..." / "Disiapkan oleh ..." trailing line from the report,
// matching how the parent-facing view sanitizes the markdown.
function sanitizeAssessmentMd(md: string) {
  const lines = md.split('\n');
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    if (/^prepared by\b/i.test(trimmed)) return false;
    if (/^disiapkan oleh\b/i.test(trimmed)) return false;
    return true;
  });
  return filtered.join('\n').trim();
}

/**
 * Renders an AI assessment report exactly like the parent-facing child page,
 * so admins review the same presentation parents will see.
 */
export function AssessmentReportView({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => <h2 className="text-xl font-semibold text-gray-900" {...props} />,
          h2: (props) => <h3 className="text-lg font-semibold text-gray-900" {...props} />,
          h3: (props) => <h4 className="text-base font-semibold text-gray-900" {...props} />,
          p: (props) => <p className="text-sm text-gray-700 leading-6" {...props} />,
          blockquote: (props) => (
            <blockquote
              className="border-l-4 border-blue-200 bg-blue-50 px-4 py-3 text-sm text-gray-700 rounded"
              {...props}
            />
          ),
          hr: () => <div className="my-4 h-px w-full bg-gray-200" />,
          strong: (props) => <strong className="font-semibold text-gray-900" {...props} />,
          table: (props) => (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" {...props} />
            </div>
          ),
          th: (props) => <th className="text-left text-xs text-gray-600 p-2" {...props} />,
          td: (props) => <td className="text-sm text-gray-700 p-2 align-top" {...props} />,
          ul: (props) => <ul className="list-disc pl-5 text-sm text-gray-700" {...props} />,
          ol: (props) => <ol className="list-decimal pl-5 text-sm text-gray-700" {...props} />,
          li: (props) => <li className="my-1" {...props} />,
        }}
      >
        {sanitizeAssessmentMd(markdown)}
      </ReactMarkdown>
    </div>
  );
}
