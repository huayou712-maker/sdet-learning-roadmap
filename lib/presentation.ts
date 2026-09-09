/** Read-only projections of existing Markdown. No stored data or model migration. */
export function documentSections(body: string) {
  const lines = body.split(/\r?\n/);
  const result: { title: string; body: string; id: string }[] = [];
  let fence = false;
  for (const line of lines) {
    if (/^\s*```|^\s*~~~/.test(line)) fence = !fence;
    const heading = !fence && line.match(/^#{1,3}\s+(.+?)\s*#*$/);
    if (heading)
      result.push({
        title: heading[1],
        body: "",
        id: "section-" + result.length,
      });
    else if (result.length) result[result.length - 1].body += line + "\n";
  }
  return result;
}
