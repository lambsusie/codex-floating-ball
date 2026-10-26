param(
    [Parameter(Mandatory = $true)][string]$BinaryDirectory,
    [Parameter(Mandatory = $true)][string]$UiTestDirectory,
    [Parameter(Mandatory = $true)][string]$RealTestDirectory
)
$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$version = (Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version
$output = Join-Path $root "release\v$version"
if (Test-Path -LiteralPath $output) { throw "Staging directory already exists: $output" }
$source = Join-Path $output 'source'
$verification = Join-Path $output 'verification'
New-Item -ItemType Directory -Path $source, $verification | Out-Null

# Explicit allowlist: no local profiles, build caches or credentials enter release assets.
foreach ($name in @('.github', '.gitignore', 'LICENSE', 'README.md', 'README.en.md', 'package.json', 'package-lock.json', 'ui', 'reference', 'test', 'scripts', 'docs')) {
    Copy-Item -LiteralPath (Join-Path $root $name) -Destination $source -Recurse -Force
}
$native = Join-Path $source 'src-tauri'
New-Item -ItemType Directory -Path $native | Out-Null
foreach ($name in @('Cargo.toml', 'Cargo.lock', 'build.rs', 'tauri.conf.json', 'capabilities', 'icons', 'src')) {
    Copy-Item -LiteralPath (Join-Path $root "src-tauri\$name") -Destination $native -Recurse -Force
}
Copy-Item -LiteralPath (Join-Path $BinaryDirectory 'codex-floating-ball.exe') -Destination (Join-Path $output "Codex-Floating-Ball-$version-win-x64.exe")
Copy-Item -LiteralPath (Join-Path $BinaryDirectory "bundle\nsis\Codex Floating Ball_${version}_x64-setup.exe") -Destination (Join-Path $output "Codex-Floating-Ball-$version-win-x64-setup.exe")
Copy-Item -LiteralPath (Join-Path $root 'docs\测试版使用说明.txt') -Destination $output
Copy-Item -LiteralPath (Join-Path $root 'LICENSE') -Destination $output
foreach ($name in @('javascript-tests.txt', 'rust-tests.txt')) {
    Copy-Item -LiteralPath (Join-Path $root "qa\$name") -Destination $verification
}
$ui = Get-Content -LiteralPath (Join-Path $UiTestDirectory 'results.json') -Raw | ConvertFrom-Json
$real = Get-Content -LiteralPath (Join-Path $RealTestDirectory 'results.json') -Raw | ConvertFrom-Json
if (!$ui.passed -or !$real.passed) { throw 'Release staging requires passing final integration tests' }
Copy-Item -LiteralPath (Join-Path $UiTestDirectory 'results.json') -Destination (Join-Path $verification 'ui-tests.json')
# Summarize the local-data test without exporting any user data or profile paths.
@{
    passed = $real.passed
    migration = $real.legacyMigration.passed
    liveQuota = $real.liveQuota.passed
    reportParity = $real.realReports.originalAlgorithmParity
    originalDataUnchanged = $real.originalFilesUnchanged
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $verification 'migration-tests.json') -Encoding utf8
foreach ($name in @('chart-light.png', 'reports-light.png', 'chart-jade-dark.png', 'settings-dark-en.png', 'ball-120.png')) {
    Copy-Item -LiteralPath (Join-Path $UiTestDirectory $name) -Destination $verification
}
Compress-Archive -Path (Join-Path $source '*') -DestinationPath (Join-Path $output "Codex-Floating-Ball-$version-source.zip") -CompressionLevel Optimal
$hashes = Get-ChildItem -LiteralPath $output -File | Where-Object { $_.Extension -in @('.exe', '.zip') } | ForEach-Object {
    $hash = Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256
    "$($hash.Hash.ToLowerInvariant())  $($_.Name)"
}
$hashes | Set-Content -LiteralPath (Join-Path $output 'SHA256SUMS.txt') -Encoding ascii
Write-Output $output
