"""Real screenshots of Clank's console: the console itself, connected to the demo's service (its CLANK_HOME), started in
the demo project's folder, each page drawn at a size and saved as Textual's own SVG export, after the keys given.

    uv run --project <a clank checkout> python console-shots.py <out-dir> <name>:<page>:<view>:<cols>x<rows>:<wait>[:<keys>] ...

`keys` are separated by `+` (`f5+tab`); `view` may be empty.
"""

import asyncio
import os
import sys
from pathlib import Path

from clank.client import Client
from clank.console.app import ClankConsole
from clank.console.snapshot import render_text
from clank.kernel.home import Home

FOLDER = os.environ.get("CLANK_DEMO_FOLDER", "C:/ClankDemo/todo-api")  # the demo project, a workspace of the demo home


async def shoot(out: Path, spec: str) -> None:
    name, page, view, size, wait, *rest = spec.split(":")
    cols, rows = (int(part) for part in size.split("x"))
    keys = [key for key in (rest[0].split("+") if rest else []) if key]
    home = Home.resolve()
    client = Client.connect(home)
    app = ClankConsole(client, page=page, view=view, home=home)
    app.folder = FOLDER
    async with app.run_test(size=(cols, rows)) as pilot:
        await pilot.pause(float(wait))
        for _ in range(80):  # until it is connected and has read the folder's session
            shown = render_text(app)
            if "connecting" not in shown.splitlines()[0] and "No session yet" not in shown:
                break
            await pilot.pause(0.5)
        for key in keys:
            await pilot.press(key)
            await pilot.pause(1.2)
        await pilot.pause(0.8)
        (out / f"{name}.svg").write_text(app.export_screenshot(title="clank"), encoding="utf-8")
    client.close()
    print(f"{name}: {page} {view} {cols}x{rows}")


async def main() -> None:
    os.chdir(FOLDER)
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    for spec in sys.argv[2:]:
        await shoot(out, spec)


asyncio.run(main())
