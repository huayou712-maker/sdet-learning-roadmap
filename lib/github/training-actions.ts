import "server-only";
import { Octokit } from "octokit";
import { AppError } from "@/lib/errors";
import {
  CI_WORKFLOW,
  type ActionsReader,
} from "@/lib/training/ci-verification";

export function trainingActions(): ActionsReader {
  // This fixed public repository can be inspected without reading local credentials
  // or granting the application's Contents token new Actions permissions.
  const api = new Octokit({
    log: { debug() {}, info() {}, warn() {}, error() {} },
    request: { timeout: 10000 },
    retry: { enabled: false },
    throttle: { enabled: false },
  });
  const target = { owner: "huayou712-maker", repo: "sdet-learning-roadmap" };
  return {
    async getRun(run_id) {
      return (
        await api.rest.actions.getWorkflowRun({
          ...target,
          run_id,
          exclude_pull_requests: true,
        })
      ).data;
    },
    async getJobs(run_id, attempt_number) {
      return (
        await api.rest.actions.listJobsForWorkflowRunAttempt({
          ...target,
          run_id,
          attempt_number,
          per_page: 20,
          page: 1,
        })
      ).data;
    },
    async getArtifacts(run_id) {
      return (
        await api.rest.actions.listWorkflowRunArtifacts({
          ...target,
          run_id,
          per_page: 20,
          page: 1,
        })
      ).data;
    },
    async getWorkflow(ref) {
      try {
        const { data } = await api.rest.repos.getContent({
          ...target,
          path: CI_WORKFLOW,
          ref,
        });
        if (
          Array.isArray(data) ||
          !("content" in data) ||
          data.size > 32768 ||
          data.encoding !== "base64"
        )
          throw new AppError(503, "工作流配置超过读取边界。");
        const content = Buffer.from(data.content, "base64");
        if (content.length > 32768)
          throw new AppError(503, "工作流配置超过读取边界。");
        return content.toString("utf8");
      } catch (error) {
        if ((error as { status?: number }).status === 404) return null;
        throw error;
      }
    },
  };
}
