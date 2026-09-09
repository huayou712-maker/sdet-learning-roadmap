export type TextFile = { path: string; content: string; sha: string };
export type CommitInfo = {
  sha: string;
  message: string;
  date: string;
  url: string;
};
export interface Repository {
  getTextFile(path: string): Promise<TextFile | null>;
  listDirectory(prefix: string): Promise<string[]>;
  createTextFile(
    path: string,
    content: string,
    message: string,
  ): Promise<string>;
  updateTextFile(
    path: string,
    sha: string,
    content: string,
    message: string,
  ): Promise<string>;
  deleteFile(path: string, sha: string, message: string): Promise<string>;
  // One bounded page, newest first. Callers must explicitly request older pages.
  getCommitsForPath(path: string, page?: number): Promise<CommitInfo[]>;
  getTextFileAtRef(path: string, ref: string): Promise<TextFile | null>;
  createBinaryFile(
    path: string,
    bytes: Buffer,
    message: string,
  ): Promise<string>;
}
