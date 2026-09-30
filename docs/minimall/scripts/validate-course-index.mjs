import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { marked } from 'marked';

const source = new URL('../course-index.md', import.meta.url);
const destination = new URL('../course-paths.json', import.meta.url);
const root = '【霍格沃兹】Python测试开发进阶线上班28期';
const tokens = marked.lexer(readFileSync(source, 'utf8'));
const records = [];
let directory = '';

for (const token of tokens) {
  if (token.type === 'paragraph' && token.text.startsWith('目录：')) {
    const code = token.tokens.find(item => item.type === 'codespan');
    assert.ok(code?.text.startsWith(root + '/'), '目录缺少完整课程路径');
    directory = code.text;
  }
  if (token.type !== 'table') continue;
  for (const row of token.rows) {
    const cells = row.map(cell => cell.text);
    const isVideo = cells.length === 3 && cells[0].endsWith('.mp4');
    const isEmpty = cells.length === 4 && cells[1] === '空目录（0项）';
    if (!isVideo && !isEmpty) continue;
    assert.ok(directory, '资源条目缺少目录');
    const fullPath = cells[0].startsWith(root + '/') ? cells[0] : directory + '/' + cells[0];
    const parts = fullPath.split('/');
    assert.equal(parts.length, 3, '资源路径层级异常');
    const priority = cells[isVideo ? 1 : 2];
    const exercise = cells[isVideo ? 2 : 3];
    assert.ok(['P0', 'P1', 'P2', 'P3'].includes(priority), '优先级无效');
    assert.ok(exercise.length > 5, '缺少对应练习');
    records.push({
      chapter_number: Number(parts[1].split('、')[0]),
      chapter: parts[1],
      title: parts[2],
      full_path: fullPath,
      status: isVideo ? 'video' : 'empty_directory',
      priority,
      exercise,
    });
  }
}

const videos = records.filter(record => record.status === 'video');
const emptyDirectories = records.filter(record => record.status === 'empty_directory');
const chapters = [...new Set(records.map(record => record.chapter_number))].sort((a, b) => a - b);
assert.equal(videos.length, 404, '视频数量异常');
assert.equal(emptyDirectories.length, 99, '空目录数量异常');
assert.equal(chapters.length, 72, '章节数量异常');
assert.equal(new Set(records.map(record => record.full_path)).size, records.length, '存在重复路径');
assert.equal(videos.filter(record => record.chapter_number === 37).length, 49);

// 将文档路径与浏览器目录记录独立计算的摘要核对。
const digest = items => createHash('sha256').update(JSON.stringify(items.map(item => item.full_path).sort())).digest('hex');
const videoHash = digest(videos.filter(record => record.chapter_number !== 37));
const emptyHash = digest(emptyDirectories);
if (process.argv.includes('--inspect')) {
  console.log(JSON.stringify(chapters.map(chapter => ({ chapter, hash: digest(videos.filter(record => record.chapter_number === chapter)).slice(0, 12) })), null, 2));
  console.log('空目录摘要：' + emptyHash);
}
assert.equal(videoHash, '2c703e3eed0d6a37cbdefe817abb64a74c71643c0d197a40291fb95afb10db1b', '视频路径与浏览器记录不一致');
assert.equal(emptyHash, 'fc03647815828f111219572cc186fd4f672b1e423a0f1637f00813955a57daf8', '空目录路径与浏览器记录不一致');

const result = {
  source_url: 'https://pan.quark.cn/s/e291b632d4f3',
  checked_date: '2026-09-29',
  scope: '附件 MiniMall 学习路线，含配套理论与选修章节',
  verification: '分享页面目录及文件名称核查；未播放、下载、转存或修改网盘文件',
  limitations: '优先级和练习依据标题及学习路线判断；99个目录显示0项，其中4个进入核查为空；未核验视频时长与播放质量。',
  chapter_count: chapters.length,
  video_count: videos.length,
  empty_directory_count: emptyDirectories.length,
  chapters,
  path_verification: { non_chapter37_video_sha256: videoHash, empty_directory_sha256: emptyHash },
  records,
};
const saved = JSON.parse(readFileSync(destination, 'utf8'));
assert.deepEqual(saved, result, '文档与 JSON 清单不一致');
console.log(JSON.stringify({ chapters: chapters.length, videos: videos.length, empty_directories: emptyDirectories.length, videoHash, emptyHash, output: destination.pathname }, null, 2));
