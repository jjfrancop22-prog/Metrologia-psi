$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $Here
$Dest = Join-Path $env:LOCALAPPDATA "LAB-PSI\P12Signer"
$Node = (Get-Command node -ErrorAction SilentlyContinue).Source
$Npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $Node -or -not $Npm) { Write-Host "ERROR: Node.js LTS no esta instalado. Instalelo una sola vez y vuelva a ejecutar."; Read-Host "Enter para cerrar"; exit 1 }
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
Copy-Item (Join-Path $Root "server\sign-server.mjs") (Join-Path $Dest "sign-server.mjs") -Force
Copy-Item (Join-Path $Here "package.json") (Join-Path $Dest "package.json") -Force
Push-Location $Dest
& $Npm install --omit=dev --no-audit --no-fund
Pop-Location
$TaskName = "LAB-PSI P12 Signer Agent"
$Action = New-ScheduledTaskAction -Execute $Node -Argument ('"' + (Join-Path $Dest 'sign-server.mjs') + '"') -WorkingDirectory $Dest
$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$Settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Days 3650) -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 2
try { $h=Invoke-RestMethod http://127.0.0.1:8787/api/sign/health -TimeoutSec 3; Write-Host "OK: Agente P12 LAB-PSI instalado y activo. No necesita dejar PowerShell abierto." } catch { Write-Host "AVISO: instalado, pero aun no responde en 127.0.0.1:8787." }
Read-Host "Enter para cerrar"
