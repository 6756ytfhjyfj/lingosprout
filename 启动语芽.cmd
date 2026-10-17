@echo off
chcp 65001 >nul
pushd "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 22 或更高版本，再运行此文件。
  pause
  exit /b 1
)
if not exist ".env.local" copy ".env.example" ".env.local" >nul
if not exist "node_modules\next\package.json" (
  call npm ci --no-audit --no-fund
  if errorlevel 1 (
    echo 依赖安装未完成，请检查网络后重试。
    pause
    exit /b 1
  )
)
echo.
echo 语芽即将启动。请在浏览器打开终端显示的 Local 地址。
echo 默认地址：http://127.0.0.1:3000
echo 演示 Premium 仅在此开发模式可用，无需 API 密钥，不会收费。
echo 按 Ctrl+C 停止。
echo.
call npm run dev
popd
pause
