import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { marked } from 'marked';
import GithubSlugger from 'github-slugger';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const plan = JSON.parse(readFileSync(new URL('chapter-plan.json', import.meta.url), 'utf8'));
const main = JSON.parse(read('course-paths.json'));
const huace = JSON.parse(read('huace-paths.json'));
const filenames = [
  '01-Python.md', '02-Git.md', '03-Linux-Bash.md', '04-SQL.md', '05-Flask-API.md',
  '06-用例设计与Pytest.md', '07-Allure.md', '08-接口自动化.md', '09-后端工程整理.md',
  '10-Vue.md', '11-Web自动化.md', '12-Docker.md', '13-Jenkins-CI.md', '14-性能与监控.md', '15-项目展示与流程.md',
];
assert.equal(plan.version, 1);
assert.deepEqual(plan.chapters.map(chapter => chapter.file), filenames, '需要十五个独立章节文件');
assert.deepEqual(plan.chapters.map(chapter => chapter.number), Array.from({ length: 15 }, (_, index) => index + 1));
assert.deepEqual(readdirSync(new URL('../', import.meta.url)).filter(file => /^\d{2}-.+\.md$/.test(file)).sort(), filenames);

const requiredUrls = {
  hogwarts: main.source_url,
  huace: huace.source_url,
  R1: 'https://pan.quark.cn/s/8a4ac0d0a811',
  R2: 'https://pan.quark.cn/s/df982e81b057',
  R3: 'https://pan.quark.cn/s/0a687de6a454',
  D1: 'https://www.bilibili.com/video/BV14s4y1i7Vf',
  D2: 'https://linux.do/t/topic/877671',
  M1: 'https://linux.do/t/topic/503969',
};
assert.deepEqual(Object.keys(plan.sources).sort(), Object.keys(requiredUrls).sort());
for (const [id, url] of Object.entries(requiredUrls)) assert.equal(plan.sources[id].url, url, '资源入口不一致：' + id);

function linksIn(tokens) {
  const links = [];
  marked.walkTokens(tokens, token => { if (token.type === 'link') links.push(token); });
  return links;
}

const indexLinks = linksIn(marked.lexer(read('README.md')));
for (const filename of filenames) assert.equal(indexLinks.filter(link => link.href === filename).length, 1, '章节目录需要直接链接：' + filename);

// 使用原始 Markdown 清单独立取得论坛视频目录及文件名。
const forum = [];
let sourceId = '';
let section = '';
let directory = '';
for (const token of marked.lexer(read('resource-locations.md'))) {
  if (token.type === 'heading' && token.depth === 2) {
    sourceId = token.text.match(/^(R[123])：/)?.[1] ?? '';
    section = '';
    directory = '';
  }
  if (!sourceId) continue;
  if (token.type === 'heading' && token.depth === 3) section = new GithubSlugger().slug(token.text);
  if (token.type === 'paragraph' && token.text.startsWith('章节目录：')) directory = token.tokens.find(item => item.type === 'codespan').text;
  if (token.type !== 'table') continue;
  for (const row of token.rows) {
    const cells = row.map(cell => cell.text);
    const title = cells.at(-1);
    const folder = [plan.sources[sourceId].root, directory, cells.length === 3 ? cells[0] : ''].filter(Boolean).join('/');
    forum.push({ source_id: sourceId, section, number: cells.at(-2), title, directory: folder, full_path: folder + '/' + title });
  }
}
assert.equal(forum.length, 133);

