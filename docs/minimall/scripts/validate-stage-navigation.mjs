import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { marked } from 'marked';

const document = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const catalog = JSON.parse(readFileSync(new URL('../course-paths.json', import.meta.url), 'utf8'));
const videos = catalog.records.filter(record => record.status === 'video');
const stages = new Map();
let stage = 0;
let practiceCount = 0;
let checkedReferences = 0;

for (const token of marked.lexer(document)) {
  if (token.type === 'heading' && token.depth === 3) {
    const match = token.text.match(/^阶段 (\d+)：/);
    if (match) {
      stage = Number(match[1]);
      assert.ok(!stages.has(stage), '阶段编号重复');
      stages.set(stage, []);
    }
  }
  if (!stage) continue;
  if (token.type === 'paragraph' && token.text.startsWith('练习：')) practiceCount += 1;
  if (token.type !== 'table' || !token.header[0].text.startsWith('课程章节')) continue;
  for (const row of token.rows) {
    assert.equal(row.length, 3, '阶段观看表需要章节、编号和内容');
    const link = row[0].tokens.find(item => item.type === 'link' && item.href.startsWith('course-index.md#'));
    if (!link) continue;
    const chapterMatch = link.text.match(/^第 (\d+) 章：/);
    assert.ok(chapterMatch, '课程章节缺少原编号');
    const chapter = Number(chapterMatch[1]);
    for (const range of row[1].text.split('、')) {
      const match = range.match(/^(\d+)(?:—(\d+))?$/);
      assert.ok(match, '观看编号格式无效：' + range);
      const first = Number(match[1]);
      const last = match[2] ? Number(match[2]) : first;
      assert.ok(first <= last, '观看编号顺序无效');
      for (let number = first; number <= last; number += 1) {
        assert.ok(videos.some(video => video.chapter_number === chapter && Number(video.title.match(/^(\d+)_/)?.[1]) === number), '对应视频不存在：' + chapter + ':' + number);
        stages.get(stage).push({ chapter, number });
        checkedReferences += 1;
      }
    }
  }
}

assert.deepEqual([...stages.keys()], Array.from({ length: 15 }, (_, index) => index + 1), '需要完整列出 15 个阶段');
assert.equal(practiceCount, 15, '每个阶段需要对应练习');
for (const [stage, references] of stages) assert.ok(references.length > 0, '阶段缺少原课程视频位置：' + stage);
const pythonP0 = videos.filter(video => video.chapter_number === 37 && video.priority === 'P0').map(video => Number(video.title.match(/^(\d+)_/)[1])).sort((a, b) => a - b);
const selectedPython = stages.get(1).filter(reference => reference.chapter === 37).map(reference => reference.number).sort((a, b) => a - b);
assert.deepEqual(selectedPython, pythonP0, '第 37 章 P0 观看安排不一致');
console.log(JSON.stringify({ validation: '通过', stages: stages.size, practices: practiceCount, video_references: checkedReferences }));
