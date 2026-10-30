# The demo's screenshots

Home's VS Code and Console tabs and the Features page's screenshots are real: Clank itself, captured while it worked,
never drawn. They come from a demo session (2026-10-29, Clank 0.3.0b5): a Clank of its own (its own `CLANK_HOME` and
ports, so it never touches another Clank on the computer), the model on the computer's GPU (frontier 262K lean), and a
small project, `todo-api` (a to-do API on Python's standard library, with its tests), given one task in plain words:
add rate limiting, with tests. Nothing in them is personal: the demo's names only.

How they were made, to make them again:

1. **A Clank of its own.** A new `CLANK_HOME` whose `config/` moves every port (`service.json` 7820, `gateway.json`
   18310 and 18311, `runtime.json` 18300 and up, `remote.json` 7821), the host and the engine added (`clank host
   add`, `clank engine adopt`), a model loaded (`clank model load`), and the project opened (`clank workspace open`).
2. **The task.** `demo.py start todo-api "<title>" "<the task>"` starts a session through Clank's API, as the agent
   panel does; `demo.py mode todo-api auto` lets it go on without asking; `demo.py get agents/sessions
   workspace=todo-api` shows a permission waiting.
3. **The console.** `console-shots.py <out> <name>:<page>:<view>:<cols>x<rows>:<wait>` runs Clank's console against
   that service, waits until it has read the session, and saves Textual's own SVG of each page.
4. **VS Code.** `code serve-web` on the project (Clank's extension installed with the server's own
   `code-server --install-extension`, `CLANK_HOME` in its environment), then `vscode-shots.mjs <url> <out>
   1440x900@2 <steps>` drives it in headless Chrome and saves PNGs.
5. **Pixels.** `raster.mjs <mono font> <cells font> 2 <out> <svg>...` draws each SVG at twice its size in the site's
   own fonts (`src/fonts/clank-cells-700.woff2` for the boxes), so every cell lines up as the terminal draws it.

The frames, their times and their captions (and, for a phone, the part of each frame worth reading, `focus`) are in
`src/data/captures/demo-vscode/` and `demo-console/`; the images in `src/assets/captures/` under the same names.
`scripts/sync-captures.py` does not manage these two folders.
