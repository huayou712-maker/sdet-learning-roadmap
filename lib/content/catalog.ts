import type { Entry, Kind } from "@/lib/schemas/content";
export const sections: Record<
  string,
  { kind: Kind; title: string; description: string }
> = {
  assignments: {
    kind: "assignment",
    title: "作业提交",
    description: "每次提交独立留档，保留你的迭代过程。",
  },
  daily: {
    kind: "daily",
    title: "每日学记",
    description: "把目标、实际投入和明日计划留在一起。",
  },
  "debug-journal": {
    kind: "debug",
    title: "排障手记",
    description: "从现象到根因，记录可复用的排查方法。",
  },
};
export const kindRoute: Record<Kind, string> = {
  note: "notes",
  assignment: "assignments",
  project: "projects",
  debug: "debug-journal",
  daily: "daily",
};
export const entryUrl = (e: Pick<Entry, "type" | "id">) =>
  "/" + kindRoute[e.type] + "/" + e.id;
export const templates: Record<Kind, string> = {
  note: "# 今日学习内容\n\n## 我的理解\n\n## 示例代码\n\n## 没搞懂的问题\n\n## 总结\n",
  assignment:
    "## 作业要求\n\n## 完成内容\n\n## 代码路径\n\n## 运行方式\n\n## 遇到的问题\n\n## 自我验收\n\n## 反思\n",
  debug:
    "## 现象\n\n## 上下文\n\n## 初始假设\n\n## 排查过程\n\n## 根因\n\n## 修复方案\n\n## 验证结果\n\n## 预防方式\n\n## 耗时\n\n## 关联项目\n",
  daily:
    "## 今日目标\n\n## 完成情况\n\n## 今日学习\n\n## 遇到的问题\n\n## 晚间总结\n\n## 明日计划\n",
  project:
    "## 项目背景\n\n## 目标\n\n## 技术栈\n\n## 架构设计\n\n## 功能\n\n## 测试范围\n\n## 运行方法\n\n## 成果\n\n## 问题排查\n\n## 复盘\n",
};
export type ProjectDefinition = {
  id: string;
  projectNo: number;
  title: string;
  body: string;
  checklist: string[];
  stageId: string;
  acceptance?: {
    version: number;
    required: string[];
    optional: string[];
    choices: { title: string; minimum: number; items: string[] }[];
  };
};
