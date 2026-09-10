import { Fragment } from "react";
import { highlightParts } from "@/lib/search";
export function SearchHighlight({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  return highlightParts(text, query).map((part, i) =>
    part.match ? (
      <mark key={i}>{part.text}</mark>
    ) : (
      <Fragment key={i}>{part.text}</Fragment>
    ),
  );
}
