$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$runtimeRoot = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies"
$nodeBin = Join-Path $runtimeRoot "node\bin"
$toolsBin = Join-Path $runtimeRoot "bin"
$vercelBin = Join-Path $projectRoot "node_modules\.bin\vercel.cmd"

if (!(Test-Path $vercelBin)) {
  Write-Host "Vercel CLI não encontrada. Rode a instalação do projeto antes de publicar."
  exit 1
}

$env:PATH = "$nodeBin;$toolsBin;$env:PATH"
$env:XDG_DATA_HOME = Join-Path $projectRoot ".vercel-cli\data"
$env:XDG_CONFIG_HOME = Join-Path $projectRoot ".vercel-cli\config"
$env:XDG_CACHE_HOME = Join-Path $projectRoot ".vercel-cli\cache"
$env:APPDATA = Join-Path $projectRoot ".vercel-cli\appdata"
$env:LOCALAPPDATA = Join-Path $projectRoot ".vercel-cli\localappdata"

& $vercelBin deploy --prod
