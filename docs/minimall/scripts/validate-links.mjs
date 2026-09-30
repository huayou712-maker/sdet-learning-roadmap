import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import GithubSlugger from 'github-slugger';

const repository = fileURLToPath(new URL('../../../', import.meta.url));
const chapterPlan = JSON.parse(readFileSync(new URL('chapter-plan.json', import.meta.url), 'utf8'));
const shareUrls = new Set(Object.values(chapterPlan.sources).filter(source => source.type === '网盘视频').map(source => source.url));
const files = [
  'README.md',
  'docs/ROADMAP.md',
  'docs/RESOURCES.md',
  'docs/minimall/README.md',
  'docs/minimall/course-index.md',
  'docs/minimall/huace-supplement.md',
  'docs/minimall/linuxdo-supplement.md',
  'docs/minimall/resource-locations.md',
  ...chapterPlan.chapters.map(chapter => 'docs/minimall/' + chapter.file),
];
let linkCount = 0;
let fragmentCount = 0;
const headingCache = new Map();

function getHeadingIds(path) {
  if (headingCache.has(path)) return headingCache.get(path);
  const ids = new Set();
  const slugger = new GithubSlugger();
  marked.walkTokens(marked.lexer(readFileSync(path, 'utf8')), token => {
    if (token.type !== 'heading') return;
    const text = marked.Parser.parseInline(token.tokens, new marked.TextRenderer());
    ids.add(slugger.slug(text));
  });
  headingCache.set(path, ids);
  return ids;
}

for (const file of files) {
  const absolute = resolve(repository, file);
  const document = readFileSync(absolute, 'utf8');
  marked.walkTokens(marked.lexer(document), token => {
    if (!['link', 'image'].includes(token.type)) return;
    const href = token.href;
    linkCount += 1;
    if (/^https?:\/\//.test(href)) {
      assert.ok(new URL(href).hostname, '外部链接缺少域名');
      if (new URL(href).hostname === 'pan.quark.cn') assert.ok(shareUrls.has(href), '网盘入口与资源清单不一致：' + file);
      return;
    }
    assert.ok(!win32.isAbsolute(href), '文档含本机绝对路径');
    assert.ok(!href.startsWith('file:'), '文档含本机文件链接');
    const [path, fragment] = href.split('#');
    const target = decodeURIComponent(path);
    const resolved = target ? resolve(dirname(absolute), target) : absolute;
    const location = relative(repository, resolved);
    assert.ok(!location.startsWith('..') && !isAbsolute(location), '链接超出仓库范围');
    assert.ok(existsSync(resolved), '链接目标不存在：' + file + ' → ' + href);
    if (fragment && resolved.endsWith('.md')) {
      fragmentCount += 1;
      assert.ok(getHeadingIds(resolved).has(decodeURIComponent(fragment)), '章节跳转目标不存在：' + file + ' → ' + href);
    }
  });
}

console.log(JSON.stringify({ validation: '通过', documents: files.length, links: linkCount, fragments: fragmentCount }));
