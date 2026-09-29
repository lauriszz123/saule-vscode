# Saule for VS Code

Full language support for `.sau` files: a TextMate grammar for syntax
highlighting **plus** a Language Server Protocol client that talks to
`saule-lsp`, the language server of the
[Saule](https://github.com/lauriszz123/saule) programming language.

## Features

Powered by the `saule-lsp` server:

- **Diagnostics** — lex, parse, semantic, and type errors, live on every
  edit.
- **Hover** — types and signatures for locals, functions, methods,
  classes, enums, and stdlib/native members (with generic substitution,
  so `Table.remove(table<integer>)` shows `integer?`).
- **Go-to-definition** and **find-all-references**.
- **Document highlights** and **document symbols** (outline / breadcrumbs).
- **Inlay hints** — inferred local types and parameter-name labels.
- **Signature help** — parameter popups while typing call arguments, and
  whenever the caret moves back inside a call's parens.
- **Formatting** — full-document and range formatting.

Provided by the extension itself, so they work with or without the server:

- **Indentation while typing** — Enter indents the new line, and block-closing
  keywords dedent as you finish them: `end`, `until`, `else`, `elseif`,
  `catch` and `case` snap to the right level. Saule closes blocks with words
  rather than braces, so there is no `}` for the usual dedent to hook onto.
  Driven by `editor.formatOnType`, which this extension turns on for `.sau`
  files (along with two-space indentation, matching `saule fmt`).
- **Run commands** — run the current file or the whole project in a terminal.

## Install the toolchain (one time)

The extension needs the `saule-lsp` binary. The installer puts it, and the
`saule` CLI, in `~/.saule/bin` (`%USERPROFILE%\.saule\bin`) and adds that to
your `PATH`:

```powershell
irm https://lauriszz123.github.io/saule/install.ps1 | iex
```

```sh
curl -fsSL https://lauriszz123.github.io/saule/install.sh | sh
```

The extension discovers the binaries in the same order as the IntelliJ plugin,
so both pick the same build in the same project:

1. `SAULE_LSP_PATH` / `SAULE_PATH` environment variables.
2. `saule.server.path` / `saule.cli.path`, or `saule.toolchainDir`.
3. Cargo build output, walking **up** from each workspace folder looking for
   `target/release` then `target/debug`. Walking up is what lets you open a
   sub-folder (say `examples/todo-app`) and still find the workspace-root build
   output — and the directory holding that `target/` becomes the server's
   working directory.
4. `saule-lsp` / `saule` on your `PATH` — where the installer puts them.

No `PATH` setup is needed when you work inside a built checkout of the
[language repository](https://github.com/lauriszz123/saule); step 3 finds
`target/release/saule-lsp` on its own.

## Build and install the extension

```powershell
git clone https://github.com/lauriszz123/saule-vscode.git
cd saule-vscode
npm install
npm run compile

# then either press F5 / "Run Extension" from Run & Debug,
# or package and install:
npm install -g @vscode/vsce
vsce package
code --install-extension saule-<version>.vsix
```

For zero-build syntax-only dev, copy this folder into
`%USERPROFILE%\.vscode\extensions\saule\` and reload — but the LSP
features need the compiled `out/extension.js` (`npm run compile`).

## Settings

| Setting | Default | Purpose |
| --- | --- | --- |
| `saule.server.path` | `""` | Absolute path to `saule-lsp`. Empty = auto-detect. |
| `saule.cli.path` | `""` | Absolute path to `saule`, used by the run commands. Empty = auto-detect. |
| `saule.toolchainDir` | `""` | Directory holding both binaries, used when no explicit path is set. |
| `saule.server.extraArgs` | `[]` | Extra CLI args for the server. |
| `saule.trace.server` | `"off"` | LSP message tracing (`off` / `messages` / `verbose`). |

The extension also sets `editor.tabSize: 2`, `editor.insertSpaces: true`,
`editor.formatOnType: true` and `editor.wordBasedSuggestions: "off"` for
`[saule]` files. The last one leaves completion to `saule-lsp`: VS Code's
word-based provider otherwise scrapes identifiers out of the open document
and offers them everywhere, including the declaration positions where the
server deliberately stays quiet — so naming a new `fn` suggested every
similar-looking word already in the file. These are defaults — your own
settings still win.

## Commands

- **Saule: Run File** — `saule run <file>` on the active buffer, saving it
  first. Also on the editor context menu.
- **Saule: Run Project** — `saule run` from the workspace root.
- **Saule: Restart Language Server** — relaunch the server (e.g. after a
  fresh `cargo build`).
- **Saule: Show Language Server Output** — open the server's output
  channel for logs and traces.

## Editor parity

`src/indent.ts` is a port of the IntelliJ plugin's `SauleIndentModel` and
shares its test corpus with the Neovim plugin's `lua/saule/indent.lua`. All
three are derived from the printer in `crates/saule-fmt/src/lib.rs` in the
language repository. The three clients live in separate repositories now, so
changing one is a change to all three: update
[saule-intellij](https://github.com/lauriszz123/saule-intellij) and
[saule-nvim](https://github.com/lauriszz123/saule-nvim) alongside it and
re-run every suite.

```powershell
npm test
```

## Syntax highlighting

`syntaxes/saule.tmLanguage.json` is a **copy**. The grammar is written once, in
the language repository at `grammar/saule.tmLanguage.json`, next to the lexer
it has to agree with, and is read from there by the documentation site as
well. A .vsix has to carry the file it ships, so this repository keeps a copy
and refreshes it after an upstream change:

```powershell
npm run sync:grammar              # from github.com/lauriszz123/saule
npm run sync:grammar -- ../saule  # from a local checkout
```

Colours come from the user's active theme via these scopes:
`keyword.control`, `keyword.declaration`, `entity.name.type`,
`entity.name.function`, `string.quoted.double`, `comment.line`,
`constant.numeric`, `constant.language`, `variable.language`.

## License

MIT — see [LICENSE](LICENSE).
