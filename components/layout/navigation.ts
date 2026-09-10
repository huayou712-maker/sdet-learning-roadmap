/** Shared destination catalogue; no account or business state. */
export const navLinks = [
  ["/", "总览"],
  ["/roadmap", "学习路线"],
  ["/training", "训练台"],
  ["/notes", "学习笔记"],
  ["/assignments", "作业"],
  ["/projects", "项目"],
  ["/timeline", "时间线"],
  ["/daily", "日课"],
  ["/debug-journal", "排障"],
  ["/portfolio", "作品集"],
  ["/resources", "资源"],
  ["/settings", "设置"],
] as const;

export function workspaceCommands(owner: boolean) {
  return [
    ...navLinks.map(([href, label]) => ({
      href,
      label,
      hint: "打开页面",
      keywords: href.replaceAll("/", " "),
    })),
    ...(owner
      ? [
          {
            href: "/notes/new",
            label: "写学习笔记",
            hint: "记录新的理解",
            keywords: "create new note 新建",
          },
          {
            href: "/trash",
            label: "回收站",
            hint: "查看可恢复的记录",
            keywords: "trash restore 恢复",
          },
        ]
      : []),
  ];
}
