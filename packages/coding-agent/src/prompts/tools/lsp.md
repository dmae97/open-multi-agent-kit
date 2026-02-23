# LSP

Interact with Language Server Protocol servers for code intelligence.

<operations>
- `definition`: Go to symbol definition → file path + position
- `references`: Find all references → list of locations (file + position)
- `hover`: Get type info and documentation → type signature + docs
- `symbols`: List symbols in file, or search workspace (with query, no file) → names, kinds, locations
- `rename`: Rename symbol across codebase → confirmation of changes
- `diagnostics`: Get errors/warnings for file, or check entire project (no file) → list with severity + message
- `reload`: Restart the language server
</operations>

<caution>
- Requires running LSP server for target language
- Some operations require file to be saved to disk
</caution>