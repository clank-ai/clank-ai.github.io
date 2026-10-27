#!/bin/sh
# Clank's installer for macOS and Linux (POSIX sh):
#
#   curl -fsSL https://clank-ai.github.io/install.sh | sh
#
# What it does, in order, saying each step:
#   1. uv: uses the one on PATH, or installs it with Astral's official installer (https://astral.sh/uv/install.sh).
#   2. Git: needed to download Clank. If it is missing, says how to get it and offers to run that (asking first).
#   3. Docker: needed for the agent's workspaces. Linux: Docker Engine from Docker's own packages (apt on Ubuntu,
#      Debian and their kin, dnf on Fedora and the RHEL family, pacman on Arch), shown and asked first, then started
#      now and at each boot and this account added to the docker group, each asked first. macOS: Docker Desktop with
#      Homebrew, asked first, then opened once for its terms.
#   4. Clank: `uv tool install` from https://github.com/clank-ai/clank at its latest release tag, then
#      `uv tool update-shell` so `clank` is on PATH.
#   5. `clank setup --check` (or `clank doctor` in an older Clank): what is set up and what is next.
# Run it again to update Clank to the latest release. It never asks for, reads or stores any key.
#
# Settings, from the environment:
#   CLANK_VERSION=v0.3.0b1    install this tag (or branch, e.g. main) instead of the latest release
#   CLANK_NO_MODIFY_PATH=1    change no PATH: neither uv's installer nor `uv tool update-shell` touch it
#   CLANK_YES=1               answer yes to every question (for a script); the commands are still shown
#   CLANK_DRY_RUN=1           show every command that would change this computer, and run none of them
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
# no unless the person types y; without a terminal to answer in, it does not ask and the answer is no. CLANK_YES=1
# answers yes, for a script; so does CLANK_DRY_RUN=1, which then runs nothing.
confirm() {
    if [ "${CLANK_YES:-}" = 1 ] || [ "${CLANK_DRY_RUN:-}" = 1 ]; then
        say "  $1 [y/N] y (CLANK_YES or CLANK_DRY_RUN)"
        return 0
    fi
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

# Runs a command as root: directly when this is root, else through sudo. With CLANK_DRY_RUN=1 it says the command and
# runs nothing.
as_root() {
    if [ "${CLANK_DRY_RUN:-}" = 1 ]; then
        say "  (dry run) as root: $*"
        return 0
    fi
    if [ "$(id -u)" = 0 ]; then
        "$@"
    elif has sudo; then
        sudo "$@"
    else
        say "  This needs root, and sudo is not installed: run it as root yourself: $*"
        return 1
    fi
}

# Runs a command as this account, saying it first; with CLANK_DRY_RUN=1 it says the command and runs nothing.
run() {
    say "  > $*"
    [ "${CLANK_DRY_RUN:-}" = 1 ] && return 0
    "$@"
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

# Linux: which of Docker's packages fit this distribution (https://docs.docker.com/engine/install/), from
# /etc/os-release. Sets DOCKER_FAMILY (apt, dnf or pacman), DOCKER_REPO (Docker's folder for it) and DOCKER_CODENAME
# (apt's release); false when Docker packages no Linux of this kind.
docker_family() {
    [ -r /etc/os-release ] || return 1
    # shellcheck disable=SC1091
    . /etc/os-release
    DISTRO="${PRETTY_NAME:-${ID:-this Linux}}"
    DOCKER_SOURCE="Docker's own packages"
    kind=" ${ID:-} ${ID_LIKE:-} "
    case "${ID:-}" in
        fedora) DOCKER_FAMILY=dnf DOCKER_REPO=fedora ;;
        rhel) DOCKER_FAMILY=dnf DOCKER_REPO=rhel ;;
        centos | rocky | almalinux) DOCKER_FAMILY=dnf DOCKER_REPO=centos ;;
        arch) DOCKER_FAMILY=pacman DOCKER_REPO='' DOCKER_SOURCE="Arch's own docker package" ;;
        *)
            case "$kind" in
                *" ubuntu "*) DOCKER_FAMILY=apt DOCKER_REPO=ubuntu DOCKER_CODENAME=${UBUNTU_CODENAME:-${VERSION_CODENAME:-}} ;;
                *" debian "*) DOCKER_FAMILY=apt DOCKER_REPO=debian DOCKER_CODENAME=${DEBIAN_CODENAME:-${VERSION_CODENAME:-}} ;;
                *" rhel "* | *" centos "*) DOCKER_FAMILY=dnf DOCKER_REPO=centos ;;
                *" arch "*) DOCKER_FAMILY=pacman DOCKER_REPO='' DOCKER_SOURCE="Arch's own docker package" ;;
                *) return 1 ;;
            esac
            ;;
    esac
    if [ "$DOCKER_FAMILY" = apt ] && [ -z "$DOCKER_CODENAME" ]; then
        return 1
    fi
    return 0
}

