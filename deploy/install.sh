#!/bin/sh
# One-time setup: installs the systemd --user services and labwc kiosk
# config for shades_of_blue_round. Safe to re-run.
set -e

REPO="/home/awd/shades_of_blue_round"

echo "== systemd user services =="
mkdir -p "$HOME/.config/systemd/user"
cp "$REPO/deploy/systemd/encoder-bridge.service" "$HOME/.config/systemd/user/"
cp "$REPO/deploy/systemd/kiosk-http.service" "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
systemctl --user enable --now encoder-bridge.service kiosk-http.service

if ! loginctl show-user "$USER" 2>/dev/null | grep -q '^Linger=yes'; then
  echo "Enabling linger so these services start at boot without a login..."
  sudo loginctl enable-linger "$USER"
fi

echo "== labwc kiosk config =="
mkdir -p "$HOME/.config/labwc"
if [ -f "$HOME/.config/labwc/rc.xml" ]; then
  cp "$HOME/.config/labwc/rc.xml" "$HOME/.config/labwc/rc.xml.bak"
fi
cp "$REPO/deploy/labwc/rc.xml" "$HOME/.config/labwc/rc.xml"
cp "$REPO/deploy/labwc/autostart" "$HOME/.config/labwc/autostart"

chmod +x "$REPO/deploy/launch-kiosk.sh"

echo "== desktop icon to re-enter kiosk mode =="
mkdir -p "$HOME/Desktop"
cp "$REPO/deploy/start-kiosk.desktop" "$HOME/Desktop/start-kiosk.desktop"
chmod +x "$HOME/Desktop/start-kiosk.desktop"

echo
echo "Done. Reboot to see it come up fully automatically:"
echo "  sudo reboot"
