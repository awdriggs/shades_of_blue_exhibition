#!/bin/sh
# Launches (or relaunches) the kiosk browser pointed at the local sketch.
# Used both by labwc's autostart at boot and manually after exiting kiosk
# mode (Escape) to get back in without a reboot.

# in case a previous instance is still hanging around
pkill -x chromium 2>/dev/null
sleep 1

# wait for kiosk-http.service to be answering before we load the page
for i in $(seq 1 30); do
  curl -sf http://localhost:8000/ >/dev/null 2>&1 && break
  sleep 1
done

exec chromium \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-translate \
  --user-data-dir="$HOME/.config/chromium-kiosk" \
  http://localhost:8000
