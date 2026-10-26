param([ValidateSet('build','test','check')][string]$Task = 'build')
$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$devShell = 'C:\CodexBuildTools\VS2022\Common7\Tools\Launch-VsDevShell.ps1'
if (Test-Path -LiteralPath $devShell) {
    & $devShell -Arch amd64 -HostArch amd64 -SkipAutomaticLocation
}
$toolsRoot = [System.IO.Path]::GetFullPath((Join-Path $root '..\outputs\tauri-build-tools'))
if (Test-Path -LiteralPath (Join-Path $toolsRoot 'cargo\bin\cargo.exe')) {
    $env:CARGO_HOME = Join-Path $toolsRoot 'cargo'
    $env:RUSTUP_HOME = Join-Path $toolsRoot 'rustup'
    $env:PATH = (Join-Path $env:CARGO_HOME 'bin') + ';' + $env:PATH
}
$env:PATH = 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH
$env:CARGO_BUILD_JOBS = '4'
# VsDevShell can corrupt pre-existing Unicode environment paths; set this afterwards.
$sharedTarget = Join-Path (Split-Path $root) 'codex-floating-ball-v2.0-tauri-prototype\src-tauri\target'
if (Test-Path -LiteralPath $sharedTarget) { $env:CARGO_TARGET_DIR = $sharedTarget }
Push-Location $root
try {
    if ($Task -eq 'build') { & node node_modules/@tauri-apps/cli/tauri.js build }
    else { & cargo $Task --release --manifest-path src-tauri/Cargo.toml }
    if ($LASTEXITCODE -ne 0) { throw "Tauri $Task failed" }
} finally { Pop-Location }
