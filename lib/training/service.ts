import "server-only";
import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors";
import type { Repository } from "@/lib/github/types";
import { assertNoCredentials } from "@/lib/security/credentials";
import { findEntry } from "@/lib/content/service";
import { nextReview } from "./rules";
import {
  emptyTraining,
  MAX_STATE_BYTES,
  mutationSchema,
  TEST_PATH,
  TRAINING_PATH,
  stateSchema,
  type TrainingSnapshot,
} from "./schema";

export async function readTraining(
  repo: Repository,
): Promise<TrainingSnapshot> {
  const file = await repo.getTextFile(TRAINING_PATH);
  if (!file) return { state: emptyTraining(), sha: null };
  if (Buffer.byteLength(file.content, "utf8") > MAX_STATE_BYTES)
    throw new AppError(
      503,
      "训练档案超过容量边界，请先规划扩容；现有记录未改动。",
    );
  try {
    return {
      state: stateSchema.parse(JSON.parse(file.content)),
      sha: file.sha,
    };
  } catch {
    throw new AppError(
      503,
      "训练档案格式损坏，请检查 GitHub 中的文件；不会自动重置。",
    );
  }
}

export async function saveTraining(
  repo: Repository,
  payload: unknown,
  now = new Date(),
) {
  const input = mutationSchema.parse(payload);
  assertNoCredentials(input);
  const current = await readTraining(repo);
  if (input.sha !== current.sha)
    throw new AppError(
      409,
      "训练档案已更新。保留当前输入，获取最新版本后再提交。",
    );
  const state = current.state;
  if (input.action === "attempt") {
    if (state.attempts.length >= 100)
      throw new AppError(
        409,
        "已达 100 次练习记录边界，请先规划扩容；历史不会被删除。",
      );
    if (state.attempts.some((a) => a.id === input.attempt.id))
      throw new AppError(409, "这份练习已提交，请获取最新版本；不要重复记分。");
    const file = await repo.getTextFileAtRef(
      TEST_PATH,
      input.attempt.commitSha,
    );
    if (!file || !file.content.trim())
      throw new AppError(
        400,
        "该 commit 中没有独立测试文件 tests/test_registration_practice.py。请先提交自己的测试。",
      );
    state.attempts.push({
      ...input.attempt,
      recordedAt: now.toISOString(),
      provenance: "self_reported",
    });
  } else if (input.action === "createReview") {
    if (state.reviews.length >= 100)
      throw new AppError(409, "已达 100 张复习卡边界，请先规划扩容。");
    const source = await findEntry(repo, input.review.sourceId);
    if (source.deletedAt || !["note", "debug"].includes(source.type))
      throw new AppError(400, "复习来源必须是未删除的笔记或排障记录。");
    if (state.reviews.some((r) => r.sourceId === source.id))
      throw new AppError(
        409,
        "该来源已有复习卡，请使用或恢复原卡，不重复创建。",
      );
    state.reviews.push({
      ...input.review,
      id: randomUUID(),
      createdAt: now.toISOString(),
      sourceType: source.type as "note" | "debug",
      sourceTitle: source.title,
      sourceSha: source.sha,
      due: now.toISOString().slice(0, 10),
      suspended: false,
      streak: 0,
      history: [],
    });
  } else {
    const card = state.reviews.find((r) => r.id === input.id);
    if (!card) throw new AppError(404, "复习卡不存在。");
    if (input.action === "suspendReview") card.suspended = input.suspended;
    else {
      const source = await findEntry(repo, card.sourceId);
      if (source.deletedAt || source.type !== card.sourceType)
        throw new AppError(409, "来源已删除或失效，请先恢复来源；本次未记录。");
      const today = now.toISOString().slice(0, 10);
      if (
        card.suspended ||
        card.due > today ||
        card.history.some((h) => h.ratedAt.slice(0, 10) === today)
      )
        throw new AppError(
          409,
          "复习卡已暂停、尚未到期或今天已记录，请获取最新版本。",
        );
      if (card.history.length >= 60)
        throw new AppError(
          409,
          "已达单卡 60 次复习边界，请先规划扩容；历史保留。",
        );
      if (card.kind === "code" && input.evidence.trim().length < 5)
        throw new AppError(
          400,
          "代码或排障题需要填写重做命令与结果，不能只口述答案。",
        );
      const schedule = nextReview(card.streak, input.grade, now);
      card.history.push({
        ratedAt: now.toISOString(),
        grade: input.grade,
        response: input.response,
        evidence: input.evidence,
        nextDue: schedule.due,
      });
      card.streak = schedule.streak;
      card.due = schedule.due;
    }
  }
  const text = JSON.stringify(stateSchema.parse(state), null, 2) + "\n";
  if (Buffer.byteLength(text, "utf8") > MAX_STATE_BYTES)
    throw new AppError(
      409,
      "训练档案达到 512 KiB 边界，请先规划扩容；本次未写入。",
    );
  const commit = current.sha
    ? await repo.updateTextFile(
        TRAINING_PATH,
        current.sha,
        text,
        "training: " + input.action,
      )
    : await repo.createTextFile(
        TRAINING_PATH,
        text,
        "training: " + input.action,
      );
  try {
    return { ...(await readTraining(repo)), commit };
  } catch {
    throw new AppError(
      503,
      "GitHub 提交已完成，但读取最新档案失败。请获取最新版本核对，不要重复提交。",
    );
  }
}
