@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 20 e abra este arquivo novamente.
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0]) < 20) process.exit(1)" >nul 2>nul
if errorlevel 1 (
  echo Este projeto precisa de Node.js 20 ou superior.
  pause
  exit /b 1
)
node -e "require('better-sqlite3')(':memory:').close(); require('dotenv')" >nul 2>nul
if errorlevel 1 (
  echo Instalando as dependencias compativeis com a sua versao do Node...
  call npm ci
  if errorlevel 1 (
    echo Nao foi possivel instalar as dependencias. Confira a mensagem acima.
    pause
    exit /b 1
  )
)
echo Abra http://localhost:3000 no navegador apos o servidor iniciar.
call npm start
pause
