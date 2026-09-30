import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const repository = fileURLToPath(new URL('../../../', import.meta.url));
const files = [
  'README.md',
  'docs/ROADMAP.md',
  'docs/RESOURCES.md',
  'docs/minimall/README.md',
  'docs/minimall/course-index.md',
  'docs/minimall/huace-supplement.md',
  'docs/minimall/linuxdo-supplement.md',
];
let linkCount = 0;

for (const file of files) {
  const absolute = resolve(repository, file);
  const document = readFileSync(absolute, 'utf8');
  marked.walkTokens(marked.lexer(document), token => {
    if (!['link', 'image'].includes(token.type)) return;
    const href = token.href;
    linkCount += 1;
    if (/^https?:\/\//.test(href)) {
      assert.ok(new URL(href).hostname, '外部链接缺少域名');
      return;
    }
    assert.ok(!win32.isAbsolute(href), '文档含本机绝对路径');
    assert.ok(!href.startsWith('file:'), '文档含本机文件链接');
    const target = decodeURIComponent(href.split('#')[0]);
    if (!target) return;
    const resolved = resolve(dirname(absolute), target);
    const location = relative(repository, resolved);
    assert.ok(!location.startsWith('..') && !isAbsolute(location), '链接超出仓库范围');
    assert.ok(existsSync(resolved), '链接目标不存在：' + file + ' → ' + href);
  });
}

console.log(JSON.stringify({ validation: '通过', documents: files.length, links: linkCount }));
