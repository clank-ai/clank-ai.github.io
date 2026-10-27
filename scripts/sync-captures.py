"""Copy the recordings the site plays from clank-bench's captures into the site, each checked first.

Run it from anywhere, with the captures folder (by default ../clank-bench/captures, beside the site's folder), then
build:
    python scripts/sync-captures.py [CAPTURES] [phone=SUBFOLDER] [console=SUBFOLDER] [vscode=SUBFOLDER]
    npm run build && npm run check

What it copies, each only when it is there and holds what the pages read:

    flow-trace.json          -> src/data/captures/flow-trace.json         Home: the flow viewer, and the top's flow tab
    flows-vs-opencode.json   -> src/data/captures/flows-vs-opencode.json  Features: Flows against OpenCode alone
    console/frames.json      -> src/data/captures/console/, with each text frame it lists    the top's Console tab
    phone/frames.json        -> src/data/captures/phone/frames.json, its images -> src/assets/captures/phone/
    vscode/frames.json       -> src/data/captures/vscode/frames.json, its images -> src/assets/captures/vscode/

A recording's list may also be named shots.json, and a frame's `t` may be a time of day (ISO 8601) in place of seconds
from the start: the copy says seconds from the first frame. A recording may sit in a subfolder (phone/session/): the
one there is taken, or the one named on the command line (phone=session) when there are several.

A capture with a problem is not copied, and says why. A copied capture replaces the one copied before (its old frames
removed), and its sample is deleted, so no sample ships beside it. Until a capture is copied, the pages show the sample
of the same shape (src/data/sample/, src/assets/sample/) and say "Sample" wherever it shows; the script ends by listing
what is real and what is still a sample.

Standard library only.
"""

import datetime
import json
import shutil
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
DATA = SITE / "src" / "data" / "captures"
ASSETS = SITE / "src" / "assets" / "captures"
SAMPLE_DATA = SITE / "src" / "data" / "sample"
SAMPLE_ASSETS = SITE / "src" / "assets" / "sample"
IMAGES = (".png", ".jpg", ".jpeg", ".webp")
LISTS = ("frames.json", "shots.json")
BOX_TYPES = {"you", "task", "verify", "integrate"}
EVENT_KINDS = {"start", "end", "verdict", "tool", "text"}


class Problem(Exception):
    """What is wrong with a capture, in words."""


def number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def need(found: dict, where: str, fields: dict) -> None:
    """Each field present, of its kind: str, bool, number, list, dict, or a tuple of allowed values."""
    if not isinstance(found, dict):
        raise Problem(f"{where} is not an object")
    for field, kind in fields.items():
        if field not in found:
            raise Problem(f"{where} has no {field!r}")
        value = found[field]
        ok = (value in kind if isinstance(kind, tuple) else number(value) if kind == "number"
              else isinstance(value, {"str": str, "bool": bool, "list": list, "dict": dict}[kind]))
        if not ok:
            raise Problem(f"{where}.{field} is {value!r}, not {kind if isinstance(kind, str) else ' or '.join(map(repr, kind))}")


def check_trace(trace: dict) -> str:
    need(trace, "the trace", {"problem": "dict", "flow": "dict", "events": "list", "result": "dict"})
    need(trace["problem"], "problem", {"bench": "str", "id": "str", "text": "str", "answer": "str"})
    need(trace["flow"], "flow", {"title": "str", "boxes": "list", "lines": "list"})
    boxes = set()
    for index, box in enumerate(trace["flow"]["boxes"]):
        need(box, f"flow.boxes[{index}]", {"id": "str", "type": "str", "title": "str"})
        if box["type"] not in BOX_TYPES:
            print(f"  note: box {box['id']!r} is of type {box['type']!r}, which the viewer draws in a plain color")
        boxes.add(box["id"])
    if not boxes:
        raise Problem("the flow has no boxes")
    for index, line in enumerate(trace["flow"]["lines"]):
        need(line, f"flow.lines[{index}]", {"from": "str", "to": "str", "when": ("pass", "fail", None)})
        for end in ("from", "to"):
            if line[end] not in boxes:
                raise Problem(f"flow.lines[{index}].{end} is {line[end]!r}, no box of the flow")
    if not trace["events"]:
        raise Problem("the trace has no events")
    last = -1.0
    for index, event in enumerate(trace["events"]):
        need(event, f"events[{index}]", {"t": "number", "box": "str", "try": "number", "kind": tuple(EVENT_KINDS),
                                         "text": "str", "verdict": ("pass", "fail", None)})
        if event["box"] not in boxes:
            raise Problem(f"events[{index}].box is {event['box']!r}, no box of the flow")
        if event["t"] < last:
            raise Problem(f"events[{index}] comes before the event above it (t {event['t']} < {last})")
        last = event["t"]
        if any(ord(c) < 32 and c not in "\n\t" for c in event["text"]):
            print(f"  note: events[{index}].text holds a control character: a LaTeX backslash (\\b, \\f, \\t) "
                  "written into the JSON unescaped?")
    need(trace["result"], "result", {"answer": "str", "correct": "bool", "minutes": "number", "tokens": "number",
                                     "sessions": "number"})
    return f"{trace['problem']['bench']} {trace['problem']['id']}: {len(trace['events'])} events, " \
           f"{'right' if trace['result']['correct'] else 'wrong'}"


