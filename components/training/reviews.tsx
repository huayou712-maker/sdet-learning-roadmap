"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  gradeLabels,
  type Review,
  type TrainingCommand,
} from "@/lib/training/schema";
import { sourceFor, nextReview, type ReviewSource } from "@/lib/training/rules";
import styles from "./training.module.css";
import { StatePanel } from "@/components/ui/state-panel";
import { DraftControls, useTrainingDraft } from "./draft-controls";
import { responseDraftSchema, reviewDraftSchema } from "@/lib/training/drafts";
type Save = (command: TrainingCommand) => Promise<boolean>;
function ReviewCard({
  card,
  sources,
  today,
  disabled,
  save,
}: {
  card: Review;
  sources: ReviewSource[];
  today: string;
  disabled: boolean;
  save: Save;
}) {
  const [response, setResponse] = useState("");
  const [evidence, setEvidence] = useState("");
  const [revealed, setRevealed] = useState(false);
  const source = sourceFor(card, sources);
  const available =
    !!source &&
    !card.suspended &&
    card.due <= today &&
    !card.history.some((h) => h.ratedAt.slice(0, 10) === today);
  const ready =
    !!response.trim() && (card.kind !== "code" || evidence.trim().length >= 5);
  const [dirty, setDirty] = useState(false);
  const draft = useTrainingDraft({
    scope:
      "response:" + card.id + ":" + today + ":" + (source?.sha || "missing"),
    schema: responseDraftSchema,
    dirty: dirty && available,
    value: { response, evidence, revealed },
    restore: (value) => {
      setResponse(value.response);
      setEvidence(value.evidence);
      setRevealed(value.revealed);
      setDirty(true);
    },
  });
  return (
    <article
      className={styles.reviewCard}
      aria-label={card.question}
      id={"card-" + card.id}
    >
      <p className="eyebrow">
        {card.kind === "code" ? "重做验证" : "概念复习"} ·{" "}
        {card.suspended
          ? "已暂停"
          : !source
            ? "来源失效"
            : card.due <= today
              ? "已到期"
              : "待到期"}
      </p>
      <h3>{card.question}</h3>
      {source ? (
        <Link
          href={
            (source.type === "note" ? "/notes/" : "/debug-journal/") + source.id
          }
        >
          来源：{source.title} →
        </Link>
      ) : (
        <p>来源已删除或不存在，请先恢复原记录。历史仍保留。</p>
      )}
      {source && source.sha !== card.sourceSha && (
        <p className={styles.warning}>
          来源已更新，请核对本卡参考答案。原卡保留创建时的版本关联。
        </p>
      )}
      <p>
        下次复习：{card.due}（UTC） · 已记录 {card.history.length} 次
      </p>
      {!available && source && (
        <p className={styles.reviewStatus}>
          {card.suspended
            ? "这张卡已暂停；恢复后将按原到期日继续安排。"
            : card.history.some((h) => h.ratedAt.slice(0, 10) === today)
              ? "今天已记录自评。可以查看历史，下一次到期后再独立作答。"
              : "尚未到复习日期。可以先回顾来源记录，当前不会重复记一次成绩。"}
        </p>
      )}
      {available && (
        <div className={styles.form} onChange={() => setDirty(true)}>
          <label>
            你的作答
            <textarea
              rows={3}
              maxLength={2000}
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              disabled={disabled || revealed}
            />
          </label>
          {card.kind === "code" && (
            <label>
              重做命令与结果
              <textarea
                rows={3}
                maxLength={2000}
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                disabled={disabled || revealed}
                placeholder="实际运行了什么？结果是什么？这里只保存自报证据。"
              />
            </label>
          )}
          {!revealed ? (
            <button
              type="button"
              className="secondary"
              disabled={!ready || disabled}
              onClick={() => {
                if (
                  draft.updateOwnedDraft({ response, evidence, revealed: true })
                )
                  setRevealed(true);
              }}
            >
              展开参考答案
            </button>
          ) : (
            <>
              <div className={styles.answer}>
                <strong>参考答案（由你编写）</strong>
                <p className={styles.prose}>{card.answer}</p>
              </div>
              <p>对照刚才的作答自评；看过答案后不要修改成“独立答对”。</p>
              <div className={styles.actions}>
                {(["independent", "hint", "again"] as const).map((grade) => (
                  <button
                    key={grade}
                    type="button"
                    disabled={disabled}
                    onClick={async () => {
                      if (
                        await save({
                          action: "gradeReview",
                          id: card.id,
                          grade,
                          response,
                          evidence,
                        })
                      ) {
                        setRevealed(false);
                        setResponse("");
                        setEvidence("");
                        setDirty(false);
                        draft.submitted();
                      }
                    }}
                  >
                    {gradeLabels[grade]} ·{" "}
                    {
                      nextReview(
                        card.streak,
                        grade,
                        new Date(today + "T00:00:00Z"),
                      ).days
                    }{" "}
                    天后
                  </button>
                ))}
              </div>
            </>
          )}
          <DraftControls
            draft={draft}
            disabled={disabled}
            restoreDisabled={revealed}
            label="本次作答"
          />
        </div>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className="secondary"
          disabled={disabled}
          onClick={() =>
            save({
              action: "suspendReview",
              id: card.id,
              suspended: !card.suspended,
            })
          }
        >
          {card.suspended ? "恢复复习" : "暂停复习"}
        </button>
      </div>
      {!!card.history.length && (
        <details>
          <summary>查看复习历史（{card.history.length}）</summary>
          {[...card.history].reverse().map((h, i) => (
            <div key={h.ratedAt + i} className={styles.history}>
              <p>
                {h.ratedAt.slice(0, 10)} · {gradeLabels[h.grade]} · 下次{" "}
                {h.nextDue}
              </p>
              <p className={styles.prose}>{h.response}</p>
              {h.evidence && <p className={styles.prose}>{h.evidence}</p>}
            </div>
          ))}
        </details>
      )}
    </article>
  );
}
export function Reviews({
  cards,
  sources,
  sourceId,
  cardId,
  today,
  disabled,
  save,
}: {
  cards: Review[];
  sources: ReviewSource[];
  sourceId: string;
  cardId: string;
  today: string;
  disabled: boolean;
  save: Save;
}) {
  const [selected, setSelected] = useState(sourceId);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [kind, setKind] = useState<Review["kind"]>("concept");
  const [dirty, setDirty] = useState(false);
  const draft = useTrainingDraft({
    scope: "review-new",
    schema: reviewDraftSchema,
    dirty,
    value: { selected, question, answer, kind },
    restore: (value) => {
      setSelected(value.selected);
      setQuestion(value.question);
      setAnswer(value.answer);
      setKind(value.kind);
      setDirty(true);
    },
  });
  const live = sources.filter((s) => !s.deletedAt);
  const existing = cards.find((c) => c.sourceId === selected);
  async function create(event: FormEvent) {
    event.preventDefault();
    if (
      await save({
        action: "createReview",
        review: { sourceId: selected, question, answer, kind },
      })
    ) {
      setQuestion("");
      setAnswer("");
      setDirty(false);
      draft.submitted();
    }
  }
  const sorted = [...cards].sort(
    (a, b) =>
      Number(b.id === cardId) - Number(a.id === cardId) ||
      Number(a.suspended) - Number(b.suspended) ||
      a.due.localeCompare(b.due),
  );
  return (
    <div className={styles.columns}>
      <section>
        <h2>复习队列</h2>
        <p>先回答，再核对。每张卡每天最多记一次；代码题需要实际重做。</p>
        {!cards.length && (
          <StatePanel
            compact
            title="还没有复习卡"
            actions={
              live.length ? (
                <a href="#create-review">从已有记录提取问题 →</a>
              ) : (
                <Link href="/notes/new">先写一篇学习笔记 →</Link>
              )
            }
          >
            <p>从一篇笔记或排障记录中挑一个易错点，写出问题和可核对的答案。</p>
          </StatePanel>
        )}
        {sorted.map((card) => (
          <ReviewCard
            key={card.id}
            card={card}
            sources={sources}
            today={today}
            disabled={disabled}
            save={save}
          />
        ))}
      </section>
      <aside className={styles.ledger} id="create-review">
        <h2>从已有记录提取问题</h2>
        <p>每篇来源最多一张卡。问题和答案由你确认；不是 AI 自动生成。</p>
        {!live.length ? (
          <p>
            先<Link href="/notes/new">写一篇学习笔记</Link>或
            <Link href="/debug-journal/new">记录一次排障</Link>，再创建复习卡。
          </p>
        ) : (
          <form
            onChange={() => setDirty(true)}
            onSubmit={create}
            className={styles.form}
            aria-label="创建复习卡"
          >
            <fieldset disabled={disabled}>
              <legend>创建复习卡</legend>
              <label>
                来源记录
                <select
                  required
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  <option value="">请选择笔记或排障记录</option>
                  {live.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>
              {existing && (
                <p>
                  该来源已有卡片：
                  <a href={"#card-" + existing.id}>{existing.question}</a>
                  ，可暂停或恢复，不能重复创建。
                </p>
              )}
              <label>
                验证方式
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as Review["kind"])}
                >
                  <option value="concept">概念解释</option>
                  <option value="code">代码／排障重做</option>
                </select>
              </label>
              <label>
                复习问题
                <textarea
                  required
                  minLength={5}
                  maxLength={300}
                  rows={2}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </label>
              <label>
                参考答案
                <textarea
                  required
                  minLength={5}
                  maxLength={2000}
                  rows={4}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                />
              </label>
              <p className={styles.hint}>
                保存前核对题目与答案；本版保留原卡与历史，可暂停，不自动重写。
              </p>
              <button type="submit" disabled={!!existing}>
                创建复习卡
              </button>
            </fieldset>
            <DraftControls draft={draft} disabled={disabled} label="新复习卡" />
          </form>
        )}
        <details>
          <summary>复习间隔规则</summary>
          <p>
            仍然不会：1 天；需要提示：3 天；连续独立答对：3、7、14、30
            天。提示或失败重置连续计数。按 UTC
            日期计算，只是初版安排规则，不是能力认证。
          </p>
        </details>
      </aside>
    </div>
  );
}
