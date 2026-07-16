const DEVICE_ID = 'ams01';
const FETCH_LIMIT = 1_000_000; // effectively "everything" the API has for this device

const READINGS_DEFAULT = 1440; // 24h of one-minute readings, matches the bridge's idle-reset default
const READINGS_STEP = 100;

const DIAMETER = 1080;

let bars = [];
let count = READINGS_DEFAULT;

// encoder direction stream, fed by the local bridge (gpiozero -> websocket).
// the bridge is a dumb relay -- it only reports raw ticks/resets, not an
// absolute value -- because only this side knows how much data currently
// exists (it changes live, and differs per device). Clamping happens here,
// on every tick, so a spin-past-the-end never leaves a "dead zone" before
// reversing direction has a visible effect.
const encoderSocket = new WebSocket('ws://localhost:8765');

encoderSocket.onopen = () => {
  console.log('Connected to encoder server');
};

encoderSocket.onclose = () => {
  console.log('Disconnected from encoder server');
};

encoderSocket.onerror = (error) => {
  console.error('Encoder socket error:', error);
};

encoderSocket.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    if (data.type !== 'encoder') return;
    if (data.reset) {
      count = READINGS_DEFAULT;
      redraw();
    } else if (typeof data.delta === 'number') {
      const maxCount = Math.max(1, bars.length);
      count = constrain(count + data.delta * READINGS_STEP, 1, maxCount);
      redraw();
    }
  } catch (error) {
    console.error('Error parsing encoder message:', error);
  }
};

// live color readings
const protocol = 'wss:';
const url = 'micro-api.awdokku.site/';
const dataSocket = new WebSocket(`${protocol}//${url}`);

dataSocket.onopen = () => {
  console.log('Connected to data server');
  dataSocket.send(JSON.stringify({ type: 'join', stream: 'shades-of-blue' }));
};

dataSocket.onclose = () => {
  console.log('Disconnected from data server');
};

dataSocket.onerror = (error) => {
  console.error('Data socket error:', error);
};

dataSocket.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    if (data.type === 'data' && data.values && data.device_id === DEVICE_ID) {
      bars.unshift({ values: data.values });
      redraw();
    }
  } catch (error) {
    console.error('Error parsing data message:', error);
  }
};

function preload() {
  loadJSON(
    `https://micro-api.awdokku.site/api/readings/shades-of-blue?limit=${FETCH_LIMIT}&device=${DEVICE_ID}`,
    (data) => { bars = data.readings; }
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  noLoop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  redraw();
}

function draw() {
  background(255);

  if (bars.length === 0) return;

  const dCount = constrain(count, 1, bars.length);
  const cx = width / 2;
  const cy = height / 2;

  if (dCount <= 1) {
    const rgb = bars[0].values;
    noStroke();
    fill(rgb.r, rgb.g, rgb.b);
    circle(cx, cy, DIAMETER);
    return;
  }

  // fixed overlap, sized to the finest slice this device currently has
  // (uses Math.PI directly -- p5's TWO_PI isn't attached to window until setup)
  const overlap = 10 * ((2 * Math.PI) / bars.length);

  // black backdrop under the wedges: any leftover sub-pixel seam shows as a
  // near-invisible dark sliver instead of a bright white line
  noStroke();
  fill(0);
  circle(cx, cy, DIAMETER);

  // overshoot each wedge into the next one (including the last wrapping back
  // onto the first) so the canvas underneath every boundary is always an
  // opaque slice color -- each wedge's own left edge then anti-aliases
  // against that opaque color instead of the (bright, seam-revealing) backdrop
  for (let i = 0; i < dCount; i++) {
    const a0 = map(i, 0, dCount, -HALF_PI, -HALF_PI + TWO_PI);
    const a1 = map(i + 1, 0, dCount, -HALF_PI, -HALF_PI + TWO_PI) + overlap;
    const rgb = bars[i].values;
    fill(rgb.r, rgb.g, rgb.b);
    arc(cx, cy, DIAMETER, DIAMETER, a0, a1, PIE);
  }
}

function keyPressed() {
  if (key === 'g') {
    saveGif('thumb', floor(random(3, 8)));
  } else if (key === 'p') {
    saveCanvas('thumb', 'jpg');
  }
}
