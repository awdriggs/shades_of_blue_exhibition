# Dev Log

## 2026-07-15 — multi-install support: readings-based navigation

**Why:** planning two physical installations (see
`github.com/awdriggs/shadesofblue`, which already runs separate `ams01` /
`ams02` / `bkny01` copies against the same API). Each device has a
different amount of history — `ams01` has ~4,280 readings, `bkny01` has
~2,192, `ams02` has 0 so far — so the old "state 0–7 = N days" model, which
assumed a fixed 7-day/10,080-reading ceiling shared by every install, no
longer fits.

**Changes:**

- `sketch.js` now fetches everything the API has for the hardcoded
  `DEVICE_ID` (`limit=1_000_000`, no 7-day cap) instead of capping at
  `MAX_DAYS * MINUTES_PER_DAY`. Live readings are unshifted onto `bars`
  with no pop/cap — the array is intentionally allowed to keep growing.
  Worth revisiting eventually if long-term memory footprint on the Pi
  becomes a problem, but that's a "later" concern, not a launch blocker.
- Encoder interaction changed from "jump by whole days" to "nudge by 100
  readings per detent," defaulting to 1,440 readings (last 24h — same
  default the old state-1 gave). Idle timeout back to default stays at 30s.
- **Protocol change between `encoder_bridge.py` and `sketch.js`:** the
  bridge no longer tracks or sends an absolute count. It's now a dumb
  relay — `{"type": "encoder", "delta": 1|-1}` per detent, and
  `{"type": "encoder", "reset": true}` on new connection or after 30s
  idle. `sketch.js` owns the actual `count`, clamping
  `constrain(count + delta*STEP, 1, bars.length)` **immediately on each
  tick received**, not just at render time.

  This replaced an initial design where the bridge itself tracked an
  unclamped absolute count (readings, not days). That was wrong: if a user
  spins clockwise well past however much data exists, an unclamped bridge
  count drifts arbitrarily far above `bars.length`, and reversing direction
  would then have to "unwind" that whole gap before the display visibly
  moved — a dead zone of potentially dozens of clicks. Clamping on every
  tick, in the one place that actually knows the live data length
  (`sketch.js`), avoids that entirely: an over-spin just plateaus at
  "everything," and the very next reversed tick moves the display right
  away. It also sidesteps keeping two copies of "how much data exists" in
  sync, since only the sketch ever knew that number in the first place.

- `README.md` updated to describe the new bridge message shape.

**Not done yet / next steps:**
- Actually splitting this into two per-device installs (separate
  `DEVICE_ID` hardcoded per copy, per the `ams01.html`/`ams02.html`
  pattern in the reference repo).
- No physical/browser test of the new encoder protocol yet this session —
  verify on the Pi before considering this done.