function expectedRecords(group) {
  if (group.source_id === 'hogwarts') return group.numbers.map(number => {
    const record = main.records.find(item => item.status === 'video' && item.chapter_number === group.chapter_number && Number(item.title.match(/^(\d+)_/)?.[1]) === Number(number));
    assert.ok(record, '霍格沃兹视频不存在');
    return { number, title: record.title, directory: record.full_path.slice(0, -(record.title.length + 1)), priority: record.priority, exercise: record.exercise };
  });
  if (group.source_id === 'huace') return group.indices.map(index => {
    const record = huace.records.find(item => item.index === index);
    assert.ok(record, '华测视频不存在');
    return { number: record.original_title.match(/^(\d+)_/)[1] + '（学习索引 ' + index + '）', title: record.original_title, directory: record.full_path.slice(0, -(record.original_title.length + 1)), priority: record.priority, exercise: record.exercise };
  });
  if (['R1', 'R2', 'R3'].includes(group.source_id)) {
    const selected = forum.filter(record => record.source_id === group.source_id && (group.section ? record.section === group.section : group.numbers.includes(record.number)));
    const records = group.numbers ? group.numbers.map(number => {
      const record = selected.find(item => item.number === number);
      assert.ok(record, '论坛视频不存在');
      return record;
    }) : selected;
    assert.ok(records.length > 0, '论坛分组缺少视频');
    return records.map(record => {
      const priority = group.optional || (group.source_id === 'R1' && Number(record.number) >= 49) || (group.source_id === 'R2' && record.number.startsWith('7-')) || (group.source_id === 'R3' && !['cookie-与-session', 'json-schema', 'jmeter-组件参数化与关联'].includes(group.section)) ? 'P1' : 'P0';
      const exercise = plan.forum_exercises[group.source_id][group.source_id === 'R3' ? group.section : record.number];
      assert.ok(exercise?.length > 10, '论坛视频缺少实际练习');
      return { number: record.number, title: record.title, directory: record.directory, priority, exercise };
    });
  }
  assert.ok(['D1', 'D2', 'M1'].includes(group.source_id), '资源类型无效');
  assert.ok(group.read_location, '网页缺少阅读位置');
  return [];
}

