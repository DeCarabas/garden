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

class MeasureContext {
  beginPath() {}
  stroke() {}
  moveTo(x, y) {
    if (this.min_x === undefined || x < this.min_x) {
      this.min_x = x;
    }
    if (this.max_x === undefined || x > this.max_x) {
      this.max_x = x;
    }
    if (this.min_y === undefined || y < this.min_y) {
      this.min_y = y;
    }
    if (this.max_y === undefined || y > this.max_y) {
      this.max_y = y;
    }
  }
  lineTo(x, y) {
    this.moveTo(x, y);
  }
}

function render(state, context, config) {
  let { x, y, heading, step_length, angle_delta } = config;
  const state_stack = [];

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
      heading += angle_delta;
    } else if (current == "-") {
      heading -= angle_delta;
    } else if (current == "[") {
      state_stack.push([x, y, heading]);
    } else if (current == "]") {
      [x, y, heading] = state_stack.pop();
      context.moveTo(x, y);
    }
  }

  context.stroke();
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180.0);
}

// Definition here:
const initial = "X";
const angle = toRadians(22.5);
const rules = {
  X: ["F-[[X]+X]+F[+FX]-X"],
  F: ["FF"],
};

// HTML mechanics
const garden = document.getElementById("garden");
const gardenContext = garden.getContext("2d");

const render_config = {
  x: 0,
  y: 0,
  heading: Math.PI * 1.5,
  step_length: 10,
  step_factor: 1,
  angle_delta: angle,
};

let state = initial;
let step_length = garden.width / 2;
function draw() {
  gardenContext.clearRect(0, 0, garden.width, garden.height);
  const measure_context = new MeasureContext();

  render(state, measure_context, render_config);
  const render_width = measure_context.max_x - measure_context.min_x;
  const render_height = measure_context.max_y - measure_context.min_y;

  gardenContext.save();
  gardenContext.scale(
    garden.width / render_width,
    garden.height / render_height
  );
  gardenContext.translate(-measure_context.min_x, -measure_context.min_y);
  render(state, gardenContext, render_config);
  gardenContext.restore();
}

function step() {
  state = rewrite(state, rules);
  render_config.step_length /= render_config.step_factor;
  draw();
}

const stepButton = document.getElementById("step");
stepButton.addEventListener("click", step);
draw();
