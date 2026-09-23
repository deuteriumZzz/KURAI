import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Безопасность: сырой HTML не рендерится (skipHtml), ссылки проходят встроенный urlTransform
// (javascript: и прочие опасные схемы вырезаются).
const components: Components = {
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  h1: ({ children }) => <h3 className="mt-4 mb-2 font-display text-xl font-light">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-4 mb-2 font-display text-lg font-light">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-3 mb-1.5 text-[15px] font-semibold">{children}</h4>,
  ul: ({ children }) => <ul className="my-2 list-['–__'] pl-5 marker:text-ink3">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal pl-5 marker:font-mono marker:text-ink3">{children}</ol>,
  li: ({ children }) => <li className="my-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-acc underline decoration-acc-line underline-offset-2 hover:decoration-acc">
      {children}
    </a>
  ),
  code: ({ children, className }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="border border-line bg-g2 px-1 font-mono text-[13px]">{children}</code>
    ),
  pre: ({ children }) => <pre className="my-3 overflow-x-auto border border-line bg-g1 p-3 font-mono text-[13px] leading-relaxed">{children}</pre>,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-[13.5px]">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-line bg-g1 px-2.5 py-1.5 text-left font-medium text-ink2">{children}</th>,
  td: ({ children }) => <td className="border border-line px-2.5 py-1.5 tabular-nums">{children}</td>,
  blockquote: ({ children }) => <blockquote className="my-2 border-l border-acc-line pl-3 text-ink2">{children}</blockquote>,
};

export function Markdown({ text }: { text: string }) {
  return (
    <div className="text-[14.5px] leading-relaxed text-ink">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {text}
      </ReactMarkdown>
    </div>
  );
}