const references = Object.fromEntries(['hogwarts', 'huace', 'R1', 'R2', 'R3'].map(id => [id, []]));
let practices = 0;
let webResources = 0;
let groupCount = 0;
for (const chapter of plan.chapters) {
  const tokens = marked.lexer(read(chapter.file));
  const heading = tokens.find(token => token.type === 'heading');
  assert.equal(heading.depth, 1);
  assert.equal(heading.text, String(chapter.number).padStart(2, '0') + ' · ' + chapter.title);
  const chapterLinks = linksIn(tokens);
  assert.ok(chapterLinks.some(link => link.href === 'README.md'), '章节缺少目录导航');
  if (chapter.number > 1) assert.ok(chapterLinks.some(link => link.href === filenames[chapter.number - 2]), '缺少上一章入口');
  if (chapter.number < 15) assert.ok(chapterLinks.some(link => link.href === filenames[chapter.number]), '缺少下一章入口');
  const exercises = tokens.filter(token => token.type === 'paragraph' && token.text.startsWith('练习：'));
  assert.equal(exercises.length, 1, '每章需要明确项目练习');
  assert.equal(exercises[0].text, '练习：' + chapter.exercise);
  practices += 1;

  const resourceTable = tokens.find(token => token.type === 'table' && token.header[0].text === '完整资源名称');
  assert.ok(resourceTable, '章节缺少本章资源入口');
  const sourceIds = [...new Set(chapter.groups.map(group => group.source_id))];
  assert.equal(resourceTable.rows.length, sourceIds.length);
  for (const [index, id] of sourceIds.entries()) {
    const source = plan.sources[id];
    const row = resourceTable.rows[index];
    assert.equal(row[0].text, source.name);
    assert.equal(row[1].text, source.type);
    assert.ok(linksIn(row[2].tokens).some(link => link.href === source.url), '本章资源表缺少直接入口');
    assert.equal(row[3].text, source.status);
  }

  let current = null;
  let selectedGroups = 0;
  function finishGroup() {
    if (!current) return;
    const source = plan.sources[current.group.source_id];
    assert.ok(current.name && current.url && current.purpose, '视频表附近缺少完整资源名称、入口或内容');
    if (source.password) assert.ok(current.password, '视频表附近缺少提取码');
    assert.deepEqual(current.rows, expectedRecords(current.group), chapter.file + ' 的视频名称、目录、顺序、优先级或练习不一致');
    if (current.group.read_location) {
      assert.ok(current.readLocation, '网页资源缺少阅读位置');
      webResources += 1;
    } else assert.ok(current.rows.length > 0, '视频分组缺少文件');
    for (const row of current.rows) references[current.group.source_id].push(row.directory + '/' + row.title);
    groupCount += 1;
    current = null;
  }

  for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 2) {
      finishGroup();
      const match = token.text.match(/^(\d+)\. (.+)$/);
      if (!match) continue;
      assert.equal(Number(match[1]), selectedGroups + 1, '章节内分组顺序异常');
      const group = chapter.groups[selectedGroups];
      assert.ok(group, '章节存在额外分组');
      assert.equal(match[2], group.title);
      selectedGroups += 1;
      current = { group, rows: [], directory: '', name: false, url: false, purpose: false, password: false, readLocation: false };
    }
    if (!current) continue;
    const source = plan.sources[current.group.source_id];
    if (token.type === 'paragraph') {
      if (token.text === '资源名称：**' + source.name + '**') current.name = true;
      if (token.text.startsWith('资源入口：')) current.url = linksIn([token]).some(link => link.href === source.url && link.text === source.name);
      if (token.text === '学习内容：' + current.group.purpose) current.purpose = true;
      if (token.text === '提取码：`' + source.password + '`') current.password = true;
      if (token.text === '观看或阅读位置：' + current.group.read_location) current.readLocation = true;
      if (token.text.startsWith('完整网盘目录：')) {
        assert.ok(current.name && current.url, '完整目录附近缺少资源来源');
        current.directory = token.tokens.find(item => item.type === 'codespan').text;
      }
    }
    if (token.type !== 'table') continue;
    assert.ok(current.name && current.url && current.purpose && current.directory, '视频表缺少资源定位信息');
    assert.deepEqual(token.header.map(cell => cell.text), ['本组顺序', '原视频编号', '完整视频文件名', '优先级', '对应练习']);
    for (const row of token.rows) {
      assert.equal(row.length, 5);
      assert.equal(Number(row[0].text), current.rows.length + 1, '跨目录观看顺序不一致');
      const title = row[2].tokens.find(item => item.type === 'codespan')?.text;
      assert.ok(title?.endsWith('.mp4'), '视频文件名缺少完整扩展名');
      current.rows.push({ number: row[1].text, title, directory: current.directory, priority: row[3].text, exercise: row[4].text });
    }
  }
  finishGroup();
  assert.equal(selectedGroups, chapter.groups.length, '章节分组缺失');
}

const counts = { hogwarts: 274, huace: 31, R1: 38, R2: 18, R3: 77 };
for (const [id, count] of Object.entries(counts)) {
  assert.equal(references[id].length, count, '来源视频数量异常：' + id);
  assert.equal(new Set(references[id]).size, count, '视频在不同章节重复出现：' + id);
}
assert.deepEqual([...references.huace].sort(), huace.records.map(record => record.full_path).sort(), '华测补充清单存在遗漏');
for (const id of ['R1', 'R2', 'R3']) assert.deepEqual([...references[id]].sort(), forum.filter(record => record.source_id === id).map(record => record.full_path).sort(), '论坛补充清单存在遗漏：' + id);
const selectedPython = plan.chapters[0].groups.filter(group => group.chapter_number === 37).flatMap(group => group.numbers.map(Number)).sort((a, b) => a - b);
const pythonP0 = main.records.filter(record => record.chapter_number === 37 && record.status === 'video' && record.priority === 'P0').map(record => Number(record.title.match(/^(\d+)_/)[1])).sort((a, b) => a - b);
assert.deepEqual(selectedPython, pythonP0, '第 37 章 P0 观看安排不一致');
assert.equal(practices, 15);
assert.equal(webResources, 3);
console.log(JSON.stringify({ validation: '通过', chapters: 15, practices, groups: groupCount, video_references: Object.values(counts).reduce((sum, count) => sum + count, 0), sources: counts, web_resources: webResources }));
