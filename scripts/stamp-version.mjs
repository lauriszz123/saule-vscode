#!/usr/bin/env node
// Write a resolved toolchain version into this extension's manifests.
//
//   npm run stamp -- 26.8              # write
//   npm run stamp -- 26.8 --check      # verify, change nothing
//
// The Marketplace reads `package.json` long before any Saule code runs, so the
// version there cannot be resolved at build time the way the Rust crates
// resolve theirs — it has to be written down. This script is the one place
// that writes it.
//
// Versions are `<year>.<build>`, e.g. 26.8. VS Code validates the manifest as
// strict semver, so it gets `<year>.<build>.0`; the trailing `.0` is a
// placeholder that never carries meaning.
//
// `--check` is what CI runs on a pull request: it turns "somebody bumped the
// manifest and forgot the lockfile" into a failed job instead of an `npm ci`
// that refuses to install.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [version, mode = 'write'] = process.argv.slice(2);
const check = mode === '--check';

if (!version || !/^\d+\.\d+$/.test(version)) {
  console.error(`usage: stamp-version.mjs <year>.<build> [--check]  (got ${version ?? 'nothing'})`);
  process.exit(2);
}

const semver = `${version}.0`;
let failed = false;

// `package.json` is hand-formatted — it keeps short arrays and objects on one
// line, which a JSON round-trip would expand into forty lines of noise — so
// its single top-level `"version"` is edited textually. The two-space indent
// anchors it to the document root; a nested `"version"` would sit deeper.
{
  const file = 'package.json';
  const path = join(root, file);
  const text = readFileSync(path, 'utf8');
  const pattern = /(\r?\n {2}"version": ")[0-9][^"]*(")/;

  if (!pattern.test(text)) {
    console.error(`error: ${file} has no top-level "version" to stamp`);
    failed = true;
  } else {
    const stamped = text.replace(pattern, `$1${semver}$2`);
    if (check) {
      if (stamped === text) {
        console.log(`  ok      ${file} (extension version)`);
      } else {
        console.error(`  STALE   ${file} (extension version) — expected ${semver}`);
        failed = true;
      }
    } else if (stamped === text) {
      console.log(`  ok      ${file} (already ${semver})`);
    } else {
      writeFileSync(path, stamped, 'utf8');
      console.log(`  stamped ${file} (extension version)`);
    }
  }
}

// The lockfile needs real JSON editing: it pins a `"version"` for every
// dependency, so a textual substitution would rewrite all of them. npm keeps
// this package's version in two places and `npm ci` fails if either disagrees
// with package.json — the document root, and the `""` entry under `packages`
// that stands for the root package itself.
{
  const file = 'package-lock.json';
  const path = join(root, file);
  const paths = [['version'], ['packages', '', 'version']];
  let text;

  try {
    text = readFileSync(path, 'utf8');
  } catch {
    console.error(`error: ${file} not found`);
    failed = true;
    text = null;
  }

  if (text !== null) {
    const doc = JSON.parse(text);
    const stale = [];

    for (const keys of paths) {
      const parent = keys.slice(0, -1).reduce((node, key) => node?.[key], doc);
      const leaf = keys[keys.length - 1];
      if (parent === undefined || parent === null || !(leaf in parent)) {
        console.error(`error: ${file} has no ${keys.join('.')} to stamp`);
        failed = true;
        continue;
      }
      if (parent[leaf] !== semver) {
        stale.push(`${keys.join('.')} = ${parent[leaf]}`);
        parent[leaf] = semver;
      }
    }

    if (check) {
      if (stale.length === 0) {
        console.log(`  ok      ${file} (npm version)`);
      } else {
        console.error(`  STALE   ${file} — ${stale.join(', ')}, expected ${semver}`);
        failed = true;
      }
    } else if (stale.length === 0) {
      console.log(`  ok      ${file} (already ${semver})`);
    } else {
      // Reserialise in the file's own style, so the diff is the two version
      // lines and nothing else. npm's own two-space indent is a safe default,
      // but the line endings have to be read off the file being replaced —
      // this one is committed with CRLF, and normalising it to LF would turn a
      // version bump into a whole-file rewrite.
      const newline = text.includes('\r\n') ? '\r\n' : '\n';
      const serialised = JSON.stringify(doc, null, 2).replace(/\n/g, newline);
      writeFileSync(path, serialised + newline, 'utf8');
      console.log(`  stamped ${file} (npm version)`);
    }
  }
}

if (failed && check) {
  console.error(`\nRun: npm run stamp -- ${version}`);
}

process.exit(failed ? 1 : 0);
