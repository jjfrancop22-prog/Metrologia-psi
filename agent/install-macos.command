#!/bin/bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
DEST="$HOME/.labpsi-p12-agent"
PLIST="$HOME/Library/LaunchAgents/com.labpsi.p12signer.plist"
NODE="$(command -v node || true)"
NPM="$(command -v npm || true)"
if [ -z "$NODE" ] || [ -z "$NPM" ]; then
  echo "ERROR: Node.js LTS no está instalado. Instálelo una sola vez y vuelva a ejecutar este instalador."
  read -r -p "Presione Enter para cerrar..." _
  exit 1
fi
echo "Instalando agente LAB-PSI en $DEST"
mkdir -p "$DEST" "$HOME/Library/LaunchAgents"
cp "$ROOT/server/sign-server.mjs" "$DEST/sign-server.mjs"
cp "$HERE/package.json" "$DEST/package.json"
cd "$DEST"
"$NPM" install --omit=dev --no-audit --no-fund
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.labpsi.p12signer</string>
<key>ProgramArguments</key><array><string>$NODE</string><string>$DEST/sign-server.mjs</string></array>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><true/>
<key>StandardOutPath</key><string>$DEST/agent.log</string>
<key>StandardErrorPath</key><string>$DEST/agent-error.log</string>
<key>WorkingDirectory</key><string>$DEST</string>
</dict></plist>
EOF
launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl kickstart -k "gui/$(id -u)/com.labpsi.p12signer"
sleep 1
if curl -fsS http://127.0.0.1:8787/api/sign/health >/dev/null; then
 echo "OK: Agente P12 LAB-PSI instalado y activo. Ya no necesita mantener Terminal abierta."
else
 echo "AVISO: instalado, pero no respondió todavía. Revise $DEST/agent-error.log"
fi
read -r -p "Presione Enter para cerrar..." _
