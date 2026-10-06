# Agente automático de firma P12 LAB-PSI — V1.1.160

Objetivo: mantener el motor de firma P12 activo automáticamente sin dejar Terminal/PowerShell abierto.

## macOS
1. Descomprima el ERP en una carpeta normal.
2. Abra `agent/install-macos.command` una sola vez.
3. El instalador copia un runtime mínimo a `~/.labpsi-p12-agent`, instala sus dependencias y registra `com.labpsi.p12signer` en LaunchAgents.
4. Desde entonces se inicia automáticamente al iniciar sesión y se reinicia si se detiene.

## Windows
1. Descomprima el ERP.
2. Clic derecho en `agent/install-windows.ps1` > Ejecutar con PowerShell.
3. Se instala en `%LOCALAPPDATA%\LAB-PSI\P12Signer` y crea una tarea al inicio de sesión.

## Requisito único
Node.js LTS debe estar instalado en cada computadora autorizada para firmar. El instalador lo comprueba.

## Seguridad
- El agente escucha únicamente en `127.0.0.1:8787`; no queda expuesto a otros equipos de la red.
- El archivo P12/PFX y su contraseña se usan durante la solicitud de firma y no se guardan por el agente.
- El ERP mantiene su health-check antes de habilitar la firma.

## Desinstalación
Use `uninstall-macos.command` o `uninstall-windows.ps1`.