# The commands that install Docker Engine from Docker's own packages on this Linux, one a line, each run as root, as
# Docker's installation pages give them. A repository already set up is not set up again.
docker_install_commands() {
    case "$DOCKER_FAMILY" in
        apt)
            say "apt-get update"
            say "apt-get install -y ca-certificates curl"
            if [ ! -e /etc/apt/sources.list.d/docker.list ] && [ ! -e /etc/apt/sources.list.d/docker.sources ]; then
                say "install -m 0755 -d /etc/apt/keyrings"
                say "curl -fsSL https://download.docker.com/linux/$DOCKER_REPO/gpg -o /etc/apt/keyrings/docker.asc"
                say "chmod a+r /etc/apt/keyrings/docker.asc"
                say "echo \"deb [arch=$(dpkg --print-architecture 2>/dev/null || echo amd64) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/$DOCKER_REPO $DOCKER_CODENAME stable\" > /etc/apt/sources.list.d/docker.list"
                say "apt-get update"
            fi
            say "apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin"
            ;;
        dnf)
            if [ ! -e /etc/yum.repos.d/docker-ce.repo ]; then
                say "dnf -y install dnf-plugins-core"
                if has dnf5; then
                    say "dnf config-manager addrepo --from-repofile=https://download.docker.com/linux/$DOCKER_REPO/docker-ce.repo"
                else
                    say "dnf config-manager --add-repo https://download.docker.com/linux/$DOCKER_REPO/docker-ce.repo"
                fi
            fi
            say "dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin"
            ;;
        pacman)
            say "pacman -Syu --needed --noconfirm docker docker-buildx"
            ;;
    esac
}

# Whether Docker Engine, the system's own service, is installed (not the snap's, not rootless).
docker_engine_installed() {
    if [ -d /run/systemd/system ] && systemctl cat docker.service >/dev/null 2>&1; then
        return 0
    fi
    [ -x /usr/bin/dockerd ] || [ -x /usr/sbin/dockerd ]
}

