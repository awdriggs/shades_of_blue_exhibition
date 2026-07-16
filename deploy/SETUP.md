# Setting up shades_of_blue_round on a new Pi

This guide is written for a fresh Claude Code session running directly on
the target Raspberry Pi, with no memory of how the first device (`ams01`)
was set up. Follow it in order; each step lists a command to verify before
moving on.

Known-good reference device: a Pi 4 running Raspberry Pi OS (Debian
trixie), `labwc` (Wayland) desktop, autologin enabled, `chromium` installed,
encoder wired to GPIO 17/27, repo cloned to `/home/awd/shades_of_blue_round`
as user `awd`. If any of the checks below come back different on this
device, stop and confirm with the user before proceeding — don't guess at
values like GPIO pins, device_id, repo path, or username.

## 0. Get the repo onto the device

```
git clone <this repo's remote> /home/awd/shades_of_blue_round
```

(Or `git pull` if it's already cloned.) The rest of this guide assumes that
path and the `awd` user. If either differs on this machine, the absolute
paths hardcoded in `deploy/systemd/*.service`, `deploy/launch-kiosk.sh`,
`deploy/start-kiosk.desktop`, and `deploy/install.sh` all need to be
updated to match before running `install.sh`.

## 1. Set this device's identity

Every physical Pi in this project reads a different device's color-sensor
stream. Check what this Pi's device_id should be (ask the user if it's not
obvious from context — for the second device built so far it was
`bkny01`), then edit `sketch.js`:

```
grep -n "DEVICE_ID" sketch.js
```

Change line 1 from `const DEVICE_ID = 'ams01';` to this device's ID. This
is the **only** code change required per-device — everything else
(websocket join, historical fetch URL) keys off this constant.

GPIO pins for the encoder are set in `encoder_bridge.py` as `ENCODER_A`
and `ENCODER_B` (currently 17/27). Only change these if this device's
encoder is actually wired differently — confirm with the user rather than
assuming.

## 2. Verify OS prerequisites

Run each check; all should succeed before continuing.

```
cat /etc/os-release                 # expect Debian-based Raspberry Pi OS
echo $XDG_SESSION_TYPE               # expect "wayland"
which labwc chromium                 # both should resolve
grep autologin-user /etc/lightdm/lightdm.conf   # expect autologin-user=<this device's user>
loginctl show-user "$USER" | grep Linger        # expect Linger=yes
```

If `labwc`/`chromium` are missing, install with `apt`. If autologin or
linger aren't set, use `raspi-config` (System Options → Boot / Autologin)
and `loginctl enable-linger <user>` respectively — `deploy/install.sh`
will also try to enable linger itself (via `sudo`) if it's off.

If this Pi uses a different desktop (X11, a different WM, no autologin),
stop — the `deploy/labwc/*` files and kiosk approach won't directly apply,
and the setup needs to be adapted rather than copied blindly.

## 3. Verify Python dependencies

```
python3 -c "import gpiozero, websockets" && echo OK
groups | grep -q gpio && echo "in gpio group" || echo "NOT in gpio group -- fix before continuing"
```

If either fails: `pip install gpiozero websockets` (or `apt install
python3-gpiozero python3-websockets`), and `sudo usermod -aG gpio $USER`
followed by a re-login if the group membership was missing.

## 4. Run the installer

```
cd /home/awd/shades_of_blue_round
./deploy/install.sh
```

This is idempotent — safe to re-run. It will:
- Install and enable `encoder-bridge.service` and `kiosk-http.service` as
  `systemd --user` units.
- Back up any existing `~/.config/labwc/rc.xml` to `rc.xml.bak`, then
  install the version with the `Escape`-kills-chromium keybind.
- Install `~/.config/labwc/autostart` (keeps the normal desktop panel/file
  manager running underneath, then launches kiosk chromium).
- Drop a "Start Kiosk" icon on the Desktop for manual re-entry.

## 5. Reboot and verify

```
sudo reboot
```

After it comes back up, confirm:
- The sketch is on-screen full-screen with no browser chrome.
- Turning the encoder changes the reading count (check direction feels
  right — if reversed, see the `+`/`-` sign on `data.delta` in
  `sketch.js`'s `encoderSocket.onmessage`, not the bridge).
- `journalctl --user -u encoder-bridge.service -u kiosk-http.service`
  shows both running without repeated restarts.
- Pressing `Escape` (keyboard needed) exits to the desktop; double-clicking
  "Start Kiosk" (or running `deploy/launch-kiosk.sh`) gets back in without
  a reboot.

## Don't assume, ask

Anything not covered by a check above — different OS, different desktop
environment, different repo location, ambiguous device_id, unclear GPIO
wiring — should be confirmed with the user rather than guessed. The
scripts in `deploy/` are written for one known configuration; adapting
them to a meaningfully different setup is a judgment call the user should
weigh in on.
