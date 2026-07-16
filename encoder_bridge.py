#!/usr/bin/env python3
import asyncio
import json
import time

from gpiozero import RotaryEncoder
from websockets.asyncio.server import serve

ENCODER_A = 17
ENCODER_B = 27

HOST = "localhost"
PORT = 8765

IDLE_TIMEOUT = 30

# this bridge is a dumb relay: it knows nothing about readings, counts, or
# step size -- it only reports raw rotation direction and idle resets. All
# clamping against the (live-growing, per-device) data length happens in the
# sketch, which is the only side that actually knows how much data exists.
clients = set()
last_activity = time.monotonic()
idle_reset_sent = True  # starts "at rest" so we don't fire a reset on startup


def broadcast(loop, message):
    if not clients:
        return
    payload = json.dumps(message)
    for client in list(clients):
        asyncio.run_coroutine_threadsafe(client.send(payload), loop)


async def handler(websocket):
    clients.add(websocket)
    print(f"client connected ({len(clients)} total)")
    try:
        # a fresh connection has no way to know the dial's current offset
        # from default, so just tell it to start at the default view
        await websocket.send(json.dumps({"type": "encoder", "reset": True}))
        async for _ in websocket:
            pass  # this bridge doesn't expect messages from the browser
    finally:
        clients.discard(websocket)
        print(f"client disconnected ({len(clients)} total)")


async def idle_watcher(loop):
    global idle_reset_sent
    while True:
        await asyncio.sleep(1)
        if not idle_reset_sent and time.monotonic() - last_activity >= IDLE_TIMEOUT:
            idle_reset_sent = True
            print(f"idle {IDLE_TIMEOUT}s -> reset")
            broadcast(loop, {"type": "encoder", "reset": True})


async def main():
    global last_activity, idle_reset_sent
    loop = asyncio.get_running_loop()

    def on_clockwise():
        global last_activity, idle_reset_sent
        last_activity = time.monotonic()
        idle_reset_sent = False
        broadcast(loop, {"type": "encoder", "delta": 1})
        print("CW")

    def on_counter_clockwise():
        global last_activity, idle_reset_sent
        last_activity = time.monotonic()
        idle_reset_sent = False
        broadcast(loop, {"type": "encoder", "delta": -1})
        print("CCW")

    encoder = RotaryEncoder(ENCODER_A, ENCODER_B, max_steps=0)
    encoder.when_rotated_clockwise = on_clockwise
    encoder.when_rotated_counter_clockwise = on_counter_clockwise

    async with serve(handler, HOST, PORT):
        print(f"encoder bridge listening on ws://{HOST}:{PORT}")
        asyncio.create_task(idle_watcher(loop))
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
