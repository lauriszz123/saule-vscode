// Refreshes `syntaxes/saule.tmLanguage.json` from the language repository.
//
// The TextMate grammar is written once and read in three places: this
// extension, the documentation site (which highlights every code block with
// it), and anyone else who wants Saule colouring. Its canonical copy lives in
// the language repository at `grammar/saule.tmLanguage.json`, next to the
// lexer it has to agree with; what sits in `syntaxes/` here is a copy, because
// a .vsix has to carry the file it ships.
//
//   npm run sync:grammar                    # from github.com/lauriszz123/saule
//   npm run sync:grammar -- ../saule        # from a local checkout
//
// Run it after a grammar change lands upstream, and commit the result.

import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const REPO_PATH = 'grammar/saule.tmLanguage.json';
const REMOTE = `https://raw.githubusercontent.com/lauriszz123/saule/main/${REPO_PATH}`;

const dest = new URL('../syntaxes/saule.tmLanguage.json', import.meta.url);
const checkout = process.argv[2];

if (checkout) {
  const src = resolve(checkout, REPO_PATH);
  await copyFile(src, dest);
  console.log(`grammar <- ${src}`);
} else {
  const response = await fetch(REMOTE);
  if (!response.ok) {
    throw new Error(`${REMOTE}: ${response.status} ${response.statusText}`);
  }
  const body = await response.text();
  // Parse before writing: a 200 carrying an error page would otherwise land in
  // the packaged extension and break highlighting silently.
  JSON.parse(body);
  await writeFile(dest, body);
  console.log(`grammar <- ${REMOTE}`);
}

const shipped = JSON.parse(await readFile(dest, 'utf8'));
console.log(`  scopeName: ${shipped.scopeName}, ${shipped.patterns.length} top-level patterns`);
