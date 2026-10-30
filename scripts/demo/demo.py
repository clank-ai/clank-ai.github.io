"""The website's demo, driven through Clank's own API (the demo's CLANK_HOME): set a workspace's review mode, start a
session with its first message, read what a session did.

    uv run --project <a clank checkout> python demo.py mode todo-api auto
    uv run --project <a clank checkout> python demo.py start todo-api "title" "message"
    uv run --project <a clank checkout> python demo.py get <route> [key=value ...]
"""

import json
import sys

from clank.client import Client
from clank.kernel.home import Home


def main() -> None:
    home = Home.resolve()
    client = Client.connect(home)
    command, *rest = sys.argv[1:]
    if command == "mode":
        workspace, mode = rest
        found = client.post("agents/review", {"workspace": workspace, "mode": mode})
    elif command == "start":
        workspace, title, text = rest
        found = client.post(f"agents/sessions/{workspace}/start", {"title": title, "text": text})
    elif command == "post":
        route, body = rest
        found = client.post(route, json.loads(body))
    elif command == "get":
        route, *pairs = rest
        found = client.get(route, **dict(pair.split("=", 1) for pair in pairs))
    else:
        raise SystemExit(f"no command {command}")
    print(json.dumps(found, indent=2)[:6000])


if __name__ == "__main__":
    main()
