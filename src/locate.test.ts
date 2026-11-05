import { test } from "node:test";
import assert from "node:assert/strict";
import * as path from "path";

import { locateIn, LocateInputs } from "./locate";

const PROJECT = path.resolve("/work/project");
const PLANTED = path.join(PROJECT, "target", "debug", "saule-lsp");
const ON_PATH = path.resolve("/usr/local/bin/saule-lsp");
const INSTALLED = path.resolve("/home/me/.saule/bin/saule-lsp");

function locate(files: string[], overrides: Partial<LocateInputs> = {}) {
  return locateIn({
    exe: "saule-lsp",
    allowProjectBuild: false,
    workspaceFolders: [PROJECT],
    pathEnv: path.dirname(ON_PATH),
    installDir: path.dirname(INSTALLED),
    isFile: (candidate) => files.includes(candidate),
    ...overrides,
  });
}

test("a binary inside the opened project is not run by default", () => {
  const found = locate([PLANTED]);
  assert.equal(found.found, false);
  assert.notEqual(found.command, PLANTED);
});

test("the installed toolchain wins over a binary the project ships", () => {
  assert.equal(locate([PLANTED, ON_PATH]).command, ON_PATH);
  assert.equal(locate([PLANTED, INSTALLED]).command, INSTALLED);
});

test("opting in finds the project's build, walking up from the folder", () => {
  const nested = path.join(PROJECT, "examples", "demo");
  const found = locate([PLANTED, ON_PATH], {
    allowProjectBuild: true,
    workspaceFolders: [nested],
  });
  assert.equal(found.command, PLANTED);
  assert.equal(found.workingDir, PROJECT);
});

test("a relative PATH entry is not searched", () => {
  const relative = path.join(".", "saule-lsp");
  const found = locate([relative, path.join(PROJECT, "saule-lsp")], {
    pathEnv: ".",
    installDir: undefined,
  });
  assert.equal(found.found, false);
});

test("PATH comes before the install directory", () => {
  assert.equal(locate([ON_PATH, INSTALLED]).command, ON_PATH);
});

test("the install directory is the answer when PATH has nothing", () => {
  assert.equal(locate([INSTALLED], { pathEnv: "" }).command, INSTALLED);
});

test("an explicit choice beats everything else", () => {
  const chosen = path.resolve("/opt/saule-lsp");
  assert.equal(
    locate([ON_PATH, chosen], { configuredPath: chosen }).command,
    chosen,
  );
  assert.equal(
    locate([ON_PATH], { fromEnv: chosen, configuredPath: ON_PATH }).command,
    chosen,
  );
});

test("a configured path that does not exist reports as not found", () => {
  const found = locate([ON_PATH], { configuredPath: "/nope/saule-lsp" });
  assert.equal(found.found, false);
});
