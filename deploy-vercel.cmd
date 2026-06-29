@echo off
setlocal

set "PROJECT_ROOT=%~dp0"
set "RUNTIME_ROOT=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies"
set "NODE_BIN=%RUNTIME_ROOT%\node\bin"
set "TOOLS_BIN=%RUNTIME_ROOT%\bin"
set "VERCEL_BIN=%PROJECT_ROOT%node_modules\.bin\vercel.cmd"

if not exist "%VERCEL_BIN%" (
  echo Vercel CLI nao encontrada. Verifique se as dependencias foram instaladas.
  exit /b 1
)

set "PATH=%NODE_BIN%;%TOOLS_BIN%;%PATH%"
set "XDG_DATA_HOME=%PROJECT_ROOT%.vercel-cli\data"
set "XDG_CONFIG_HOME=%PROJECT_ROOT%.vercel-cli\config"
set "XDG_CACHE_HOME=%PROJECT_ROOT%.vercel-cli\cache"
set "APPDATA=%PROJECT_ROOT%.vercel-cli\appdata"
set "LOCALAPPDATA=%PROJECT_ROOT%.vercel-cli\localappdata"

call "%VERCEL_BIN%" deploy --prod
