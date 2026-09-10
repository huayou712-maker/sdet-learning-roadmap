"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import type { Progress, Roadmap } from "@/lib/models";
import { PublicNotice } from "@/components/ui/public-notice";
import { Practice } from "./practice";
import { Reviews } from "./reviews";
import { StatePanel } from "@/components/ui/state-panel";
import { SyncFeedback } from "./sync-feedback";
import {
  mutationSchema,
  type TrainingCommand,
  type TrainingSnapshot,
} from "@/lib/training/schema";
import { recommendTraining, type ReviewSource } from "@/lib/training/rules";
import styles from "./training.module.css";
export function TrainingWorkspace({
  initial,
  sources: initialSources,
  roadmap,
  progress,
  tab,
  sourceId,
  cardId,
  today: initialToday,
}: {
  initial: TrainingSnapshot;
  sources: ReviewSource[];
  roadmap: Roadmap;
  progress: Progress;
  tab: string;
  sourceId: string;
  cardId: string;
  today: string;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [today, setToday] = useState(initialToday);
  const [sources, setSources] = useState(initialSources);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [operation, setOperation] = useState<"read" | "write">("read");
  const locked = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [commit, setCommit] = useState("");
  const [budget, setBudget] = useState(60);
  const [order, setOrder] = useState<string[]>([]);
  const active = ["practice", "review"].includes(tab) ? tab : "today";
  async function save(command: TrainingCommand) {
    if (locked.current) return false;
    setOperation("write");
    setError("");
    setMessage("");
    setCommit("");
    const payload = { ...command, sha: snapshot.sha, acknowledgedPublic: ack };
    const parsed = mutationSchema.safeParse(payload);
    if (!parsed.success) {
      setError(
        !ack
          ? "请先确认公开仓库提示。"
          : "请检查必填字段、40 位 SHA、复盘长度及本仓库 CI 链接。正常实现通过后才能标记检出。",
      );
      return false;
    }
    locked.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/training", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "提交失败，请获取最新版本后核对。");
      setSnapshot({ state: data.state, sha: data.sha });
      setCommit(data.commit);
      setMessage("已提交到 GitHub。原知识点进度未改动。");
      return true;
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : "提交失败。") +
          " 当前输入已保留；网络中断时先获取最新版本核对是否已提交。",
      );
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function refresh() {
    if (locked.current) return;
    setOperation("read");
    locked.current = true;
    setBusy(true);
    setError("");
    setCommit("");
    setMessage("");
    try {
      const response = await fetch("/api/training", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "读取失败");
      setSnapshot({ state: data.state, sha: data.sha });
      setSources(data.sources);
      setToday(data.today);
      setMessage("已获取最新版本，表单输入保留。请核对历史后决定是否重试。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "读取失败，请稍后重试。");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const recommendations = recommendTraining(
    snapshot.state,
    sources,
    roadmap,
    progress,
    today,
    budget,
  );
  const rank = (id: string) =>
    order.includes(id) ? order.indexOf(id) : order.length;
  const plan = [...recommendations].sort((a, b) => rank(a.id) - rank(b.id));
  return (
    <div className={styles.workspace}>
      <header className="page-heading">
        <p className="eyebrow">练习 · 检验 · 再练</p>
        <h1>个人训练台</h1>
        <p>先留独立作答，再对照结果。把漏检变成下一次练习。</p>
      </header>
      <nav className="status-tabs" aria-label="训练导航">
        {[
          ["today", "今日任务"],
          ["practice", "练习验收"],
          ["review", "复习队列"],
        ].map(([key, title]) => (
          <Link
            key={key}
            href={"/training?tab=" + key}
            aria-current={active === key ? "page" : undefined}
          >
            {title}
          </Link>
        ))}
      </nav>
      <div className={styles.statusBar}>
        <span>{today} · UTC 日期</span>
        <button className="secondary" disabled={busy} onClick={refresh}>
          获取最新版本（保留输入）
        </button>
      </div>
      <SyncFeedback
        busy={busy}
        operation={operation}
        error={error}
        message={message}
        commit={commit}
      />
      <p className={styles.hint}>
        正式记录只保存在
        GitHub；本页未提交输入仅留在内存，关闭或刷新页面会丢失。公开仓库不是私密存储。
      </p>
      <PublicNotice checked={ack} onChange={setAck} />
      <section hidden={active !== "today"} aria-label="今日训练计划">
        <div className={styles.statusBar}>
          <h2>今天先做什么</h2>
          <label>
            可用时间（分钟）
            <input
              type="number"
              min={0}
              max={180}
              step={10}
              value={budget}
              onChange={(e) => {
                setBudget(Math.max(0, Math.min(180, Number(e.target.value))));
                setOrder([]);
              }}
            />
          </label>
        </div>
        <p>
          默认顺序：到期复习 → 最新练习的阻塞或漏检 →
          当前主线。时间是投入预算，不是完成承诺。
        </p>
        <ol className={styles.plan}>
          {plan.map((item, i) => (
            <li key={item.id}>
              <div>
                <span className={styles.time}>{item.minutes} 分钟</span>
                <h3>
                  <Link href={item.href}>{item.title}</Link>
                </h3>
                <p>{item.reason}</p>
              </div>
              <button
                className="secondary"
                disabled={i === 0}
                onClick={() => {
                  const next = plan.map((p) => p.id);
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  setOrder(next);
                }}
                aria-label={"上移：" + item.title}
              >
                上移
              </button>
            </li>
          ))}
        </ol>
        {!plan.length && (
          <StatePanel
            compact
            title={budget === 0 ? "先安排一点可用时间" : "当前没有可安排任务"}
            actions={
              <>
                <Link href="/training?tab=review">查看或创建复习卡 →</Link>
                <Link href="/roadmap">回顾学习路线 →</Link>
              </>
            }
          >
            <p>
              {budget === 0
                ? "当前时间预算为 0 分钟。调整上方可用时间后，按原规则显示可安排任务。"
                : "可调整时间、创建复习卡或回顾已有作品；没有任务不代表已经完成全部学习。"}
            </p>
          </StatePanel>
        )}
        <p>
          本次安排 {plan.reduce((sum, p) => sum + p.minutes, 0)} / {budget}{" "}
          分钟。排序和时间调整只影响本次查看。
        </p>
        <Link href="/daily/new">学习结束后记录日课 →</Link>
      </section>
      <section hidden={active !== "practice"} aria-label="练习验收台">
        <Practice
          attempts={snapshot.state.attempts}
          disabled={busy}
          save={save}
        />
      </section>
      <section hidden={active !== "review"} aria-label="复习工作区">
        <Reviews
          cards={snapshot.state.reviews}
          sources={sources}
          sourceId={sourceId}
          cardId={cardId}
          today={today}
          disabled={busy}
          save={save}
        />
      </section>
    </div>
  );
}
