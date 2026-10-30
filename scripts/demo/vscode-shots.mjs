// VS Code in the browser (`code serve-web`), driven over the DevTools protocol for real screenshots: open the page,
// wait for the workbench, run the steps given, and save a PNG after each `shot`.
//
//   node vscode_shot.mjs <url> <out-dir> <width>x<height>@<scale> <step> ...
//
// Steps: `wait:<ms>`, `keys:<combo>` (e.g. ctrl+shift+p, enter, escape), `type:<text>`, `click:<css selector>`,
// `clicktext:<text>` (the first button or link whose text is exactly this), `shot:<name>`, `cmd:<command palette text>`.

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as wait } from "node:timers/promises";

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9335;
const [url, out, size, ...steps] = process.argv.slice(2);
const [dims, scaleText] = size.split("@");
const [width, height] = dims.split("x").map(Number);
const scale = Number(scaleText || 1);
mkdirSync(out, { recursive: true });

const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${resolve(out, ".profile")}`,
  "--no-first-run", "--disable-extensions", "--hide-scrollbars", "--force-color-profile=srgb",
  `--window-size=${width},${height}`, "about:blank",
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
  return new Promise((done, fail) => waiting.set(id, (d) => (d.error ? fail(new Error(`${method}: ${d.error.message}`)) : done(d.result))));
};
const evaluate = async (expression) =>
  (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;

const KEYS = {
  enter: { key: "Enter", code: "Enter", keyCode: 13 }, escape: { key: "Escape", code: "Escape", keyCode: 27 },
  tab: { key: "Tab", code: "Tab", keyCode: 9 }, down: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
};
async function press(combo) {
  const parts = combo.toLowerCase().split("+");
  const main = parts.pop();
  const modifiers = (parts.includes("alt") ? 1 : 0) | (parts.includes("ctrl") ? 2 : 0) | (parts.includes("meta") ? 4 : 0)
    | (parts.includes("shift") ? 8 : 0);
  const known = KEYS[main] || { key: main.length === 1 ? (parts.includes("shift") ? main.toUpperCase() : main) : main,
    code: main.length === 1 ? `Key${main.toUpperCase()}` : main, keyCode: main.length === 1 ? main.toUpperCase().charCodeAt(0) : 0 };
  const base = { modifiers, key: known.key, code: known.code, windowsVirtualKeyCode: known.keyCode };
  await send("Input.dispatchKeyEvent", { type: "keyDown", ...base });
  await send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
}

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: false });
await send("Page.navigate", { url });
for (const step of steps) {
  const [kind, ...rest] = step.split(":");
  const arg = rest.join(":");
  if (kind === "wait") await wait(Number(arg));
  else if (kind === "keys") { await press(arg); await wait(400); }
  else if (kind === "type") { await send("Input.insertText", { text: arg }); await wait(400); }
  else if (kind === "cmd") {
    await press("ctrl+shift+p"); await wait(700);
    await send("Input.insertText", { text: arg }); await wait(900);
    await press("enter"); await wait(1500);
  } else if (kind === "click" || kind === "clicktext") {
    const found = await evaluate(`(() => {
      const el = ${kind === "click" ? `document.querySelector(${JSON.stringify(arg)})`
        : `[...document.querySelectorAll('a, button, .monaco-button, .action-label')].find((e) => e.textContent.trim() === ${JSON.stringify(arg)})`};
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2];
    })()`);
    if (found) {
      for (const type of ["mousePressed", "mouseReleased"]) {
        await send("Input.dispatchMouseEvent", { type, x: found[0], y: found[1], button: "left", clickCount: 1 });
      }
      await wait(800);
    }
    console.log(`${kind} ${arg}: ${found ? "clicked" : "not found"}`);
  } else if (kind === "shot") {
    const shot = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(out, `${arg}.png`), Buffer.from(shot.data, "base64"));
    console.log(`shot ${arg}`);
  }
}
socket.close();
chrome.kill();
