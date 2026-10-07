import { useEffect, useRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Citation } from "./citation";
import { CodeBlock } from "./code-block";
import { LinkPreview } from "./link-preview";
import { webHref } from "@/lib/format";

// Безопасность: сырой HTML не рендерится (skipHtml), ссылки проходят встроенный urlTransform
// (javascript: и прочие опасные схемы вырезаются).
const components: Components = {
  p: ({ children }) => <p className="my-3 first:mt-0 last:mb-0">{children}</p>,
  h1: ({ children }) => <h3 className="mt-7 mb-2 text-[20px] leading-snug font-medium tracking-[-0.01em] text-ink first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-7 mb-2 text-[18px] leading-snug font-medium tracking-[-0.01em] text-ink first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-5 mb-1.5 text-[15.5px] font-semibold text-ink first:mt-0">{children}</h4>,
  ul: ({ children }) => <ul className="my-2 list-['•__'] pl-5 marker:text-ink3">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal pl-5 marker:font-mono marker:text-[12px] marker:text-ink3">{children}</ol>,
  li: ({ children }) => <li className="my-1 pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  a: ({ children, href }) => <LinkPreview href={href ?? ""}>{children}</LinkPreview>,
  code: ({ children, className }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="border border-line bg-g2 px-1 font-mono text-[13px]">{children}</code>
    ),
  pre: ({ children }) => {
    const child = Array.isArray(children) ? children[0] : children;
    const cls = (child as { props?: { className?: string } } | undefined)?.props?.className ?? "";
    return <CodeBlock lang={/language-(\w+)/.exec(cls)?.[1]}>{children}</CodeBlock>;
  },
  // 55 — тень с той стороны, куда таблицу ещё можно листать; строка заголовков липкая
  table: ({ children }) => (
    <div className="k-table-scroll my-3 max-h-[70vh] overflow-auto rounded-(--radius-sm) border border-line">
      <table className="w-full border-collapse text-[13.5px]">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="sticky top-0 z-[1] border-b border-line bg-g1 px-2.5 py-1.5 text-left font-medium text-ink2 shadow-[0_1px_0_var(--color-line)] [&:not(:last-child)]:border-r">{children}</th>,
  td: ({ children }) => <td className="border-t border-line px-2.5 py-1.5 tabular-nums [&:not(:last-child)]:border-r">{children}</td>,
  // картинки из ответа модели не грузятся автоматически (трекинг и утечки): только ссылка по запросу
  img: ({ src, alt }) => {
    const href = typeof src === "string" ? webHref(src) : undefined;
    return href ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-ink2 underline decoration-line2 underline-offset-4 hover:text-ink">
        Изображение: {alt || "без подписи"}
      </a>
    ) : null;
  },
  blockquote: ({ children }) => <blockquote className="my-2 border-l border-acc-line pl-3 text-ink2">{children}</blockquote>,
};

type Source = { url: string; title: string; quote?: string; readAt?: string };

/** Ответ модели. Сноски [n] превращаются в карточки источников, если источники переданы. */
export function Markdown({ text, sources = [] }: { text: string; sources?: Source[] }) {
  // сноски [n] — только вне кода (`arr[0]` и ``` не трогаем); неразрывный пробел держит сноску у утверждения
  const withCites = sources.length
    ? text
        .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
        .map((part, i) => (i % 2 ? part : part.replace(/[ \t]?\[(\d{1,2})\](?!\()/g, "\u00a0[$1](#cite-$1)")))
        .join("")
    : text;
  const comps: Components = {
    ...components,
    a: ({ children, href }) => {
      const m = /^#cite-(\d+)$/.exec(href ?? "");
      if (m) return <Citation n={Number(m[1])} source={sources[Number(m[1]) - 1]} />;
      return components.a ? (components.a as (p: { children?: React.ReactNode; href?: string }) => React.ReactNode)({ children, href }) : null;
    },
  };
  const root = useRef<HTMLDivElement>(null);
  // 104 — в ответе с источниками у каждого вывода отметка: сколько сносок его подтверждает
  useEffect(() => {
    const el = root.current;
    if (!el || sources.length === 0) return;
    el.querySelectorAll<HTMLElement>(":scope > p, :scope > ul > li, :scope > ol > li").forEach((block, i) => {
      block.style.setProperty("--i", String(i));
      if ((block.textContent ?? "").length < 60) return block.removeAttribute("data-cover");
      const n = block.querySelectorAll(".k-cite").length;
      block.setAttribute("data-cover", n === 0 ? "без подтверждения" : `${n} ${n === 1 ? "источник" : n < 5 ? "источника" : "источников"}`);
      block.toggleAttribute("data-uncovered", n === 0);
    });
  }, [text, sources.length]);
  return (
    <div ref={root} className="k-doc text-[length:var(--read-size,15.5px)] leading-[1.7]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={comps} skipHtml>
        {withCites}
      </ReactMarkdown>
    </div>
  );
}
