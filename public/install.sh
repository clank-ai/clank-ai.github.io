#!/bin/sh
# Clank's installer for macOS and Linux (POSIX sh):
#
#   curl -fsSL https://clank-ai.github.io/install.sh | sh
#
# What it does, in order, saying each step:
#   1. uv: uses the one on PATH, or installs it with Astral's official installer (https://astral.sh/uv/install.sh).
#   2. Git: needed to download Clank. If it is missing, says how to get it and offers to run that (asking first).
#   3. Docker: needed for the agent's workspaces (Docker Desktop on macOS, Docker Engine on Linux). If it is
#      missing, says where to get it; it never installs Docker itself.
#   4. Clank: `uv tool install` from https://github.com/clank-ai/clank at its latest release tag, then
#      `uv tool update-shell` so `clank` is on PATH.
#   5. `clank doctor`, which checks this computer and changes nothing.
# Run it again to update Clank to the latest release. It never asks for, reads or stores any key.
#
# Settings, from the environment:
#   CLANK_VERSION=v0.3.0b1    install this tag (or branch, e.g. main) instead of the latest release
#   CLANK_NO_MODIFY_PATH=1    change no PATH: neither uv's installer nor `uv tool update-shell` touch it
#   UV_TOOL_DIR, UV_TOOL_BIN_DIR, UV_INSTALL_DIR    uv's own settings: where Clank and uv are put
#
# Its source: https://github.com/clank-ai/clank-ai.github.io/blob/main/public/install.sh
#
# Everything is inside main, called on the last line, so a download cut short runs nothing.

REPO=https://github.com/clank-ai/clank
GET_STARTED=https://clank-ai.github.io/get-started

say() { printf '%s\n' "$*"; }
step() { printf '\n%s\n' "$*"; }
stop() {
    printf '\nClank was not installed: %s\n' "$*" >&2
    exit 1
}
has() { command -v "$1" >/dev/null 2>&1; }

# A yes-or-no question, answered on the terminal (stdin is this script when it comes through a pipe). The answer is
# no unless the person types y; without a terminal to answer in, it does not ask and the answer is no.
confirm() {
    if ! (: </dev/tty) 2>/dev/null; then
        say "  $1 [y/N] (not asked: no terminal to answer in)"
        return 1
    fi
    printf '  %s [y/N] ' "$1" >/dev/tty
    read -r answer </dev/tty || return 1
    case "$answer" in
        y | Y | yes | YES | Yes) return 0 ;;
        *) return 1 ;;
    esac
}

# Runs a command as root: directly when this is root, else through sudo.
as_root() {
    if [ "$(id -u)" = 0 ]; then
        "$@"
    elif has sudo; then
        sudo "$@"
    else
        return 1
    fi
}

# Where Astral's installer puts uv, in the order it chooses.
find_uv() {
    if has uv; then
        command -v uv
        return 0
    fi
    for dir in "${UV_INSTALL_DIR:-}" "${CARGO_DIST_FORCE_INSTALL_DIR:-}" "${UV_UNMANAGED_INSTALL:-}" \
        "${XDG_BIN_HOME:-}" "${XDG_DATA_HOME:+$XDG_DATA_HOME/../bin}" "$HOME/.local/bin" "${CARGO_HOME:-$HOME/.cargo}/bin"; do
        [ -n "$dir" ] || continue
        for candidate in "$dir/uv" "$dir/bin/uv"; do
            if [ -x "$candidate" ]; then
                say "$candidate"
                return 0
            fi
        done
    done
    return 1
}

# The command that installs Git here, or nothing when it is not known.
git_command() {
    if [ "$OS" = Darwin ]; then
        if has brew; then say "brew install git"; else say "xcode-select --install"; fi
    elif has apt-get; then
        say "apt-get update && apt-get install -y git"
    elif has dnf; then
        say "dnf install -y git"
    elif has yum; then
        say "yum install -y git"
    elif has pacman; then
        say "pacman -S --noconfirm git"
    elif has zypper; then
        say "zypper install -y git"
    elif has apk; then
        say "apk add git"
    fi
}