# How the docker command found is not Docker Engine from Docker's packages, in words; nothing when it is.
docker_unsupported() {
    case "$(command -v docker 2>/dev/null)" in
        /snap/*)
            say "Docker from the snap, which cannot reach the hidden folders of your home folder Clank needs"
            return 0
            ;;
    esac
    if [ "$(docker context show 2>/dev/null)" = rootless ] || case "${DOCKER_HOST:-}" in *"/run/user/"*) true ;; *) false ;; esac; then
        say "rootless Docker, which maps the agent's user to another one on your folders"
        return 0
    fi
    return 1
}

# Whether Docker answers this account, through the docker group when it was just joined (the group takes effect in
# this session only through sg).
docker_answers() {
    docker version --format '{{.Server.Version}}' >/dev/null 2>&1 && return 0
    has sg && sg docker -c "docker version --format '{{.Server.Version}}'" >/dev/null 2>&1
}

# Linux: Docker Engine started now and at each boot, and this account in the docker group, each asked first.
docker_configure() {
    if [ -d /run/systemd/system ]; then
        if ! systemctl is-active --quiet docker 2>/dev/null || ! systemctl is-enabled --quiet docker 2>/dev/null; then
            say "  Docker Engine is not running, or would not start when the computer does. Clank needs it running."
            if confirm "Start it now and at every boot (systemctl enable --now docker)?"; then
                as_root systemctl enable --now docker || say "  That did not work (its words are above)."
            fi
        fi
    else
        say "  This system does not run systemd: start Docker Engine your system's way before you use Clank."
    fi
    me=$(id -un)
    if [ "$(id -u)" != 0 ] && ! id -nG "$me" 2>/dev/null | tr ' ' '\n' | grep -qx docker; then
        say "  Your account, $me, is not in the docker group, so it cannot use Docker without sudo. Docker says"
        say "  the group gives root's rights on this computer: https://docs.docker.com/engine/install/linux-postinstall/"
        if confirm "Add $me to the docker group (usermod -aG docker $me)?"; then
            as_root usermod -aG docker "$me" && JOINED_DOCKER=1
        fi
    fi
}

# Linux: Docker Engine found, or installed from Docker's own packages on a yes, then configured and checked.
docker_linux() {
    if docker_engine_installed; then
        say "  found: $(docker --version 2>/dev/null || echo 'Docker Engine')"
    else
        if has docker && why=$(docker_unsupported); then
            say "  found: $why. Clank does not support it; Docker Engine from Docker's own packages can be"
            say "  installed beside it, and Clank then uses that one."
        else
            say "  Docker Engine is not installed. Clank runs the agent in a Docker container, one per folder, so"
            say "  that the agent sees only that folder; it is needed before you work in a folder."
        fi
        if ! docker_family; then
            say "  Docker does not package ${DISTRO:-this Linux} (or its release could not be read): install Docker"
            say "  Engine as https://docs.docker.com/engine/install/ says, then run this again."
            return 0
        fi
        say "  On ${DISTRO}, Docker Engine comes from ${DOCKER_SOURCE}, installed with these commands, as root:"
        commands=$(docker_install_commands)
        say "$commands" | sed 's/^/    /'
        if ! confirm "Install Docker Engine now (the commands above, as root)?"; then
            say "  Not installed. Run this again, or install it as above, before you work in a folder."
            return 0
        fi
        failed=
        say "$commands" | while IFS= read -r line; do
            say "  # $line"
            as_root sh -c "$line" </dev/null || { say "  That did not work (its words are above). Stopped here."; exit 1; }
        done || failed=1
        if [ -n "$failed" ]; then
            say "  Docker Engine was not installed. Clank goes on; install Docker as above, then run this again."
            return 0
        fi
        [ "${CLANK_DRY_RUN:-}" = 1 ] || docker_engine_installed || {
            say "  The packages went in, but Docker Engine's service is not found. Run this again after a restart."
            return 0
        }
        if [ "${CLANK_DRY_RUN:-}" = 1 ]; then
            say "  (dry run) Docker Engine would be installed from ${DOCKER_SOURCE}."
        else
            say "  installed: Docker Engine, from ${DOCKER_SOURCE}"
        fi
    fi
    docker_configure
    if [ "${CLANK_DRY_RUN:-}" = 1 ]; then
        say "  (dry run) then checked: docker version, as your account (through the docker group if just joined)."
    elif docker_answers; then
        say "  ready: Docker Engine answers your account."
        if [ -n "${JOINED_DOCKER:-}" ]; then
            say "  You joined the docker group just now: log out and in once (or restart) before you type clank,"
            say "  so every program you start can use Docker."
        fi
    else
        say "  Docker does not answer your account yet: clank doctor, below, says why and what to do."
    fi
}

# macOS: Docker Desktop found, or installed with Homebrew on a yes; then started once and waited for, since its terms
# are accepted in its own window the first time.
docker_macos() {
    if has docker || [ -d /Applications/Docker.app ]; then
        say "  found: $(docker --version 2>/dev/null || echo 'Docker Desktop')"
    else
        say "  Docker Desktop is not installed. Clank runs the agent in a Docker container, one per folder, so"
        say "  that the agent sees only that folder; it is needed before you work in a folder."
        if has brew && confirm "Install Docker Desktop now with Homebrew (brew install --cask docker)?"; then
            run brew install --cask docker || say "  Homebrew did not install it (its words are above)."
        fi
        if [ ! -d /Applications/Docker.app ] && [ "${CLANK_DRY_RUN:-}" != 1 ]; then
            say "  Get it from https://www.docker.com/products/docker-desktop/ , then run this again."
            return 0
        fi
    fi
    if [ "${CLANK_DRY_RUN:-}" != 1 ] && docker info >/dev/null 2>&1; then
        say "  ready: Docker Desktop is running."
        return 0
    fi
    if confirm "Open Docker Desktop now? The first time, accept its terms in its window."; then
        run open -a Docker || return 0
        [ "${CLANK_DRY_RUN:-}" = 1 ] && return 0
        say "  Waiting for Docker Desktop to start (up to five minutes)..."
        waited=0
        while [ "$waited" -lt 300 ]; do
            if docker info >/dev/null 2>&1; then
                say "  ready: Docker Desktop is running."
                return 0
            fi
            sleep 5
            waited=$((waited + 5))
        done
        say "  Docker Desktop has not started yet: finish its first start in its window; clank doctor checks it."
    fi
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
    if ! uv=$(find_uv) && [ "${CLANK_DRY_RUN:-}" = 1 ]; then
        say "  (dry run) uv is not installed: Astral's installer would install it (curl -LsSf https://astral.sh/uv/install.sh | sh)."
        uv=
    elif [ -z "$uv" ]; then
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
    if [ -n "$uv" ]; then
        PATH="$(dirname "$uv"):$PATH"
        export PATH
        say "  found: $("$uv" --version) ($uv)"
    fi

    # 2. Git
    step "[2/5] Git (downloads Clank)"
    if ! git --version >/dev/null 2>&1; then
        how=$(git_command)
        say "  Git is not installed. Clank is downloaded with it, so it is needed."
        if [ -n "$how" ] && [ "$how" != "xcode-select --install" ] && confirm "Install Git now ($how)?"; then
            case "$how" in
                brew*) run sh -c "$how" ;;
                *) as_root sh -c "$how" || say "  That did not work (it needs root or sudo)." ;;
            esac
        fi
        if [ "${CLANK_DRY_RUN:-}" = 1 ]; then
            say "  (dry run) Git would be installed: ${how:-with the package manager of your system}"
        elif ! git --version >/dev/null 2>&1; then
            stop "Git is needed. Install it (${how:-with the package manager of your system}) and run this again."
        fi
    fi
    git --version >/dev/null 2>&1 && say "  found: $(git --version)"

    # 3. Docker
    if [ "$OS" = Darwin ]; then
        step "[3/5] Docker Desktop (the agent's workspaces)"
        docker_macos
    else
        step "[3/5] Docker Engine (the agent's workspaces)"
        docker_linux
    fi

    # 4. Clank
    step "[4/5] Clank"
    if [ "${CLANK_DRY_RUN:-}" = 1 ]; then
        say "  (dry run) would run: uv tool install --force --reinstall-package clank --python 3.12 git+$REPO@<${CLANK_VERSION:-the latest release}>"
        say "  (dry run) then: uv tool update-shell, and clank setup --check"
        step "Dry run: nothing was changed."
        return 0
    fi
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

    # 5. The checklist: clank setup --check where this Clank has it, else clank doctor; both change nothing.
    if "$exe" setup --help >/dev/null 2>&1; then
        step "[5/5] clank setup --check (what is set up, and what is next; changes nothing)"
        "$exe" setup --check || say "  Something is still to do (the lines above say what). Clank is installed."
    else
        step "[5/5] clank doctor (checks this computer; changes nothing)"
        if ! "$exe" doctor; then
            say "  clank doctor found something to fix (the lines above say what). Clank is installed."
        fi
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
