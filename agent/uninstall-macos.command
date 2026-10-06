#!/bin/bash
set -euo pipefail
PLIST="$HOME/Library/LaunchAgents/com.labpsi.p12signer.plist"
launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || true
rm -f "$PLIST"
rm -rf "$HOME/.labpsi-p12-agent"
echo "Agente P12 LAB-PSI desinstalado."
read -r -p "Presione Enter para cerrar..." _
