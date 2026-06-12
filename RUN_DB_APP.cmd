@echo off
cd /d "%~dp0"
start cmd /k "node server\api-connected.js"
start cmd /k "npm run dev:web"
