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

STATE_MIN = 0
STATE_MAX = 7
STATE_DEFAULT = 1
IDLE_TIMEOUT = 30

state = STATE_DEFAULT
clients = set()
last_activity = time.monotonic()


def broadcast(loop):
    if not clients:
        return
    message = json.dumps({"type": "encoder", "value": state})
    for client in list(clients):
        asyncio.run_coroutine_threadsafe(client.send(message), loop)


async def handler(websocket):
    clients.add(websocket)
    print(f"client connected ({len(clients)} total)")
    try:
        await websocket.send(json.dumps({"type": "encoder", "value": state}))
        async for _ in websocket:
            pass  # this bridge doesn't expect messages from the browser
    finally:
        clients.discard(websocket)
        print(f"client disconnected ({len(clients)} total)")


async def idle_watcher(loop):
    global state
    while True:
        await asyncio.sleep(1)
        if state != STATE_DEFAULT and time.monotonic() - last_activity >= IDLE_TIMEOUT:
            state = STATE_DEFAULT
            print(f"idle {IDLE_TIMEOUT}s -> reset to {state}")
            broadcast(loop)


async def main():
    global state, last_activity
    loop = asyncio.get_running_loop()

    def on_clockwise():
        global state, last_activity
        last_activity = time.monotonic()
        if state >= STATE_MAX:
            return
        state += 1
        print(f"CW  -> {state}")
        broadcast(loop)

    def on_counter_clockwise():
        global state, last_activity
        last_activity = time.monotonic()
        if state <= STATE_MIN:
            return
        state -= 1
        print(f"CCW -> {state}")
        broadcast(loop)

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
