"use client";
import { useState } from "react";
import Link from "next/link";
import { type Attempt, REPOSITORY_URL } from "@/lib/training/schema";
import {
  attemptPair,
  boundPair,
  blankComparison,
  prepareComparison,
  comparisonRows,
  comparisonDraftSchema,
  comparisonFields,
  comparisonMarkdown,
  comparisonRecord,
  type ComparisonDraft,
} from "@/lib/training/attempt-comparison";
import { StatePanel } from "@/components/ui/state-panel";
import { Markdown } from "@/components/ui/markdown";
import { DraftControls, useTrainingDraft } from "./draft-controls";
import {
  useRecordSubmission,
  RecordSubmissionFeedback,
} from "./record-submission";
import styles from "./practice-workbench.module.css";
import training from "./training.module.css";

export function AttemptComparison({
  attempts,
  project,
  categories = [],
  acknowledged,
  disabled,
  active = true,
}: {
  attempts: Attempt[];
  project?: { id: string; stageId: string };
  categories?: string[];
  acknowledged: boolean;
  disabled: boolean;
  active?: boolean;
}) {
  const [beforeId, setBeforeId] = useState(attempts.at(-2)?.id || "");
  const [afterId, setAfterId] = useState(attempts.at(-1)?.id || "");
  const [value, setValue] = useState<ComparisonDraft>(blankComparison);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const submission = useRecordSubmission("debug-journal");
  const draft = useTrainingDraft({
    scope: "attempt-comparison",
    schema: comparisonDraftSchema,
    value,
    dirty,
    restore: (next) => {
      if (
        !boundPair(attempts, next) ||
        (next.category && !categories.includes(next.category))
      )
        throw new Error("来源失效");
      setBeforeId(next.pair!.beforeId);
      setAfterId(next.pair!.afterId);
      setValue(next);
      setDirty(true);
      setPreview(false);
      setError("");
    },
  });
  const pair = attemptPair(attempts, beforeId, afterId);
  const bound = boundPair(attempts, value);
  const locked = disabled || submission.busy;
  function select(which: "before" | "after", id: string) {
    if (
      dirty &&
      !window.confirm(
        "更换对照会清除当前未提交排障输入。请先保存本机草稿，仍要更换吗？",
      )
    )
      return;
    if (which === "before") setBeforeId(id);
    else setAfterId(id);
    setValue(blankComparison());
    setDirty(false);
    setPreview(false);
    setError("");
  }
  let markdown = "";
  if (preview) {
    try {
      markdown = comparisonMarkdown(value, attempts);
    } catch {
      markdown = "来源已失效或输入含疑似凭据，未生成预览。";
    }
  }
  const option = (a: Attempt, index: number) => (
    <option key={a.id} value={a.id}>
      第 {index + 1} 次 · {a.recordedAt.slice(0, 16)} ·{" "}
      {a.commitSha.slice(0, 7)}
    </option>
  );
  return (
    <div className={styles.workbench}>
      <header className={styles.intro}>
        <p className="eyebrow">复盘台 · 失败到修复</p>
        <h2>把两次尝试，放在一起看</h2>
        <p>
          对照结果变化，再解释你改了什么、怎样验证。变化只是线索，不自动判定修复成功。
        </p>
      </header>
      {attempts.length < 2 ? (
        <StatePanel
          compact
          title="至少需要两次练习记录"
          actions={<Link href="/training?tab=practice">去记录实际练习 →</Link>}
        >
          <p>当前 {attempts.length} 次。不创建示例成绩，也不替你推断改进。</p>
        </StatePanel>
      ) : (
        <>
          <div className={styles.pairSelectors}>
            <label>
              较早尝试
              <select
                disabled={locked}
                value={beforeId}
                onChange={(e) => select("before", e.target.value)}
              >
                <option value="">请选择</option>
                {attempts.map(option)}
              </select>
            </label>
            <label>
              较晚尝试
              <select
                disabled={locked}
                value={afterId}
                onChange={(e) => select("after", e.target.value)}
              >
                <option value="">请选择</option>
                {attempts.map(option)}
              </select>
            </label>
          </div>
          {!pair && (
            <p role="alert">请选择不同且按记录时间先后排列的两次尝试。</p>
          )}
          {active && pair && (
            <section
              aria-label="两次尝试的自报对照"
              className={styles.comparison}
            >
              <h3>学习者自报 · 未自动验真</h3>
              {comparisonRows(pair.before, pair.after).map((row) => (
                <div className={styles.comparisonRow} key={row.label}>
                  <h4>
                    {row.label}
                    <small>{row.changed ? "自报有变化" : "自报相同"}</small>
                  </h4>
                  <p>
                    <span>较早</span>
                    {row.before}
                  </p>
                  <p>
                    <span>较晚</span>
                    {row.after}
                  </p>
                </div>
              ))}
              <div className={styles.reflections}>
                {[
                  ["较早", pair.before],
                  ["较晚", pair.after],
                ].map(([label, record]) => {
                  const a = record as Attempt;
                  return (
                    <article key={a.id}>
                      <h4>{label as string}复盘</h4>
                      <p>{a.reflection}</p>
                      <a
                        href={REPOSITORY_URL + "/commit/" + a.commitSha}
                        target="_blank"
                        rel="noreferrer"
                      >
                        查看代码 {a.commitSha.slice(0, 7)} ↗
                      </a>
                      {a.ciUrl ? (
                        <p>
                          <a href={a.ciUrl} target="_blank" rel="noreferrer">
                            {label as string} CI（未核验）↗
                          </a>
                        </p>
                      ) : (
                        <p>未附 CI 链接</p>
                      )}
                    </article>
                  );
                })}
              </div>
              <a
                href={
                  REPOSITORY_URL +
                  "/compare/" +
                  pair.before.commitSha +
                  "..." +
                  pair.after.commitSha
                }
                target="_blank"
                rel="noreferrer"
              >
                在 GitHub 查看代码差异 ↗
              </a>
              {pair.before.commitSha === pair.after.commitSha && (
                <p className={training.hint}>
                  两次提交 SHA 相同，不能声称代码已修改。
                </p>
              )}
              {!value.pair && (
                <p>
                  <button
                    disabled={locked || !project}
                    onClick={() => {
                      setValue(prepareComparison(pair.before, pair.after));
                      setDirty(true);
                    }}
                  >
                    准备排障草稿
                  </button>
                </p>
              )}
            </section>
          )}
        </>
      )}
      {value.pair && (
        <form
          className={training.form + " " + styles.comparisonForm}
          aria-label="失败对照排障草稿"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            if (!project || !bound) {
              setError("项目或对照来源已失效，请重新选择。");
              return;
            }
            try {
              if (
                await submission.submit(
                  comparisonRecord(
                    value,
                    attempts,
                    project,
                    categories,
                    acknowledged,
                  ),
                )
              ) {
                setDirty(false);
                draft.submitted();
              }
            } catch {
              setError(
                "请检查标题、现象、排查过程、验证结果和分类；确认公开提示并移除疑似凭据。",
              );
            }
          }}
        >
          <h3>写下你的排查依据</h3>
          <p>
            必填现象、排查过程与验证结果。根因未确定就留空，保存为“进行中”，不伪造结论。
          </p>
          {!bound && (
            <p role="alert">
              原尝试或版本已变化，当前草稿不可提交。输入保留，请核对来源。
            </p>
          )}
          <fieldset disabled={locked}>
            <legend>普通排障记录</legend>
            <label>
              排障标题
              <input
                required
                maxLength={160}
                value={value.title}
                onChange={(e) => {
                  setValue({ ...value, title: e.target.value });
                  setDirty(true);
                }}
              />
            </label>
            <label>
              分类标签（手动选择）
              <select
                value={value.category}
                onChange={(e) => {
                  setValue({ ...value, category: e.target.value });
                  setDirty(true);
                }}
              >
                <option value="">暂不分类</option>
                {categories.map((tag) => (
                  <option key={tag}>{tag}</option>
                ))}
              </select>
            </label>
            {Object.entries(comparisonFields).map(([key, label]) => (
              <label key={key}>
                {label}
                <textarea
                  rows={key === "investigation" || key === "validation" ? 4 : 2}
                  maxLength={2000}
                  required={[
                    "phenomenon",
                    "investigation",
                    "validation",
                  ].includes(key)}
                  value={value.fields[key as keyof typeof comparisonFields]}
                  onChange={(e) => {
                    setValue({
                      ...value,
                      fields: { ...value.fields, [key]: e.target.value },
                    });
                    setDirty(true);
                  }}
                />
              </label>
            ))}
            <div className={styles.submitLine}>
              <button
                type="button"
                className="secondary"
                aria-expanded={preview}
                onClick={() => setPreview(!preview)}
              >
                {preview ? "收起排障预览" : "预览排障 Markdown"}
              </button>
              <button
                type="submit"
                disabled={
                  !project ||
                  !bound ||
                  !dirty ||
                  !acknowledged ||
                  submission.uncertain ||
                  !value.title.trim() ||
                  !value.fields.phenomenon.trim() ||
                  !value.fields.investigation.trim() ||
                  !value.fields.validation.trim()
                }
              >
                提交为排障记录
              </button>
            </div>
          </fieldset>
          {error && <p role="alert">{error}</p>}
          <RecordSubmissionFeedback submission={submission} />
          {submission.result && (
            <p>打开已提交记录后，可用原“加入复习”入口手动创建复习卡。</p>
          )}
          {preview && (
            <section className={styles.preview} aria-label="排障 Markdown 预览">
              <Markdown body={markdown} />
            </section>
          )}
        </form>
      )}
      {!project && (
        <p className={training.warning}>
          Project 0 定义不可用，暂不能创建关联排障。
        </p>
      )}
      <DraftControls draft={draft} disabled={locked} label="失败对照" />
      <p className={styles.footnote}>
        本机草稿仅包含你填写的内容和来源标识；训练结果、原始复盘和 CI
        核验结果不做本机备份。提交不改原尝试或复习成绩。
      </p>
    </div>
  );
}
