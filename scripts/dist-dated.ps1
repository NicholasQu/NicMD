$ErrorActionPreference = 'Stop'

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$date = Get-Date -Format 'MMdd'
$index = 1

while ($true) {
  $output = 'dist-{0}-{1:D2}' -f $date, $index
  if (-not (Test-Path (Join-Path $root $output))) {
    break
  }
  $index++
}

Write-Host "Output directory: $output" -ForegroundColor Cyan
Write-Host 'Building app...' -ForegroundColor Cyan
npm run build

Write-Host 'Copying splash screen...' -ForegroundColor Cyan
npx copyfiles -f src/main/splash.html out/main/

Write-Host 'Packaging Windows x64...' -ForegroundColor Cyan
npx electron-builder --win --x64 --config.directories.output=$output

$unpackedExe = Join-Path $root "$output\win-unpacked\NicMD.exe"
$installer = Join-Path $root "$output\NicMD-1.0.0-x64.exe"

Write-Host ''
Write-Host 'Done.' -ForegroundColor Green
Write-Host "Unpacked exe: $unpackedExe" -ForegroundColor Green
if (Test-Path $installer) {
  Write-Host "Installer/portable: $installer" -ForegroundColor Green
}
