const DEVICE_ID = 'ams01';
const MINUTES_PER_DAY = 1440;
const MAX_DAYS = 7;
const MAX_LIMIT = MAX_DAYS * MINUTES_PER_DAY;

const DIAMETER = 1080;
const REVEAL_RATE = 40; // bars/frame the display eases toward the target

let bars = [];
let encoderState = 1;
let displayedCount = 1;

// encoder state stream, fed by the local bridge (gpiozero -> websocket)
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
    if (data.type === 'encoder' && typeof data.value === 'number') {
      encoderState = data.value;
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
      if (bars.length > MAX_LIMIT) bars.pop();
      redraw();
    }
  } catch (error) {
    console.error('Error parsing data message:', error);
  }
};

function preload() {
  loadJSON(
    `https://micro-api.awdokku.site/api/readings/shades-of-blue?limit=${MAX_LIMIT}&device=${DEVICE_ID}`,
    (data) => { bars = data.readings; }
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  loop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(255);

  if (bars.length === 0) return;

  const targetCount = constrain(
    encoderState <= 0 ? 1 : encoderState * MINUTES_PER_DAY,
    1,
    bars.length
  );

  if (displayedCount < targetCount) {
    displayedCount = min(targetCount, displayedCount + REVEAL_RATE);
  } else if (displayedCount > targetCount) {
    displayedCount = max(targetCount, displayedCount - REVEAL_RATE);
  }

  const dCount = round(displayedCount);
  const cx = width / 2;
  const cy = height / 2;
  const r = DIAMETER / 2;
  const sw = (TWO_PI * r) / dCount;

  strokeWeight(sw);

  for (let i = 0; i < dCount; i++) {
    const angle = map(i, 0, dCount, -HALF_PI, -HALF_PI + TWO_PI);
    const rgb = bars[i].values;
    stroke(rgb.r, rgb.g, rgb.b);
    line(cx, cy, cx + cos(angle) * r, cy + sin(angle) * r);
  }
}

function keyPressed() {
  if (key === 'g') {
    saveGif('thumb', floor(random(3, 8)));
  } else if (key === 'p') {
    saveCanvas('thumb', 'jpg');
  }
}
