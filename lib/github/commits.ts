import "server-only";
import { repository } from "./contents";
export const getCommitsForPath = (path: string) =>
  repository().getCommitsForPath(path);
export const getTextFileAtRef = (path: string, ref: string) =>
  repository().getTextFileAtRef(path, ref);
