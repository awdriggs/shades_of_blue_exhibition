let count = 0;

// rotary encoder stream, fed by a local bridge script (gpiozero -> websocket)
// expected message shape: { type: 'encoder', value: <int step count> }
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
      count = data.value;
      redraw();
    }
  } catch (error) {
    console.error('Error parsing encoder message:', error);
  }
};

function setup() {
  createCanvas(800, 800);
  noLoop();
  textAlign(CENTER, CENTER);
}

function draw() {
  background(0);
  fill(255);
  noStroke();
  textSize(120);
  text(count, width / 2, height / 2);
}
