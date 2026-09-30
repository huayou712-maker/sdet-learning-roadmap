import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { marked } from 'marked';

const source = new URL('../resource-locations.md', import.meta.url);
const document = readFileSync(source, 'utf8');
const records = { R1: [], R2: [], R3: [] };
const requiredUrls = [
  'https://www.bilibili.com/video/BV14s4y1i7Vf',
  'https://linux.do/t/topic/877671',
  'https://linux.do/t/topic/503969',
];
const urls = new Set();
let group = '';
let directory = '';

for (const token of marked.lexer(document)) {
  if (token.type === 'heading' && token.depth === 2) {
    group = token.text.match(/^(R[123])：/)?.[1] ?? '';
    directory = '';
  }
  if (token.type === 'paragraph' && token.text.startsWith('章节目录：')) {
    directory = token.tokens.find(item => item.type === 'codespan').text;
  }
  if (token.type !== 'table' || !group) continue;
  for (const row of token.rows) {
    const cells = row.map(cell => cell.text);
    const title = cells.at(-1);
    assert.ok(title.endsWith('.mp4'), '网盘视频条目缺少原始文件名');
    const columnCounts = { R1: [2], R2: [3], R3: [2, 3] };
    assert.ok(columnCounts[group].includes(cells.length), '视频定位字段数量异常');
    const number = cells.at(-2);
    const prefix = group === 'R2' ? title.match(/(?:^|--)\s*(\d+-\d+)/)?.[1] : title.match(/^(\d+)/)?.[1];
    assert.equal(prefix, number, '视频编号与原始名称不一致');
    if (group === 'R3') assert.ok(directory, '黑马视频缺少章节目录');
    records[group].push([directory, ...cells].join('/'));
  }
}

marked.walkTokens(marked.lexer(document), token => {
  if (token.type === 'link') urls.add(token.href);
});
for (const url of requiredUrls) assert.ok(urls.has(url), '网页入口缺失：' + url);
for (const [group, count] of Object.entries({ R1: 38, R2: 18, R3: 77 })) {
  assert.equal(records[group].length, count, group + ' 视频数量异常');
  assert.equal(new Set(records[group]).size, count, group + ' 存在重复视频位置');
}
console.log(JSON.stringify({ validation: '通过', web_resources: requiredUrls.length, R1: records.R1.length, R2: records.R2.length, R3: records.R3.length }));