# The highest release tag (vX.Y.Z, or a pre-release such as vX.Y.ZbN); nothing when there is none.
latest_tag() {
    tags=$(git ls-remote --tags --refs "$REPO") || stop "could not reach $REPO with Git. Check the internet connection and run this again."
    say "$tags" | awk '
        {
            tag = $2
            sub(/^refs\/tags\//, "", tag)
            if (tag !~ /^v[0-9]+\.[0-9]+\.[0-9]+((a|b|rc)[0-9]+)?$/) next
            split(substr(tag, 2), part, ".")
            patch = part[3]; rank = 3; pre = 0
            if (match(patch, /(a|b|rc)/)) {
                kind = substr(patch, RSTART, RLENGTH)
                pre = substr(patch, RSTART + RLENGTH) + 0
                patch = substr(patch, 1, RSTART - 1)
                rank = (kind == "a") ? 0 : ((kind == "b") ? 1 : 2)
            }
            key = sprintf("%06d%06d%06d%d%06d", part[1], part[2], patch, rank, pre)
            if (key > best) { best = key; found = tag }
        }
        END { if (found != "") print found }'
}

clank_version() {
    [ -x "$1" ] && "$1" --version 2>/dev/null
}

main() {
    ORIGINAL_PATH=$PATH
    OS=$(uname -s)
    case "$OS" in
        Linux | Darwin) ;;
        *) stop "this installer is for macOS and Linux; on Windows, in PowerShell: irm https://clank-ai.github.io/install.ps1 | iex" ;;
    esac
    say "Clank installer"
    say "  $OS $(uname -m)"
    say "  Clank on macOS and Linux is an untested beta: it is in daily use on Windows only. On Linux, the agent's"
    say "  container may not reach Clank's gateway yet, so the agent may not reach the model there."
    if [ "${CLANK_NO_MODIFY_PATH:-}" = 1 ]; then
        say "  CLANK_NO_MODIFY_PATH=1: no PATH will be changed"
    fi

    # 1. uv
    step "[1/5] uv (installs Clank and the Python it runs on)"
    if ! uv=$(find_uv); then
        say "  uv is not installed: installing it with Astral's installer (https://docs.astral.sh/uv/)."
        if has curl; then
            fetch="curl -LsSf"
        elif has wget; then
            fetch="wget -qO-"
        else
            stop "neither curl nor wget is installed; install one of them and run this again."
        fi
        if [ "${CLANK_NO_MODIFY_PATH:-}" = 1 ]; then
            $fetch https://astral.sh/uv/install.sh | env UV_NO_MODIFY_PATH=1 sh
        else
            $fetch https://astral.sh/uv/install.sh | sh
        fi
        uv=$(find_uv) || stop "uv could not be installed. Install it yourself (https://docs.astral.sh/uv/getting-started/installation/) and run this again."
    fi
    PATH="$(dirname "$uv"):$PATH"
    export PATH
    say "  found: $("$uv" --version) ($uv)"

    # 2. Git
    step "[2/5] Git (downloads Clank)"
    if ! git --version >/dev/null 2>&1; then
        how=$(git_command)
        say "  Git is not installed. Clank is downloaded with it, so it is needed."
        if [ -n "$how" ] && [ "$how" != "xcode-select --install" ] && confirm "Install Git now ($how)?"; then
            case "$how" in
                brew*) sh -c "$how" ;;
                *) as_root sh -c "$how" || say "  That did not work (it needs root or sudo)." ;;
            esac
        fi
        if ! git --version >/dev/null 2>&1; then
            stop "Git is needed. Install it (${how:-with your system's package manager}) and run this again."
        fi
    fi
    say "  found: $(git --version)"

    # 3. Docker
    if [ "$OS" = Darwin ]; then
        step "[3/5] Docker Desktop (the agent's workspaces)"
    else
        step "[3/5] Docker Engine (the agent's workspaces)"
    fi
    if has docker; then
        say "  found: $(docker --version 2>/dev/null) (clank doctor says whether it is running)"
    else
        say "  Docker is not installed. Clank runs the agent in a Docker container, one per folder, so it is"
        say "  needed before you work in a folder (Clank itself installs without it). Get it:"
        if [ "$OS" = Darwin ]; then
            say "  Docker Desktop: https://www.docker.com/products/docker-desktop/ ; open it once and accept its terms."
        else
            say "  Docker Engine: https://docs.docker.com/engine/install/ , then let your user run it:"
            say "  https://docs.docker.com/engine/install/linux-postinstall/"
        fi
    fi

    # 4. Clank
    step "[4/5] Clank"
    bin=$("$uv" tool dir --bin) || stop "uv did not say where it puts tools (uv tool dir --bin)."
    exe="$bin/clank"
    before=$(clank_version "$exe") || before=
    if [ -n "${CLANK_VERSION:-}" ]; then
        ref=$CLANK_VERSION
        say "  version: $ref (from CLANK_VERSION)"
    else
        ref=$(latest_tag) || exit 1
        if [ -n "$ref" ]; then say "  version: $ref, the latest release"; else say "  version: main (the repository has no release yet)"; fi
    fi
    source="git+$REPO"
    [ -n "$ref" ] && source="$source@$ref"
    [ -n "$before" ] && say "  installed now: $before; replacing it"
    say "  > uv tool install --force --reinstall-package clank --python 3.12 $source"
    "$uv" tool install --force --reinstall-package clank --python 3.12 "$source" || stop "uv could not install Clank (its message is above)."
    after=$(clank_version "$exe") || stop "Clank was installed but $exe does not run."
    if [ "$before" = "$after" ]; then
        say "  installed: $after ($exe), the version it had"
    else
        say "  installed: $after ($exe)"
    fi
    if [ "${CLANK_NO_MODIFY_PATH:-}" = 1 ]; then
        say "  PATH: not changed (CLANK_NO_MODIFY_PATH=1); clank is $exe"
    else
        if ! PATH=$ORIGINAL_PATH "$uv" tool update-shell; then
            say "  uv tool update-shell failed: add $bin to PATH yourself, in your shell's startup file."
            path_failed=1
        fi
    fi

    # 5. clank doctor
    step "[5/5] clank doctor (checks this computer; changes nothing)"
    if ! "$exe" doctor; then
        say "  clank doctor found something to fix (the lines above say what). Clank is installed."
    fi

    step "Next"
    if [ "${CLANK_NO_MODIFY_PATH:-}" = 1 ] || [ -n "${path_failed:-}" ]; then
        say "  1. Put $bin on PATH, or run clank as $exe."
    else
        say "  1. Open a new terminal, so it finds clank."
    fi
    say "  2. Type clank. With no model set up it opens on Add a model: a cloud model with an OpenRouter key,"
    say "     or a model on your own GPU."
    say "  3. Then open a terminal in any project folder and type clank."
    if [ -n "$before" ] && [ "$before" != "$after" ]; then
        say "  Clank was updated from $before. If its service was running, restart it: clank stop,"
        say "  clank serve --background, then clank gateway restart."
    fi
    say "  Get started: $GET_STARTED"
    say "  To update Clank later, run this installer again."
}

main "$@"
