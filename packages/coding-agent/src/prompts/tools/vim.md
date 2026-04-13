Stateful single-buffer Vim-style editor.

Use this for surgical text edits when motions and compact viewport feedback are more efficient than rewriting full regions.

Actions:
- `open`: open a filesystem text file in the in-process Vim buffer
- `kbd`: execute Vim key sequences against the active buffer, optionally followed by raw text insertion

Rules:
- One active buffer only
- Edits auto-save to disk after each `kbd` call (unless `pause: true`)
- `kbd` items are executed sequentially, but non-final items must finish stable navigation state; if one leaves INSERT/command/search pending, combine the keys into one string instead of splitting them across array entries
- `insert` is literal text, not Vim key syntax; use it after `kbd` leaves the buffer in `INSERT` mode
- `pause: true` keeps the current mode active and returns an intermediate snapshot
- Output uses a cursor-focused hybrid snapshot with an explicit caret line, visible tab markers, and a surrounding viewport
- Use `:e` or `:e!` to reload from disk
- Opening a new file auto-saves and replaces the current buffer

Supported subset includes common motions, insert mode, visual mode, search, undo/redo with counts like `5u`, repeat-last-change, and core ex commands like `:e`, `:e!`, `:s`, `:%s`, and ranged delete.

Examples:
- `{"open":"src/app.ts"}`
- `{"kbd":["42G", "ciwnewName<Esc>"]}`
- `{"kbd":["1014G", "cc"], "insert":"// comment\nconst x = 1;\n"}`
- `{"kbd":["1014G", "O"], "pause":true}`
- `{"kbd":[], "insert":"\treturn value;\n", "pause":true}`
- `{"kbd":[":%s/oldName/newName/g<CR>"]}`
- `{"kbd":["/TODO<CR>", "n", "dd"]}`
