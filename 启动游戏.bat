@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 18 或更新版本，再打开游戏。
  echo 下载地址：https://nodejs.org/
  pause
  exit /b 1
)
echo 正在启动羽境……关闭此窗口即可停止本地服务。
node server.mjs --open
if errorlevel 1 pause
