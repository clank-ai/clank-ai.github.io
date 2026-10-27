"""Copy Clank's CHANGELOG.md into the site (src/content/changelog.md), its links pointed at the repository on GitHub.

Run it from the site's folder after the changelog changes, with the path of a clone of Clank:
    python scripts/sync-changelog.py ../clank-public
"""

import re
import sys
from pathlib import Path

REPO = "https://github.com/clank-ai/clank/blob/main/"


def main() -> None:
    clone = Path(sys.argv[1] if len(sys.argv) > 1 else "../clank-public")
    text = (clone / "CHANGELOG.md").read_text(encoding="utf-8")
    text = re.sub(r"^# Changelog\n+", "", text)  # the page's own header says it
    text = re.sub(r"\]\((?!https?://|#)([^)]+)\)", lambda m: f"]({REPO}{m.group(1)})", text)
    target = Path("src/content/changelog.md")
    target.write_text(text, encoding="utf-8", newline="\n")
    print(f"wrote {target} from {clone / 'CHANGELOG.md'}")


if __name__ == "__main__":
    main()
