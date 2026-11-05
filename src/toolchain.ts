// Locates the Saule toolchain binaries (`saule`, `saule-lsp`) for this editor.
// The rule itself, and the reason a project's own build is opt-in, is in
// `locate.ts`.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { workspace } from "vscode";

import { Located, locateIn } from "./locate";

export { Located };

/** Windows needs the `.exe` suffix; Unix does not. */
export function exeName(base: string): string {
  return process.platform === "win32" ? `${base}.exe` : base;
}

/**
 * @param base       bare binary name, e.g. `"saule"` or `"saule-lsp"`.
 * @param envVar     environment variable that, if set, pins the executable.
 * @param setting    `saule.`-scoped setting holding an explicit path.
 */
export function locate(
  base: string,
  envVar: string,
  setting: string,
): Located {
  const config = workspace.getConfiguration("saule");
  const home = process.env.SAULE_HOME?.trim() || path.join(os.homedir(), ".saule");
  return locateIn({
    exe: exeName(base),
    fromEnv: process.env[envVar],
    configuredPath: config.get<string>(setting, ""),
    toolchainDir: config.get<string>("toolchainDir", ""),
    allowProjectBuild: config.get<boolean>("allowProjectBuild", false),
    workspaceFolders: (workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath),
    pathEnv: process.env.PATH,
    installDir: path.join(home, "bin"),
    isFile,
  });
}

function isFile(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}
