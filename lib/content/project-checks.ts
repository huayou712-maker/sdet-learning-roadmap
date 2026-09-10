import type { ProjectDefinition } from "./catalog";

export type ProjectCheck = { title: string; completed: boolean };

// Project definitions are GitHub-backed. Never write a migration on read.
// Exact title matching keeps old completions, including reclassified bonuses.
export function projectChecks(
  definition: ProjectDefinition,
  saved: ProjectCheck[] = [],
): ProjectCheck[] {
  const values = new Map(saved.map((c) => [c.title, c.completed]));
  return [
    ...definition.checklist.map((title) => ({
      title,
      completed: values.get(title) ?? false,
    })),
    ...saved.filter((c) => !definition.checklist.includes(c.title)),
  ];
}

export function projectAcceptance(
  definition: ProjectDefinition,
  saved: ProjectCheck[] = [],
) {
  const rules = definition.acceptance || {
    required: definition.checklist,
    optional: [],
    choices: [],
  };
  const done = new Set(saved.filter((c) => c.completed).map((c) => c.title));
  const completed =
    rules.required.filter((title) => done.has(title)).length +
    rules.choices.filter(
      (group) =>
        group.items.filter((title) => done.has(title)).length >= group.minimum,
    ).length;
  const total = rules.required.length + rules.choices.length;
  return { completed, total, passed: total > 0 && completed === total };
}
