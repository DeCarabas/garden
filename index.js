// The core functionality for l-systems is like this.
function rewrite(state, rules) {
  let result = "";
  for (let i = 0; i < state.length; i++) {
    const current = state[i];
    const replacements = rules[current] || [];
    if (replacements.length == 0) {
      result += current;
    } else if (replacements.length == 1) {
      result += replacements[0];
    } else {
      throw new Error("Unsupported as of yet.");
    }
  }
  return result;
}

function move(x, y, heading, length) {
  const dx = length * Math.cos(heading);
  const dy = length * Math.sin(heading);
  return [x + dx, y + dy];
}

function render(state, context, config) {
  const ANGLE_DELTA = Math.PI * 0.5;

  let { x, y, heading, step_length } = config;

  context.beginPath();
  context.moveTo(x, y);

  for (let i = 0; i < state.length; i++) {
    const current = state[i];
    if (current == "F") {
      // Move forward by straight_length
      const [new_x, new_y] = move(x, y, heading, step_length);
      context.lineTo(new_x, new_y);
      x = new_x;
      y = new_y;
    } else if (current == "f") {
      const [new_x, new_y] = move(x, y, heading, step_length);
      context.moveTo(new_x, new_y);
      x = new_x;
      y = new_y;
    } else if (current == "+") {
      heading += ANGLE_DELTA;
    } else if (current == "-") {
      heading -= ANGLE_DELTA;
    }
  }

  context.stroke();
}

// Rewrite rules.
const initial = "F-F-F-F";
const rules = {
  F: ["F-F+F+FF-F-F+F"],
};

const garden = document.getElementById("garden");
const gardenContext = garden.getContext("2d");

const render_config = {
  x: garden.width * 0.25,
  y: garden.height * 0.75,
  heading: 0,
  step_length: garden.width / 2,
};

let state = initial;
let step_length = garden.width / 2;
function draw() {
  gardenContext.clearRect(0, 0, garden.width, garden.height);
  render(state, gardenContext, render_config);
}

function step() {
  state = rewrite(state, rules);
  render_config.step_length /= 4;
  draw();
}

const stepButton = document.getElementById("step");
stepButton.addEventListener("click", step);
draw();
