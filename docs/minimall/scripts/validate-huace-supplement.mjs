import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { marked } from 'marked';

const source = new URL('../huace-supplement.md', import.meta.url);
const destination = new URL('../huace-paths.json', import.meta.url);
const records = [];
let directory = '';
for (const token of marked.lexer(readFileSync(source, 'utf8'))) {
  if (token.type === 'paragraph' && token.text.startsWith('目录：')) {
    directory = token.tokens.find(item => item.type === 'codespan').text;
  }
  if (token.type !== 'table') continue;
  for (const row of token.rows) {
    const cells = row.map(cell => cell.text);
    const titleIndex = cells.length === 6 ? 2 : 1;
    if (![5, 6].includes(cells.length) || !cells[titleIndex].endsWith('.mp4')) continue;
    const folder = cells.length === 6 ? cells[1] : directory;
    assert.ok(folder.startsWith('【华测教育】'), '缺少完整目录');
    records.push({
      index: cells[0],
      full_path: folder + '/' + cells[titleIndex],
      original_title: cells[titleIndex],
      displayed_size: cells[titleIndex + 1],
      priority: cells[titleIndex + 2],
      exercise: cells[titleIndex + 3],
    });
  }
}
assert.equal(records.length, 31, '视频数量异常');
assert.equal(new Set(records.map(record => record.full_path)).size, 31, '存在重复路径');
for (const record of records) {
  assert.ok(['P0', 'P1', 'P2', 'P3'].includes(record.priority));
  assert.ok(record.exercise.length > 5);
}
const hash = createHash('sha256').update(JSON.stringify(records.map(record => record.full_path).sort())).digest('hex');
assert.equal(hash, '2a8dd0e37178eb4fe43f8e1d8b54fb366d64e234a5363cd226d4aa8271452025', '路径与浏览器记录不一致');
const result = {
  source_url: 'https://pan.quark.cn/s/61c96b0b5fc6?pwd=p5GV',
  checked_date: '2026-09-29',
  verification: '网页目录与文件名核查；没有下载或播放视频；主题覆盖依据文件名判断。',
  video_count: records.length,
  full_paths_sha256: hash,
  records,
};
assert.deepEqual(JSON.parse(readFileSync(destination, 'utf8')), result);
console.log(JSON.stringify({ video_count: records.length, full_paths_sha256: hash, validation: '通过' }));
