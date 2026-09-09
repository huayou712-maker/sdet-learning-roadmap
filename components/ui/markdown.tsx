import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
export function Markdown({
  body,
  anchors = false,
}: {
  body: string;
  anchors?: boolean;
}) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children, node }) => (
            <h1
              id={anchors ? "section-" + node?.position?.start.line : undefined}
            >
              {children}
            </h1>
          ),
          h2: ({ children, node }) => (
            <h2
              id={anchors ? "section-" + node?.position?.start.line : undefined}
            >
              {children}
            </h2>
          ),
          h3: ({ children, node }) => (
            <h3
              id={anchors ? "section-" + node?.position?.start.line : undefined}
            >
              {children}
            </h3>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
