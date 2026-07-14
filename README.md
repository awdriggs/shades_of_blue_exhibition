# shades_of_blue_round

Raspberry Pi 4 art piece: a physical rotary encoder drives a p5.js radial
visualization of ambient color-sensor readings.

## Running it

**1. Start the encoder bridge** (on the Pi, in the project root):

```
python3 encoder_bridge.py
```

Listens on `ws://localhost:8765` and broadcasts the encoder state (0–7).
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
