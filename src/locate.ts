// Where the Saule binaries are, decided from plain inputs so the rule can be
// tested without an editor. `toolchain.ts` supplies the inputs.
//
// The order is the same in the IntelliJ plugin and the Neovim plugin:
//
//   1. Environment variable override (`SAULE_LSP_PATH` / `SAULE_PATH`).
//   2. The configured path or toolchain directory in Settings.
//   3. Only if the user opted in: Cargo build output, walking up from each
//      workspace folder looking for `target/{release,debug}/<name>`.
//   4. `PATH`.
//   5. The install directory (`$SAULE_HOME/bin`, else `~/.saule/bin`), for an
//      editor started from a launcher that never read the shell's `PATH`.
//   6. The bare name, with `found: false`, so callers can surface a hint.
//
// Step 3 is opt-in because a project's files are not trusted just because it
// was opened. Nothing stops a repository committing `target/debug/saule-lsp`,
// and running it automatically would hand that repository the user's machine.

import * as path from "path";

/** How far up the tree to look for a `target/` directory. */
const MAX_DEPTH = 24;

export interface Located {
  /** The executable path, or the bare name if nothing was found. */
  readonly command: string;
  /** Where to run it (the directory containing `target/`, when known). */
  readonly workingDir: string | undefined;
  /** True if [command] resolved to a real file or PATH entry. */
  readonly found: boolean;
}

export interface LocateInputs {
  /** The executable's file name, with `.exe` where that applies. */
  readonly exe: string;
  /** The value of the override environment variable, if set. */
  readonly fromEnv?: string;
  /** An explicit path from Settings. */
  readonly configuredPath?: string;
  /** A toolchain directory from Settings. */
  readonly toolchainDir?: string;
  /** Whether the user has allowed running a project's own build output. */
  readonly allowProjectBuild: boolean;
  readonly workspaceFolders: readonly string[];
  /** The raw `PATH` value. */
  readonly pathEnv?: string;
  /** `$SAULE_HOME/bin`, or `~/.saule/bin`. */
  readonly installDir?: string;
  readonly isFile: (candidate: string) => boolean;
}

export function locateIn(inputs: LocateInputs): Located {
  const { exe, isFile, workspaceFolders } = inputs;
  const firstFolder = workspaceFolders[0];

  const fromEnv = inputs.fromEnv?.trim();
  if (fromEnv) {
    return { command: fromEnv, workingDir: firstFolder, found: true };
  }

  const configured = inputs.configuredPath?.trim();
  if (configured) {
    return {
      command: configured,
      workingDir: firstFolder,
      found: isFile(configured),
    };
  }
  const toolchainDir = inputs.toolchainDir?.trim();
  if (toolchainDir) {
    const candidate = path.join(toolchainDir, exe);
    if (isFile(candidate)) {
      return { command: candidate, workingDir: firstFolder, found: true };
    }
  }

  if (inputs.allowProjectBuild) {
    for (const folder of workspaceFolders) {
      const hit = findUpward(folder, exe, isFile);
      if (hit) {
        return { command: hit.command, workingDir: hit.workspaceRoot, found: true };
      }
    }
  }

  const onPath = findOnPath(exe, inputs.pathEnv, isFile);
  if (onPath) {
    return { command: onPath, workingDir: firstFolder, found: true };
  }

  if (inputs.installDir) {
    const installed = path.join(inputs.installDir, exe);
    if (isFile(installed)) {
      return { command: installed, workingDir: firstFolder, found: true };
    }
  }

  return { command: exe, workingDir: firstFolder, found: false };
}

/**
 * Walk up from `start`, returning the `target/{release,debug}/exe` and the
 * directory that contains that `target/` folder (the workspace root).
 */
function findUpward(
  start: string,
  exe: string,
  isFile: (candidate: string) => boolean,
): { command: string; workspaceRoot: string } | undefined {
  let dir = start;
  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    for (const profile of ["release", "debug"]) {
      const candidate = path.join(dir, "target", profile, exe);
      if (isFile(candidate)) {
        return { command: candidate, workspaceRoot: dir };
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

/**
 * The first match on `PATH`. A relative entry such as `.` is skipped: it would
 * resolve against whatever project is open, which is the same hole as step 3.
 */
function findOnPath(
  exe: string,
  pathEnv: string | undefined,
  isFile: (candidate: string) => boolean,
): string | undefined {
  if (!pathEnv) return undefined;
  for (const entry of pathEnv.split(path.delimiter)) {
    if (!path.isAbsolute(entry.trim())) continue;
    const candidate = path.join(entry.trim(), exe);
    if (isFile(candidate)) return candidate;
  }
  return undefined;
}
