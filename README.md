# shades_of_blue_round

Raspberry Pi 4 art piece: a physical rotary encoder drives a p5.js radial
visualization of ambient color-sensor readings.

## Running it

**1. Start the encoder bridge** (on the Pi, in the project root):

```
python3 encoder_bridge.py
```

Listens on `ws://localhost:8765` and broadcasts raw rotation ticks
(`{"delta": 1|-1}`) plus idle-timeout resets (`{"reset": true}`) — it doesn't
track an absolute reading count itself; `sketch.js` does, clamped against
whatever data it actually has for the hardcoded device.
Requires `gpiozero` and `websockets`, and access to GPIO 17/27.

**2. Serve and view the page**

`sketch.js` fetches color history over HTTPS via `loadJSON`, which won't
work from a `file://` URL, so serve the directory over HTTP:

```
cd /home/awd/shades_of_blue_round
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser (on the Pi itself, or
another device on the network pointed at the Pi's IP).

The page connects to two sockets: the local `ws://localhost:8765` bridge
(encoder) and the remote `wss://micro-api.awdokku.site` (color history for
device `ams01`, stream `shades-of-blue`) — start `encoder_bridge.py`
first, then load the page.

## Kiosk / autostart

`deploy/` sets this whole thing up to run unattended on boot: the encoder
bridge and http server as `systemd --user` services, and Chromium in kiosk
mode launched via `labwc` autostart. Run `deploy/install.sh` once, then
reboot.

- **Exit kiosk mode**: press `Escape` — kills Chromium, drops you back to
  the normal desktop (panel + file manager are still running underneath).
- **Get back into kiosk mode**: double-click the "Start Kiosk" desktop icon,
  or run `deploy/launch-kiosk.sh`. No reboot needed.
- Service logs: `journalctl --user -u encoder-bridge.service` /
  `-u kiosk-http.service`.
