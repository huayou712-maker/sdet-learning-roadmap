"use client";
import { useState } from "react";
import Link from "next/link";
import {
  caseCategories,
  caseFields,
  caseHints,
  blankCase,
  caseIssues,
  caseDesignSchema,
  designAssignment,
  designMarkdown,
  contractUrl,
  type CaseDesign,
  type CaseRow,
} from "@/lib/training/case-design";
import { Markdown } from "@/components/ui/markdown";
import { DraftControls, useTrainingDraft } from "./draft-controls";
import {
  RecordSubmissionFeedback,
  useRecordSubmission,
} from "./record-submission";
import styles from "./practice-workbench.module.css";
import training from "./training.module.css";

export function CaseDesigner({
  project,
  acknowledged,
  disabled,
}: {
  project?: { id: string; stageId: string };
  acknowledged: boolean;
  disabled: boolean;
}) {
  const [design, setDesign] = useState<CaseDesign>(() => ({
    title: "",
    cases: [blankCase("case-1")],
  }));
  const [dirty, setDirty] = useState(false);
  const [openHints, setOpenHints] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const submission = useRecordSubmission("assignments");
  const draft = useTrainingDraft({
    scope: "case-design",
    value: design,
    schema: caseDesignSchema,
    dirty,
    restore: (value) => {
      setDesign(value);
      setOpenHints([]);
      setPreview(false);
      setDirty(true);
    },
  });
  const locked = disabled || submission.busy;
  const completed = design.cases.filter(
    (row) => !caseIssues(row).length,
  ).length;
  function update(id: string, values: Partial<CaseRow>) {
    setDesign((previous) => ({
      ...previous,
      cases: previous.cases.map((row) =>
        row.id === id ? { ...row, ...values } : row,
      ),
    }));
    setDirty(true);
  }
  let markdown = "";
  if (preview) {
    try {
      markdown = designMarkdown(design);
    } catch {
      markdown = "内容包含疑似凭据或不符合限制，未生成预览。";
    }
  }
  return (
    <div className={styles.workbench}>
      <header className={styles.intro}>
        <p className="eyebrow">演武台 · 注册接口</p>
        <h2>先写清楚，你要验证什么</h2>
        <p>
          根据契约设计输入与预期，再用自己的测试去验证。填写情况不是测试成绩。
        </p>
      </header>
      <div className={styles.designLayout}>
        <aside className={styles.contract} aria-label="注册接口契约摘要">
          <h3>契约 v1</h3>
          <p className={styles.endpoint}>POST /users</p>
          <dl>
            <div>
              <dt>username</dt>
              <dd>ASCII 字母、数字、下划线；长度 3–20，大小写敏感。</dd>
            </div>
            <div>
              <dt>age</dt>
              <dd>整数 18–120（含两端），拒绝布尔值、字符串、小数与 null。</dd>
            </div>
            <div>
              <dt>成功</dt>
              <dd>201，返回 id / username / age。</dd>
            </div>
            <div>
              <dt>重复注册</dt>
              <dd>409 / username_taken，保留原记录。</dd>
            </div>
            <div>
              <dt>其他失败</dt>
              <dd>
                字段、JSON 与 Content-Type 分别检查；任何失败都不能增加用户。
              </dd>
            </div>
            <div>
              <dt>GET /users</dt>
              <dd>200 / users 数组；每条测试的独立实例初始为空。</dd>
            </div>
          </dl>
          <a href={contractUrl} target="_blank" rel="noreferrer">
            查看完整契约与校验顺序 ↗
          </a>
          <p>这是隔离教学服务，只使用合成数据。</p>
          <Link href="/guide/beginner">实践指南 →</Link>
        </aside>
        <form
          className={training.form}
          aria-label="注册用例设计"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            if (!project) {
              setError("Project 0 定义不可用，暂不能提交。");
              return;
            }
            try {
              if (
                await submission.submit(
                  designAssignment(design, project, acknowledged),
                )
              ) {
                setDirty(false);
                draft.submitted();
              }
            } catch {
              setError(
                "请补齐用例字段、标题、有效状态码，并确认公开仓库提示；敏感内容不能提交。",
              );
            }
          }}
        >
          <fieldset disabled={locked}>
            <legend>我的用例设计</legend>
            <label>
              作业标题
              <input
                maxLength={160}
                required
                value={design.title}
                onChange={(e) => {
                  setDesign({ ...design, title: e.target.value });
                  setDirty(true);
                }}
                placeholder="例如：注册边界与数据一致性测试设计"
              />
            </label>
            <p className={styles.filling}>
              已填写完整 {completed} / {design.cases.length} 条 ·
              仅检查字段，不评定正确性
            </p>
            {design.cases.map((row, i) => (
              <fieldset
                className={styles.case}
                key={row.id}
                aria-label={"用例 " + (i + 1)}
              >
                <legend>用例 {String(i + 1).padStart(2, "0")}</legend>
                <label>
                  用例类型
                  <select
                    value={row.category}
                    onChange={(e) =>
                      update(row.id, {
                        category: e.target.value as CaseRow["category"],
                      })
                    }
                  >
                    {Object.entries(caseCategories).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {Object.entries(caseFields).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    {key === "name" || key === "status" ? (
                      <input
                        required
                        inputMode={key === "status" ? "numeric" : "text"}
                        pattern={key === "status" ? "[1-5][0-9]{2}" : undefined}
                        maxLength={key === "status" ? 3 : 120}
                        value={row[key]}
                        onChange={(e) => {
                          if (
                            key !== "status" ||
                            /^[0-9]*$/.test(e.target.value)
                          )
                            update(row.id, { [key]: e.target.value });
                        }}
                      />
                    ) : (
                      <textarea
                        required
                        maxLength={500}
                        rows={2}
                        value={row[key as keyof typeof caseFields]}
                        onChange={(e) =>
                          update(row.id, { [key]: e.target.value })
                        }
                      />
                    )}
                  </label>
                ))}
                {caseIssues(row).length > 0 && (
                  <p className={styles.missing}>
                    待填写：{caseIssues(row).join("、")}
                  </p>
                )}
                <div className={training.actions}>
                  <button
                    type="button"
                    className="secondary"
                    disabled={caseIssues(row).length > 0}
                    aria-expanded={openHints.includes(row.id)}
                    onClick={() => {
                      if (!openHints.includes(row.id))
                        update(row.id, { consulted: true });
                      setOpenHints((current) =>
                        current.includes(row.id)
                          ? current.filter((id) => id !== row.id)
                          : [...current, row.id],
                      );
                    }}
                  >
                    {openHints.includes(row.id)
                      ? "收起检查提示"
                      : "填写后对照提示"}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    disabled={design.cases.length === 1}
                    onClick={() => {
                      if (
                        !window.confirm(
                          "移除此条未提交用例？其他用例与 GitHub 记录不变。",
                        )
                      )
                        return;
                      setDesign({
                        ...design,
                        cases: design.cases.filter((c) => c.id !== row.id),
                      });
                      setDirty(true);
                    }}
                  >
                    移除用例 {i + 1}
                  </button>
                </div>
                {openHints.includes(row.id) && (
                  <div className={styles.hintPanel}>
                    <strong>对照检查，不是标准答案</strong>
                    <p>{caseHints[row.category]}</p>
                    <p>可以继续修订；提交时保留“已查看检查提示”的说明。</p>
                  </div>
                )}
              </fieldset>
            ))}
            <button
              type="button"
              className="secondary"
              disabled={design.cases.length >= 20}
              onClick={() => {
                setDesign({
                  ...design,
                  cases: [...design.cases, blankCase(crypto.randomUUID())],
                });
                setDirty(true);
              }}
            >
              添加用例（最多 20 条）
            </button>
            <div className={styles.submitLine}>
              <button
                type="button"
                className="secondary"
                aria-expanded={preview}
                onClick={() => setPreview(!preview)}
              >
                {preview ? "收起提交预览" : "预览作业 Markdown"}
              </button>
              <button
                type="submit"
                disabled={
                  !project ||
                  !acknowledged ||
                  !dirty ||
                  !design.title.trim() ||
                  completed !== design.cases.length ||
                  submission.uncertain
                }
              >
                提交为 Project 0 作业
              </button>
            </div>
          </fieldset>
          {!project && (
            <p className={training.warning}>
              Project 0 定义不可用，请检查 GitHub 项目目录。
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          <RecordSubmissionFeedback submission={submission} />
          <DraftControls draft={draft} disabled={locked} label="用例设计" />
          {preview && (
            <section className={styles.preview} aria-label="作业 Markdown 预览">
              <Markdown body={markdown} />
            </section>
          )}
          <p className={styles.footnote}>
            提交会创建普通作业迭代。后续在作业页继续编辑；不会改变知识点进度或训练成绩。
          </p>
        </form>
      </div>
    </div>
  );
}