def check_comparison(found: dict) -> str:
    need(found, "the results", {"bench": "str", "model": "str", "rows": "list", "summary": "dict"})
    if not found["rows"]:
        raise Problem("the results have no rows")
    for index, row in enumerate(found["rows"]):
        need(row, f"rows[{index}]", {"id": "str", "opencode": "dict", "flow": "dict"})
        need(row["opencode"], f"rows[{index}].opencode", {"correct": "bool", "minutes": "number", "tokens": "number"})
        need(row["flow"], f"rows[{index}].flow", {"correct": "bool", "minutes": "number", "tokens": "number",
                                                   "tries": "number"})
    for side in ("opencode", "flow"):
        need(found["summary"], "summary", {side: "dict"})
        need(found["summary"][side], f"summary.{side}", {"right": "number", "n": "number", "minutes": "number"})
    s = found["summary"]
    return f"{found['bench']}, {len(found['rows'])} problems: flow {s['flow']['right']}/{s['flow']['n']}, " \
           f"OpenCode alone {s['opencode']['right']}/{s['opencode']['n']}"


def listing(folder: Path) -> Path | None:
    """A recording's list of frames in this folder: frames.json, else shots.json."""
    return next((folder / name for name in LISTS if (folder / name).is_file()), None)


def recording(source: Path, kind: str, chosen: dict[str, str]) -> Path | None:
    """The folder of a kind's recording: the one named on the command line, the kind's own folder when it holds a list,
    else its one subfolder that does. None when there is none."""
    top = source / kind
    if kind in chosen:
        folder = top / chosen[kind]
        if not listing(folder):
            raise Problem(f"{kind}/{chosen[kind]} holds no {' or '.join(LISTS)}")
        return folder
    if listing(top):
        return top
    inside = sorted(sub for sub in top.iterdir() if sub.is_dir() and listing(sub)) if top.is_dir() else []
    if len(inside) == 1:
        return inside[0]
    if len(inside) > 1:
        names = ", ".join(sub.name for sub in inside)
        raise Problem(f"several recordings ({names}): name one, as {kind}={inside[0].name}")
    return None


def seconds(value: object, first: datetime.datetime | None) -> tuple[float, datetime.datetime | None]:
    """A frame's time as seconds from the start: a number as it is, a time of day from the first frame's."""
    if number(value):
        return float(value), first
    if isinstance(value, str):
        try:
            when = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as error:
            raise Problem(f"a frame's t is {value!r}: neither seconds nor a time of day") from error
        first = first or when
        return round((when - first).total_seconds(), 1), first
    raise Problem(f"a frame's t is {value!r}: neither seconds nor a time of day")


