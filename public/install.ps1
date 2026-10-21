# Clank's installer for Windows (PowerShell 5.1 or 7):
#
#   irm https://clank-ai.github.io/install.ps1 | iex
#
# What it does, in order, saying each step:
#   1. uv: uses the one on PATH, or installs it with Astral's official installer (https://astral.sh/uv/install.ps1).
#   2. Git: needed to download Clank. If it is missing, offers `winget install --id Git.Git -e` (asking first).
#   3. Docker Desktop: needed for the agent's workspaces. If it is missing, says how to get it and offers
#      `winget install --id Docker.DockerDesktop -e` (asking first; it never installs Docker without a yes).
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
# Its source: https://github.com/clank-ai/clank-ai.github.io/blob/main/public/install.ps1

& {
    $Repo = 'https://github.com/clank-ai/clank'
    $GetStarted = 'https://clank-ai.github.io/get-started'
    $NoModifyPath = $env:CLANK_NO_MODIFY_PATH -eq '1'
    $OriginalPath = $env:Path

    function Say([string]$Text, [string]$Color = '') {
        if ($Color) { Write-Host $Text -ForegroundColor $Color } else { Write-Host $Text }
    }

    function Step([string]$Text) {
        Write-Host ''
        Write-Host $Text -ForegroundColor Cyan
    }

    # Stops the installer with a plain message (caught at the end).
    function Stop-Install([string]$Text) {
        throw [System.InvalidOperationException]::new($Text)
    }

    function Test-Command([string]$Name) {
        return [bool](Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue)
    }

    # Asks a yes-or-no question; the answer is no unless the person types y. Without a terminal to answer in
    # (a script, a pipe), it does not ask and the answer is no.
    function Confirm-Step([string]$Question) {
        $canAsk = [Environment]::UserInteractive -and -not [Console]::IsInputRedirected
        if ($canAsk) {
            foreach ($arg in [Environment]::GetCommandLineArgs()) {
                if ($arg -like '-noni*') { $canAsk = $false }
            }
        }
        if (-not $canAsk) {
            Say "  $Question [y/N] (not asked: no terminal to answer in)"
            return $false
        }
        try {
            $answer = Read-Host "  $Question [y/N]"
        } catch {
            return $false
        }
        return $answer -match '^\s*(y|yes)\s*$'
    }

    # Adds to this window's PATH the folders Windows' own PATH has gained (after a winget install).
    function Update-SessionPath {
        $known = $env:Path -split ';' | Where-Object { $_ }
        foreach ($scope in 'Machine', 'User') {
            $saved = [Environment]::GetEnvironmentVariable('Path', $scope)
            if (-not $saved) { continue }
            foreach ($folder in $saved -split ';') {
                if ($folder -and ($known -notcontains $folder)) {
                    $env:Path = "$env:Path;$folder"
                    $known += $folder
                }
            }
        }
    }

    function Add-SessionPath([string]$Folder) {
        if (($env:Path -split ';') -notcontains $Folder) { $env:Path = "$Folder;$env:Path" }
    }

    # Runs winget for one package; true when it says it installed it.
    function Install-WithWinget([string]$Id) {
        Say "  > winget install --id $Id -e --source winget"
        & winget install --id $Id -e --source winget
        return $LASTEXITCODE -eq 0
    }

    # Where Astral's installer puts uv, in the order it chooses.
    function Find-Uv {
        if (Test-Command 'uv') { return (Get-Command uv -CommandType Application | Select-Object -First 1).Source }
        $folders = @(
            $env:UV_INSTALL_DIR, $env:CARGO_DIST_FORCE_INSTALL_DIR, $env:UV_UNMANAGED_INSTALL, $env:XDG_BIN_HOME
        )
        if ($env:XDG_DATA_HOME) { $folders += Join-Path $env:XDG_DATA_HOME '..\bin' }
        $folders += Join-Path $HOME '.local\bin'
        $folders += Join-Path $(if ($env:CARGO_HOME) { $env:CARGO_HOME } else { Join-Path $HOME '.cargo' }) 'bin'
        foreach ($folder in $folders) {
            if (-not $folder) { continue }
            foreach ($candidate in (Join-Path $folder 'uv.exe'), (Join-Path $folder 'bin\uv.exe')) {
                if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
            }
        }
        return $null
    }

    # The highest release tag (vX.Y.Z, or a pre-release such as vX.Y.ZbN), or $null when there is none.
    function Get-LatestTag {
        $lines = & git ls-remote --tags --refs $Repo
        if ($LASTEXITCODE -ne 0) { Stop-Install "Could not reach $Repo with Git. Check the internet connection and run this again." }
        $best = $null
        $bestKey = ''
        foreach ($line in $lines) {
            if ($line -match 'refs/tags/(v(\d+)\.(\d+)\.(\d+)(?:(a|b|rc)(\d+))?)$') {
                $rank = 3
                if ($Matches[5] -eq 'a') { $rank = 0 } elseif ($Matches[5] -eq 'b') { $rank = 1 } elseif ($Matches[5] -eq 'rc') { $rank = 2 }
                $pre = if ($Matches[6]) { [int]$Matches[6] } else { 0 }
                $key = '{0:D6}{1:D6}{2:D6}{3}{4:D6}' -f [int]$Matches[2], [int]$Matches[3], [int]$Matches[4], $rank, $pre
                if ($key -gt $bestKey) { $bestKey = $key; $best = $Matches[1] }
            }
        }
        return $best
    }

    function Get-ClankVersion([string]$Exe) {
        if (-not (Test-Path -LiteralPath $Exe -PathType Leaf)) { return $null }
        $text = & $Exe --version 2>$null
        if ($LASTEXITCODE -ne 0) { return $null }
        return (($text | Out-String).Trim())
    }

    function Install-Clank {
        $os = (Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue).Caption
        Say 'Clank installer' Green
        Say "  $(if ($os) { $os } else { 'Windows' }) - PowerShell $($PSVersionTable.PSVersion)"
        if ($NoModifyPath) { Say '  CLANK_NO_MODIFY_PATH=1: no PATH will be changed' }
        $hasWinget = Test-Command 'winget'

        # 1. uv
        Step '[1/5] uv (installs Clank and the Python it runs on)'
        $uv = Find-Uv
        if (-not $uv) {
            Say "  uv is not installed: installing it with Astral's installer (https://docs.astral.sh/uv/)."
            $shell = (Get-Process -Id $PID).Path
            if (-not $shell) { $shell = 'powershell' }
            $previous = $env:UV_NO_MODIFY_PATH
            if ($NoModifyPath) { $env:UV_NO_MODIFY_PATH = '1' }
            $command = '[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12; irm https://astral.sh/uv/install.ps1 | iex'
            & $shell -NoProfile -ExecutionPolicy Bypass -Command $command
            $code = $LASTEXITCODE
            $env:UV_NO_MODIFY_PATH = $previous
            $uv = Find-Uv
            if ($code -ne 0 -or -not $uv) {
                $hint = if ($hasWinget) { 'winget install --id astral-sh.uv -e' } else { 'see https://docs.astral.sh/uv/getting-started/installation/' }
                Stop-Install "uv could not be installed. Install it yourself ($hint), open a new PowerShell and run this again."
            }
        }
        Add-SessionPath (Split-Path -Parent $uv)
        Say "  found: $((& $uv --version | Out-String).Trim()) ($uv)"

        # 2. Git
        Step '[2/5] Git (downloads Clank)'
        if (-not (Test-Command 'git')) {
            Say '  Git is not installed. Clank is downloaded with it, so it is needed.' Yellow
            if ($hasWinget -and (Confirm-Step 'Install Git now with winget?')) {
                if (Install-WithWinget 'Git.Git') { Update-SessionPath }
            }
            if (-not (Test-Command 'git')) {
                $how = if ($hasWinget) { 'winget install --id Git.Git -e' } else { 'https://git-scm.com/download/win' }
                Stop-Install "Git is needed. Install it ($how), open a new PowerShell and run this again."
            }
        }
        Say "  found: $((& git --version | Out-String).Trim())"

        # 3. Docker Desktop
        Step "[3/5] Docker Desktop (the agent's workspaces)"
        $desktop = @(
            (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
            (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\Docker Desktop.exe')
        ) | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
        if ((Test-Command 'docker') -or $desktop) {
            $what = if (Test-Command 'docker') { (& docker --version 2>$null | Out-String).Trim() } else { $desktop }
            Say "  found: $what (clank doctor says whether it is running)"
        } else {
            Say '  Docker Desktop is not installed. Clank runs the agent in a Docker container, one per folder,' Yellow
            Say '  so it is needed before you work in a folder (Clank itself installs without it).' Yellow
            Say '  Get it: winget install --id Docker.DockerDesktop -e (it asks for administrator rights and may need a'
            Say '  restart), or https://www.docker.com/products/docker-desktop/ . Then open Docker Desktop once and'
            Say '  accept its terms.'
            if ($hasWinget -and (Confirm-Step 'Install Docker Desktop now with winget?')) {
                if (Install-WithWinget 'Docker.DockerDesktop') {
                    Update-SessionPath
                    Say '  Docker Desktop is installed: open it once, accept its terms and let it finish starting.' Green
                } else {
                    Say '  winget did not install Docker Desktop; install it later as above. Going on with Clank.' Yellow
                }
            }
        }

        # 4. Clank
        Step '[4/5] Clank'
        $bin = (& $uv tool dir --bin | Out-String).Trim()
        if ($LASTEXITCODE -ne 0 -or -not $bin) { Stop-Install 'uv did not say where it puts tools (uv tool dir --bin).' }
        $exe = Join-Path $bin 'clank.exe'
        $before = Get-ClankVersion $exe
        $pathFailed = $false
        if ($env:CLANK_VERSION) {
            $ref = $env:CLANK_VERSION
            Say "  version: $ref (from CLANK_VERSION)"
        } else {
            $ref = Get-LatestTag
            if ($ref) { Say "  version: $ref, the latest release" } else { Say '  version: main (the repository has no release yet)' }
        }
        $source = if ($ref) { "git+$Repo@$ref" } else { "git+$Repo" }
        if ($before) { Say "  installed now: $before; replacing it" }
        Say "  > uv tool install --force --reinstall-package clank --python 3.12 $source"
        # Some of Clank's file names are long enough that, in a deep uv cache folder, they pass Windows' old
        # 260-character limit: Git is told to allow long paths for this one download (not in its settings).
        $saved = $env:GIT_CONFIG_COUNT
        $index = if ($saved -match '^\d+$') { [int]$saved } else { 0 }
        Set-Item "env:GIT_CONFIG_KEY_$index" 'core.longpaths'
        Set-Item "env:GIT_CONFIG_VALUE_$index" 'true'
        $env:GIT_CONFIG_COUNT = [string]($index + 1)
        & $uv tool install --force --reinstall-package clank --python 3.12 $source
        $code = $LASTEXITCODE
        $env:GIT_CONFIG_COUNT = $saved
        Remove-Item "env:GIT_CONFIG_KEY_$index", "env:GIT_CONFIG_VALUE_$index" -ErrorAction SilentlyContinue
        if ($code -ne 0) { Stop-Install 'uv could not install Clank (its message is above).' }
        $after = Get-ClankVersion $exe
        if (-not $after) { Stop-Install "Clank was installed but $exe does not run." }
        Say "  installed: $after ($exe)$(if ($before -eq $after) { ', the version it had' })" Green
        if ($NoModifyPath) {
            Say "  PATH: not changed (CLANK_NO_MODIFY_PATH=1); clank is $exe"
        } else {
            # With the PATH this window had before the installer added uv's folder, so uv sees what is really there.
            $sessionPath = $env:Path
            $env:Path = $OriginalPath
            & $uv tool update-shell
            $code = $LASTEXITCODE
            $env:Path = $sessionPath
            if ($code -ne 0) {
                Say "  uv tool update-shell failed: add $bin to PATH yourself." Yellow
                $pathFailed = $true
            }
            Add-SessionPath $bin
        }

        # 5. clank doctor
        Step '[5/5] clank doctor (checks this computer; changes nothing)'
        & $exe doctor
        if ($LASTEXITCODE -ne 0) {
            Say '  clank doctor found something to fix (the lines above say what). Clank is installed.' Yellow
        }

        Step 'Next'
        if ($NoModifyPath -or $pathFailed) {
            Say "  1. Put $bin on PATH, or run clank as $exe."
        } else {
            Say '  1. Open a new terminal, so it finds clank.'
        }
        Say '  2. Type clank. With no model set up it opens on Add a model: a cloud model with an OpenRouter key,'
        Say '     or a model on your own GPU.'
        Say '  3. Then open a terminal in any project folder and type clank.'
        if ($before -and $before -ne $after) {
            Say "  Clank was updated from $before. If its service was running, restart it: clank stop,"
            Say '  clank serve --background, then clank gateway restart.'
        }
        Say "  Get started: $GetStarted"
        Say '  To update Clank later, run this installer again.'
    }

    try {
        Install-Clank
    } catch {
        Write-Host ''
        Write-Host "Clank was not installed: $($_.Exception.Message)" -ForegroundColor Red
        if ($PSCommandPath) { exit 1 }
    }
}
