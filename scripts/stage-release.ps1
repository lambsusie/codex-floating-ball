param([Parameter(Mandatory=$true)][string]$Destination)
$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$destinationPath = [System.IO.Path]::GetFullPath($Destination)
if (Test-Path -LiteralPath $destinationPath) { throw "Destination already exists: $destinationPath" }
$package = Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
if ($package.version -ne '1.2.0') { throw 'Unexpected version' }
$exeName = 'Codex-Floating-Ball-1.2.0-win-x64.exe'
$exe = Join-Path $root "dist\$exeName"
if (-not (Test-Path -LiteralPath $exe)) { throw 'Build the Windows release first' }
New-Item -ItemType Directory -Path $destinationPath | Out-Null
foreach ($name in @('.github', 'src', 'test', 'scripts', 'assets')) {
    Copy-Item -LiteralPath (Join-Path $root $name) -Destination $destinationPath -Recurse -Force
}
$design = Join-Path $destinationPath 'design\tray-icon-concept'
New-Item -ItemType Directory -Path $design -Force | Out-Null
Get-ChildItem -LiteralPath (Join-Path $root 'design\tray-icon-concept') -File |
    Where-Object { $_.Name -like 'regular-gap-ring-*' -or $_.Name -eq 'render_regular_concept.py' } |
    ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $design }
foreach ($name in @('package.json', 'package-lock.json', 'README.md', 'MACOS-BUILD.md', 'LICENSE', '.gitignore',
    'v1.2.0-release-description-zh.txt', 'v1.2.0-release-description-en.txt', 'UPLOAD-v1.2.0.txt', 'TEST-RESULTS-v1.2.0.md')) {
    Copy-Item -LiteralPath (Join-Path $root $name) -Destination $destinationPath
}
# Build a source-only ZIP before adding binaries and local QA artifacts.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$sourceZip = Join-Path ([System.IO.Path]::GetDirectoryName($destinationPath)) 'Codex-Floating-Ball-1.2.0-source.zip'
if (Test-Path -LiteralPath $sourceZip) { throw "Source ZIP already exists: $sourceZip" }
[System.IO.Compression.ZipFile]::CreateFromDirectory($destinationPath, $sourceZip)
Copy-Item -LiteralPath $sourceZip -Destination $destinationPath
$release = Join-Path $destinationPath 'release'
New-Item -ItemType Directory -Path $release | Out-Null
Copy-Item -LiteralPath $exe -Destination $release
$hash = (Get-FileHash -LiteralPath (Join-Path $release $exeName) -Algorithm SHA256).Hash.ToLowerInvariant()
[System.IO.File]::WriteAllText((Join-Path $release "$exeName.sha256"), "$hash  $exeName`n", [System.Text.Encoding]::ASCII)
$qa = Join-Path $destinationPath 'qa-v1.2.0'
New-Item -ItemType Directory -Path $qa | Out-Null
Get-ChildItem -LiteralPath (Join-Path $root 'qa-v1.2.0') -File |
    Where-Object { $_.Name -ne 'failure.png' } |
    ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $qa }
Write-Output "Staged v1.2.0 at $destinationPath"
Write-Output "SHA256 $hash"
