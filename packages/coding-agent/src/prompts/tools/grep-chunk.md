Searches files using regex and annotates each match with its containing chunk path.

<instruction>
- Output lines look like `src/server.ts:class_Server.fn_handleError  ln:220  |  private handleError(…)`.
- Use the reported chunk path with `read(path="src/server.ts", sel="class_Server.fn_handleError")` for full context.
- Regex syntax, globs, file types, and `.gitignore` handling are the same as normal grep mode.
- Output format: `path:chunk_path  ln:N  |  content` — the chunk path uniquely identifies a location within the file and can be used directly in subsequent read calls.
- Chunk paths work across JS/TS/TSX, Python, Rust, and Go files.
</instruction>

<critical>
- You **MUST** use `grep` instead of shelling out to `rg` or `grep`.
- After grep finds a relevant hit, follow up with `read` on the chunk path instead of widening grep repeatedly.
</critical>
