import type { BeginnerTask, Progress, Roadmap } from "./models";

export function taskProgress(task: BeginnerTask, progress: Progress) {
  const completed = task.topicIds.filter(
    (id) => progress.items[id]?.completed,
  ).length;
  const withEvidence = task.topicIds.filter(
    (id) =>
      progress.items[id]?.completed && progress.items[id]?.evidence.length,
  ).length;
  return { completed, withEvidence, total: task.topicIds.length };
}

export function nextBeginnerTask(roadmap: Roadmap, progress: Progress) {
  return roadmap.beginnerPath?.find((task) => {
    const count = taskProgress(task, progress);
    return count.completed < count.total;
  });
}

export function nextLearningTopic(roadmap: Roadmap, progress: Progress) {
  const task = nextBeginnerTask(roadmap, progress);
  const id = task?.topicIds.find((id) => !progress.items[id]?.completed);
  for (const stage of roadmap.stages) {
    for (const item of stage.groups.flatMap((g) => g.items)) {
      if (id ? item.id === id : !progress.items[item.id]?.completed)
        return { stage, item };
    }
  }
}
