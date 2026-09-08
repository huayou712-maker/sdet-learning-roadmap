export type Evidence = {
  type: "note" | "assignment" | "project" | "debug" | "commit";
  id: string;
};
export type Progress = {
  version: number;
  updatedAt: string | null;
  items: Record<
    string,
    { completed: boolean; completedAt: string | null; evidence: Evidence[] }
  >;
};
export type Stage = {
  id: string;
  order: number;
  title: string;
  description: string;
  groups: {
    id: string;
    title: string;
    items: { id: string; title: string }[];
  }[];
};
export type Roadmap = { version: number; stages: Stage[] };
