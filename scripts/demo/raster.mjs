// SVG screenshots (Textual's, Rich's) rasterized to PNG by headless Chrome at a device scale, in the website's own
// monospace font (JetBrains Mono, served beside the page), so every cell lines up as the terminal draws it.
//
//   node raster.mjs <font.woff2> <scale> <out-dir> <file.svg> ...

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { setTimeout as wait } from "node:timers/promises";

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9400 + Math.floor(Math.random() * 400);
const [font, cellsFont, scaleText, out, ...files] = process.argv.slice(2);
const scale = +scaleText;
mkdirSync(out, { recursive: true });

let current = "";
const server = createServer((request, response) => {
  if (request.url === "/font.woff2" || request.url === "/cells.woff2") {
    response.writeHead(200, { "content-type": "font/woff2" });
    response.end(readFileSync(request.url === "/font.woff2" ? font : cellsFont));
    return;
  }
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(current);
}).listen(0, "127.0.0.1");
const SERVE = () => server.address().port;

const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${resolve(out, ".profile-" + process.pid)}`,
  "--no-first-run", "--disable-extensions", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank",
], { stdio: "ignore" });

async function target() {
  for (let tries = 0; tries < 150; tries++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((each) => each.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await wait(200);
  }
  throw new Error("Chrome did not start");
}
const socket = new WebSocket(await target());
await new Promise((done) => socket.addEventListener("open", done, { once: true }));
let next = 0;
const waiting = new Map();
socket.addEventListener("message", (message) => {
  const data = JSON.parse(message.data);
  if (data.id && waiting.has(data.id)) { waiting.get(data.id)(data); waiting.delete(data.id); }
});
const send = (method, params = {}) => {
  const id = ++next;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((done, fail) => waiting.set(id, (d) => (d.error ? fail(new Error(d.error.message)) : done(d.result))));
};
await send("Page.enable");

for (const file of files) {
  const svg = readFileSync(file, "utf-8")
    // Textual and Rich name their fonts; the website's own mono font is used in their place, loaded beside the page.
    .replace(/font-family:[^;"]*;/g, "font-family: 'Clank Cells', 'Clank Mono', monospace;");
  current = `<!doctype html><meta charset="utf-8"><style>
    @font-face { font-family: 'Clank Mono'; src: url(/font.woff2) format('woff2'); font-weight: 100 800; }
    @font-face { font-family: 'Clank Cells'; src: url(/cells.woff2) format('woff2'); font-weight: 100 900;
      unicode-range: U+2190-21FF, U+2300-23FF, U+2500-25FF, U+2700-27FF; }
    html, body { margin: 0; background: transparent; } svg { display: block; }
  </style>${svg}`;
  await send("Page.navigate", { url: `http://127.0.0.1:${SERVE()}/${basename(file)}` });
  await wait(300);
  await send("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
  await wait(300);
  const box = (await send("Runtime.evaluate", {
    expression: "(() => { const r = document.querySelector('svg').getBoundingClientRect(); return [r.width, r.height]; })()",
    returnByValue: true,
  })).result.value;
  await send("Emulation.setDeviceMetricsOverride", { width: Math.ceil(box[0]), height: Math.ceil(box[1]), deviceScaleFactor: scale, mobile: false });
  await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  await wait(200);
  const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: Math.ceil(box[0]), height: Math.ceil(box[1]), scale: 1 } });
  const target = join(out, basename(file).replace(/\.svg$/, ".png"));
  writeFileSync(target, Buffer.from(shot.data, "base64"));
  console.log(`${target}: ${Math.ceil(box[0])}x${Math.ceil(box[1])} at ${scale}x`);
}
socket.close();
server.close();
chrome.kill();
