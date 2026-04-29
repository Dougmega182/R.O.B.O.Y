# 🚀 Psaila Family Command Center - Launch Script
# This script starts the operational dashboard and makes it visible on the local network.

Clear-Host
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  PSAILA FAMILY COMMAND CENTER - ELTHAM   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Detect Local IP Address
$ip = (Get-NetIPAddress | Where-Object { $_.AddressState -eq 'Preferred' -and $_.AddressFamily -eq 'InterNetwork' -and $_.InterfaceAlias -notmatch 'Loopback|Virtual' }).IPAddress

Write-Host "`n[SYSTEM]  Architecture: Supabase SSR Production Mode" -ForegroundColor Gray
Write-Host "[IDENTITY] Primary Registry: Google Cloud Console" -ForegroundColor Gray
Write-Host "[NODES]     Eltham (Active), Audio Node (Ready)" -ForegroundColor Gray

Write-Host "`n[NETWORK] Access the command center from any device:" -ForegroundColor Yellow
Write-Host "------------------------------------------" -ForegroundColor Yellow
Write-Host "URL: http://$($ip):3000" -ForegroundColor Green -BackgroundColor Black
Write-Host "------------------------------------------" -ForegroundColor Yellow

# 2. Check for Clean Boot Argument
$clean = $args -contains "--clean"
if ($clean) {
    Write-Host "`n[CLEAN] Purging Node Cache (.next)..." -ForegroundColor Magenta
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "`n[SYSTEM] Checking for Zombie Processes on Port 3000..." -ForegroundColor Yellow
$zombie = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($zombie) {
    Write-Host "[SYSTEM] Zombie Process Found. Terminating PID $($zombie.OwningProcess)..." -ForegroundColor Red
    Stop-Process -Id $zombie.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host "`n[BOOT] Initializing Node Engine..." -ForegroundColor Cyan

# 3. Start Next.js on all interfaces
npm run dev -- -H 0.0.0.0
