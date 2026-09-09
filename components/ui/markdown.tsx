import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
export function Markdown({ body }: { body: string }) {
  let heading = 0;
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => <h1 id={"section-" + heading++}>{children}</h1>,
          h2: ({ children }) => <h2 id={"section-" + heading++}>{children}</h2>,
          h3: ({ children }) => <h3 id={"section-" + heading++}>{children}</h3>,
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
