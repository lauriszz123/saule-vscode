# Changelog

## 26.20

### Security

- A project's own `target/debug/saule-lsp` is no longer run just because the project was opened. The installed toolchain is used instead, and running a project's build is now an opt-in setting.
- Relative `PATH` entries are no longer searched.

### Added

- `~/.saule/bin` is searched after `PATH`, so an editor started from a launcher finds the toolchain without any setup.
- Highlighting and indentation for `finally`, and highlighting for `byte` and `bytes`.

### Changed

- The path settings and `saule.server.extraArgs` can only be set in User settings, not by a project.
- The extension is disabled in untrusted workspaces.
- A bracket level indents by one level, in spaces or tabs, matching `saule fmt`.

## Releasing

Release the Saule toolchain first, then push a `v<version>` tag here. The tag runs CI, which publishes to the Marketplace and Open VSX using the `VSCE_PAT` and `OVSX_PAT` repository secrets.