def check_frames(folder: Path, kinds: tuple[str, ...]) -> list[dict]:
    """The recording's frames, checked, each {file, t, caption} with t in seconds from the start."""
    listed = listing(folder)
    frames = json.loads(listed.read_text(encoding="utf-8")) if listed else None
    if not isinstance(frames, list) or not frames:
        raise Problem(f"{listed.name if listed else 'frames.json'} is not a list of frames")
    out, first, last = [], None, -1.0
    for index, frame in enumerate(frames):
        need(frame, f"frames[{index}]", {"file": "str", "caption": "str"})
        if "t" not in frame:
            raise Problem(f"frames[{index}] has no 't'")
        t, first = seconds(frame["t"], first)
        name = frame["file"]
        if "/" in name or "\\" in name or not (folder / name).is_file():
            raise Problem(f"frames[{index}].file {name!r} is not a file beside {listed.name}")
        if kinds and not name.lower().endswith(kinds):
            raise Problem(f"frames[{index}].file {name!r} is not one of {', '.join(kinds)}")
        if t < last:
            raise Problem(f"frames[{index}] comes before the frame above it (t {t} < {last})")
        last = t
        out.append({"file": name, "t": t, "caption": frame["caption"]})
    return out


def replace(folder: Path) -> None:
    """An empty folder for a capture: the one copied before goes first."""
    if folder.exists():
        shutil.rmtree(folder)
    folder.mkdir(parents=True)


def write_frames(target: Path, frames: list[dict]) -> None:
    target.write_text(json.dumps(frames, indent=1, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")


def copy_json(source: Path, name: str, check) -> str:
    found = json.loads((source / name).read_text(encoding="utf-8"))
    said = check(found)
    DATA.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source / name, DATA / name)
    return said


def copy_console(folder: Path) -> str:
    frames = check_frames(folder, ())
    for frame in frames:  # plain text, one frame of `clank console --snapshot`
        (folder / frame["file"]).read_text(encoding="utf-8")
    replace(DATA / "console")
    write_frames(DATA / "console" / "frames.json", frames)
    for frame in frames:
        shutil.copyfile(folder / frame["file"], DATA / "console" / frame["file"])
    return f"{len(frames)} frames from {folder.name}/"


def copy_images(folder: Path, name: str) -> str:
    frames = check_frames(folder, IMAGES)
    replace(DATA / name)
    replace(ASSETS / name)
    write_frames(DATA / name / "frames.json", frames)
    for frame in frames:
        shutil.copyfile(folder / frame["file"], ASSETS / name / frame["file"])
    return f"{len(frames)} frames from {folder.name}/"


def drop_sample(name: str) -> None:
    """The sample a real capture replaces, deleted: its data, and its images if it has any."""
    for path in (SAMPLE_DATA / f"{name}.json", SAMPLE_DATA / name, SAMPLE_ASSETS / name):
        if path.is_dir():
            shutil.rmtree(path)
        elif path.is_file():
            path.unlink()
    for folder in (SAMPLE_DATA, SAMPLE_ASSETS):
        if folder.is_dir() and not any(folder.iterdir()):
            folder.rmdir()


def real(name: str) -> bool:
    """Whether the site holds a real copy of this capture now."""
    return (DATA / (f"{name}.json" if name.startswith("flow") else f"{name}/frames.json")).is_file()


NAMES = ("flow-trace", "flows-vs-opencode", "console", "phone", "vscode")


def main() -> int:
    paths = [arg for arg in sys.argv[1:] if "=" not in arg]
    chosen = dict(arg.split("=", 1) for arg in sys.argv[1:] if "=" in arg)
    source = (Path(paths[0]) if paths else SITE.parent / "clank-bench" / "captures").resolve()
    print(f"captures: {source}")
    failed = 0
    for name in NAMES:
        try:
            if name.startswith("flow"):
                file = f"{name}.json"
                if not (source / file).is_file():
                    print(f"  {name}: not there ({file})")
                    continue
                said = copy_json(source, file, check_trace if name == "flow-trace" else check_comparison)
            else:
                folder = recording(source, name, chosen)
                if folder is None:
                    print(f"  {name}: not there ({name}/frames.json)")
                    continue
                said = copy_console(folder) if name == "console" else copy_images(folder, name)
            print(f"  {name}: copied, {said}")
            drop_sample(name)
        except (Problem, json.JSONDecodeError, UnicodeDecodeError, OSError) as error:
            failed += 1
            print(f"  {name}: NOT copied: {error}")
    print("the site now shows:")
    for name in NAMES:
        print(f"  {name:18} {'real' if real(name) else 'SAMPLE (marked on the page)'}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
