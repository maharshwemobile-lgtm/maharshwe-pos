@echo off
set FILE=%1
if "%FILE%"=="" set FILE=maharshwe-pos-full-backup-2026-06-10(1).json
powershell -NoProfile -ExecutionPolicy Bypass -Command "$body = Get-Content -Raw '%FILE%'; Invoke-RestMethod -Uri 'http://127.0.0.1:4000/api/db/restore' -Method Post -ContentType 'application/json' -Body $body | ConvertTo-Json -Depth 5"
pause
