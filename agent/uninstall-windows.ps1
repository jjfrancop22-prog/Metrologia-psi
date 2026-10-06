$ErrorActionPreference = "SilentlyContinue"
$TaskName = "LAB-PSI P12 Signer Agent"
Stop-ScheduledTask -TaskName $TaskName
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Remove-Item (Join-Path $env:LOCALAPPDATA "LAB-PSI\P12Signer") -Recurse -Force
Write-Host "Agente P12 LAB-PSI desinstalado."
Read-Host "Enter para cerrar"
