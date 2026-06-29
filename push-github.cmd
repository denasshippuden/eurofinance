@echo off
setlocal

set "PROJECT_ROOT=%~dp0"
set "GIT_BIN=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe"

if not exist "%GIT_BIN%" (
  echo Git nao encontrado no runtime local do Codex.
  exit /b 1
)

cd /d "%PROJECT_ROOT%"

"%GIT_BIN%" --git-dir=.git-store --work-tree=. push -u origin main
if %ERRORLEVEL% EQU 0 exit /b 0

echo.
echo Tentando rota alternativa do GitHub pela porta 443...
set "GIT_SSH_COMMAND=ssh -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=.git-store/known_hosts"
"%GIT_BIN%" --git-dir=.git-store --work-tree=. push -u ssh://git@ssh.github.com:443/denasshippuden/eurofinance.git main
