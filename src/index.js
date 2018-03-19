// @flow
// @format
const { mat4, vec3, vec4 } = require("gl-matrix");
const { rewrite } = require("./lsystem");
const { getFlatTriangleShader, getLineShader } = require("./shader");
const systems = require("./systems");

/*::
import type { item_expr } from "./lsystem";
import type { Mat4, Vec3, Vec4 } from "gl-matrix";
*/

const { initial, angle, initial_steps, rules } = systems.rando_flower;

let state;
let DEBUG_RENDER_LIMIT;

function step() {
  state = rewrite(state, rules);
  DEBUG_RENDER_LIMIT = state.length;
}

function init() {
  state = initial;
  DEBUG_RENDER_LIMIT = state.length;
  for (let i = 0; i < initial_steps; i++) {
    step();
  }
}
init();

const cyl = (function() {
  const positions = [];
  const normals = [];

  const FACETS = 24;
  const DIAMETER = 0.1;

  const delta = Math.PI * 2 / FACETS;
  const start = vec3.fromValues(DIAMETER / 2, 0, 0);
  const norm = vec4.fromValues(1, 0, 0, 0);
  for (let i = 0; i < FACETS; i++) {
    const angle = i * delta;
    const mat = mat4.fromZRotation(mat4.create(), angle);

    positions.push(vec3.transformMat4(vec3.create(), start, mat));
    normals.push(vec4.transformMat4(vec4.create(), norm, mat));
  }

  const TRIANGLES = FACETS * 2;
  const indices = [];
  for (let i = 0; i < FACETS; i++) {
    const start = i * 2;
    indices.push(
      ...[start + 0, start + 1, start + 2].map(n => n % TRIANGLES),
      ...[start + 1, start + 3, start + 2].map(n => n % TRIANGLES)
    );
  }

  return {
    positions: positions,
    normals: normals,
    indices: indices,
  };
})();

// This dumb helper is used to make casting easier when using flow comment
// syntax.
const as_any = x => /*:: ( */ x /*:: :any) */;

class RenderContext {
  /*::
  origin: Vec3;
  ending: Vec3;
  color: Vec4;

  temp_vec4;
  temp_vec4_pos;

  stack;

  triangle_positions;
  triangle_colors;
  triangle_indices;
  triangle_normals;

  positions: Vec3[];
  colors: Vec4[];

  line_positions;
  line_colors;
  line_thickness;
  line_borders;
  */

  constructor() {
    this.origin = vec3.fromValues(0, 0, 0);
    this.ending = vec3.fromValues(0, 0, 0);
    this.color = vec4.fromValues(1, 1, 1, 1);

    this.temp_vec4 = [];
    this.temp_vec4_pos = 0;

    this.stack = [];

    this.triangle_positions = [];
    this.triangle_colors = [];
    this.triangle_indices = [];
    this.triangle_normals = [];

    this.line_positions = [];
    this.line_colors = [];
    this.line_thickness = [];
    this.line_borders = [];

    this.positions = [];
    this.colors = [];
  }

  markTempVec4() {
    return this.temp_vec4_pos;
  }
  freeTempVec4(mark) {
    this.temp_vec4_pos = mark;
  }
  getTempVec4() {
    if (this.temp_vec4_pos == this.temp_vec4.length) {
      this.temp_vec4.push(vec4.create());
    }
    const result = this.temp_vec4[this.temp_vec4_pos];
    this.temp_vec4_pos++;
    return result;
  }

  line(matrix, length) {
    const LINES_ARE_POLYGONS = false;

    if (LINES_ARE_POLYGONS) {
      const mark = this.markTempVec4();
      try {
        const direction = this.getTempVec4();
        vec4.set(direction, 0, 0, -length, 0);
        vec4.transformMat4(direction, direction, matrix);

        const start_index = this.triangle_positions.length;
        const cyl_length = cyl.positions.length;
        for (let i = 0; i < cyl_length; i++) {
          const pt0 = vec3.transformMat4(
            vec3.create(),
            cyl.positions[i],
            matrix
          );
          const pt1 = vec3.clone(pt0);
          pt1[0] += direction[0];
          pt1[1] += direction[1];
          pt1[2] += direction[2];
          this.triangle_positions.push(pt0, pt1);

          const norm = vec4.transformMat4(
            vec4.create(),
            cyl.normals[i],
            matrix
          );
          this.triangle_normals.push(norm, norm);
          this.triangle_colors.push(this.color, this.color);
        }
        this.triangle_indices.push(...cyl.indices.map(i => i + start_index));
      } finally {
        this.freeTempVec4(mark);
      }
    } else {
      this.ending[2] = -length;
      const ts = vec3.transformMat4(vec3.create(), this.origin, matrix);
      const te = vec3.transformMat4(vec3.create(), this.ending, matrix);

      const LINE_THICKNESS = 0.2;
      const BORDER_THICKNESS = 0.5;

      this.line_positions.push(ts, te);
      this.line_colors.push(this.color, this.color);
      this.line_thickness.push(LINE_THICKNESS, LINE_THICKNESS);
      this.line_borders.push(BORDER_THICKNESS, BORDER_THICKNESS);
    }
  }

  vertex(matrix) {
    this.positions.push(vec3.transformMat4(vec3.create(), this.origin, matrix));
    this.colors.push(this.color);
  }

  pushPolygon() {
    this.stack.push({
      positions: this.positions,
      colors: this.colors,
      current_color: this.color,
    });
    this.positions = [];
    this.colors = [];
  }

  popPolygon() {
    const start = this.triangle_positions.length;
    if (this.positions.length >= 3) {
      const mark = this.markTempVec4();
      try {
        this.triangle_positions.push(...this.positions);
        this.triangle_colors.push(...this.colors);

        const OUTLINE_COLOR = vec4.fromValues(0, 0, 0, 1);
        for (let i = 0; i < this.positions.length; i++) {
          const curr = i;
          const next = (i + 1) % this.positions.length;
          this.line_positions.push(this.positions[curr], this.positions[next]);
          this.line_colors.push(OUTLINE_COLOR, OUTLINE_COLOR);
          this.line_thickness.push(0.05, 0.05);
          this.line_borders.push(0, 0);
        }

        for (let i = 0; i < this.positions.length; i++) {
          this.triangle_normals.push(vec4.fromValues(0, 0, 0, 0));
        }

        for (let i = 1; i < this.positions.length - 1; i++) {
          const ti0 = start;
          const ti1 = start + i;
          const ti2 = start + i + 1;

          this.triangle_indices.push(ti0, ti1, ti2);

          const tv0 = this.getTempVec4();
          const tv1 = this.getTempVec4();
          const tv2 = this.getTempVec4();

          const pt0 = this.triangle_positions[ti0];
          const pt1 = this.triangle_positions[ti1];
          const pt2 = this.triangle_positions[ti2];
          vec4.set(tv0, pt0[0], pt0[1], pt0[2], 0);
          vec4.set(tv1, pt1[0], pt1[1], pt1[2], 0);
          vec4.set(tv2, pt2[0], pt2[1], pt2[2], 0);

          vec4.sub(tv1, tv1, tv0);
          vec4.sub(tv2, tv2, tv0);
          vec3.cross(as_any(tv2), as_any(tv2), as_any(tv1));

          vec4.add(this.triangle_normals[ti0], this.triangle_normals[ti0], tv2);
          vec4.add(this.triangle_normals[ti1], this.triangle_normals[ti1], tv2);
          vec4.add(this.triangle_normals[ti2], this.triangle_normals[ti2], tv2);
        }
      } finally {
        this.freeTempVec4(mark);
      }
    }

    const { positions, colors, current_color } = this.stack.pop();
    this.positions = positions;
    this.colors = colors;
    this.color = current_color;
  }

  setColor(r, g, b) {
    this.color = vec4.fromValues(r, g, b, 1);
  }

  render(state, config) {
    let { step_length, angle_delta } = config;
    const state_stack = [];

    // These head and left vectors are somewhat arbitrary?
    const head_vector = vec3.fromValues(0, 0, -1);
    const left_vector = vec3.fromValues(-1, 0, 0);
    const up_vector = vec3.create();
    vec3.cross(up_vector, head_vector, left_vector);

    // TODO: Actually initialize by head/left/up?
    let current_matrix = mat4.create();

    vec3.scale(head_vector, head_vector, step_length);

    for (let i = 0; i < state.length && i < DEBUG_RENDER_LIMIT; i++) {
      const [current, vals] = state[i];
      if (current == "F") {
        // Draw a "line" (always draws along -Z, which is also head.)
        this.line(current_matrix, step_length);
        mat4.translate(current_matrix, current_matrix, head_vector);
      } else if (current == "f") {
        mat4.translate(current_matrix, current_matrix, head_vector);
      } else if (current == "+") {
        mat4.rotate(current_matrix, current_matrix, angle_delta, up_vector);
      } else if (current == "-") {
        mat4.rotate(current_matrix, current_matrix, -angle_delta, up_vector);
      } else if (current == "&") {
        mat4.rotate(current_matrix, current_matrix, angle_delta, left_vector);
      } else if (current == "^") {
        mat4.rotate(current_matrix, current_matrix, -angle_delta, left_vector);
      } else if (current == "\\") {
        mat4.rotate(current_matrix, current_matrix, angle_delta, head_vector);
      } else if (current == "/") {
        mat4.rotate(current_matrix, current_matrix, -angle_delta, head_vector);
      } else if (current == "|") {
        mat4.rotate(current_matrix, current_matrix, Math.PI, up_vector);
      } else if (current == "[") {
        state_stack.push({
          matrix: mat4.clone(current_matrix),
          color: vec4.clone(this.color),
        });
      } else if (current == "]") {
        const { matrix, color } = state_stack.pop();
        current_matrix = matrix;
        this.color = color;
      } else if (current == "{") {
        this.pushPolygon();
      } else if (current == ".") {
        this.vertex(current_matrix);
      } else if (current == "}") {
        this.popPolygon();
      } else if (current == "color") {
        if (vals.length == 3) {
          const [r, g, b] = vals;
          if (
            typeof r != "number" ||
            typeof g != "number" ||
            typeof b != "number"
          ) {
            throw Error("Args to color must be numbers");
          }
          this.setColor(r, g, b);
        } else {
          throw Error("Wrong number of arguments to color");
        }
      }
    }
  }
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180.0);
}

// HTML mechanics, WebGL bullshit.
function createBuffers(gl) {
  return {
    triangles: {
      position: gl.createBuffer(),
      normal: gl.createBuffer(),
      color: gl.createBuffer(),
      index: gl.createBuffer(),
      index_count: 0,
    },
    lines: {
      position: gl.createBuffer(),
      direction: gl.createBuffer(),
      next: gl.createBuffer(),
      prev: gl.createBuffer(),
      color: gl.createBuffer(),
      thickness: gl.createBuffer(),
      borderWidth: gl.createBuffer(),
      index: gl.createBuffer(),
      index_count: 0,
    },
  };
}

function fillLineBuffers(gl, buffers, obj) {
  const position = new Float32Array(obj.line_positions.length * 6);
  {
    let c = 0;
    for (let i = 0; i < obj.line_positions.length; i++) {
      const pos = obj.line_positions[i];
      position[c++] = pos[0];
      position[c++] = pos[1];
      position[c++] = pos[2];
      position[c++] = pos[0];
      position[c++] = pos[1];
      position[c++] = pos[2];
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.bufferData(gl.ARRAY_BUFFER, position, gl.STATIC_DRAW);

  const direction = new Float32Array(obj.line_positions.length * 2);
  {
    let c = 0;
    for (let i = 0; i < obj.line_positions.length; i++) {
      direction[c++] = 1;
      direction[c++] = -1;
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.direction);
  gl.bufferData(gl.ARRAY_BUFFER, direction, gl.STATIC_DRAW);

  const thickness = new Float32Array(obj.line_thickness.length * 2);
  {
    let c = 0;
    for (let i = 0; i < obj.line_thickness.length; i++) {
      thickness[c++] = obj.line_thickness[i];
      thickness[c++] = obj.line_thickness[i];
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.thickness);
  gl.bufferData(gl.ARRAY_BUFFER, thickness, gl.STATIC_DRAW);

  const borderWidth = new Float32Array(obj.line_borders.length * 2);
  {
    let c = 0;
    for (let i = 0; i < obj.line_borders.length; i++) {
      borderWidth[c++] = obj.line_borders[i];
      borderWidth[c++] = obj.line_borders[i];
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.borderWidth);
  gl.bufferData(gl.ARRAY_BUFFER, borderWidth, gl.STATIC_DRAW);

  const next = new Float32Array(position.length);
  for (let i = 0; i < position.length - 1; i++) {
    next[i] = position[i + 1];
  }
  next[next.length - 1] = position[position.length - 1];
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.next);
  gl.bufferData(gl.ARRAY_BUFFER, next, gl.STATIC_DRAW);

  const prev = new Float32Array(position.length);
  prev[0] = position[0];
  for (let i = 1; i < position.length; i++) {
    prev[i] = position[i - 1];
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.prev);
  gl.bufferData(gl.ARRAY_BUFFER, prev, gl.STATIC_DRAW);

  const color = new Float32Array(obj.line_colors.length * 8);
  {
    let c = 0;
    for (let i = 0; i < obj.line_colors.length; i++) {
      const col = obj.line_colors[i];
      color[c++] = col[0];
      color[c++] = col[1];
      color[c++] = col[2];
      color[c++] = col[3];
      color[c++] = col[0];
      color[c++] = col[1];
      color[c++] = col[2];
      color[c++] = col[3];
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
  gl.bufferData(gl.ARRAY_BUFFER, color, gl.STATIC_DRAW);

  // TODO: Make multiple line segments. Each pair of vertices in line_positions
  // is a distinct line segment, so don't build a triangle strip that connects
  // all of the segments.
  const vertex_count = position.length / 3; // Three points per vertex.
  const segment_count = vertex_count / 4; // Four vertices per segment.
  const index_count = segment_count * 6;
  // const triangle_count = segment_count * 2; // Two triangles per segment.
  // const index_count = triangle_count * 3; // Three indices per triangle.

  const indices = new Uint16Array(index_count);
  {
    let index = 0;
    let c = 0;
    while (index < position.length / 3) {
      indices[c++] = index + 0;
      indices[c++] = index + 1;
      indices[c++] = index + 2;
      indices[c++] = index + 2;
      indices[c++] = index + 1;
      indices[c++] = index + 3;
      index += 4; // Jump by two points in the line.
    }
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  buffers.index_count = indices.length;
}

function fillTriangleBuffers(gl, buffers, obj) {
  const tri_positions = new Float32Array(obj.triangle_positions.length * 3);
  {
    let c = 0;
    for (let i = 0; i < obj.triangle_positions.length; i++) {
      const pos = obj.triangle_positions[i];
      tri_positions[c++] = pos[0];
      tri_positions[c++] = pos[1];
      tri_positions[c++] = pos[2];
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.bufferData(gl.ARRAY_BUFFER, tri_positions, gl.STATIC_DRAW);

  const tri_colors = new Float32Array(obj.triangle_colors.length * 4);
  {
    let c = 0;
    for (let i = 0; i < obj.triangle_colors.length; i++) {
      const color = obj.triangle_colors[i];
      tri_colors[c++] = color[0];
      tri_colors[c++] = color[1];
      tri_colors[c++] = color[2];
      tri_colors[c++] = color[3];
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
  gl.bufferData(gl.ARRAY_BUFFER, tri_colors, gl.STATIC_DRAW);

  const tri_normals = new Float32Array(obj.triangle_normals.length * 4);
  {
    let c = 0;
    for (let i = 0; i < obj.triangle_normals.length; i++) {
      const norm = obj.triangle_normals[i];
      tri_normals[c++] = norm[0];
      tri_normals[c++] = norm[1];
      tri_normals[c++] = norm[2];
      tri_normals[c++] = norm[3];
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
  gl.bufferData(gl.ARRAY_BUFFER, tri_normals, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(obj.triangle_indices),
    gl.STATIC_DRAW
  );
  buffers.index_count = obj.triangle_indices.length;
}

function fillBuffers(gl, buffers, obj) {
  fillLineBuffers(gl, buffers.lines, obj);
  fillTriangleBuffers(gl, buffers.triangles, obj);
}

function setup(gl) {
  gl.clearColor(0, 0, 1, 1);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.lineWidth(3.0);
}

const garden = document.getElementById("garden");
if (!(garden && garden instanceof HTMLCanvasElement)) {
  throw Error("Cannot find garden.");
}
const gardenContext = garden.getContext("webgl");
if (gardenContext == null) {
  throw Error("Cannot get GL context.");
}
setup(gardenContext);
const flatTriangleShader = getFlatTriangleShader(gardenContext);
const lineShader = getLineShader(gardenContext);
const buffers = createBuffers(gardenContext);

const render_config = {
  step_length: 0.5,
  angle_delta: angle,
};

function draw(gl, cubeRotation, plant) {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (plant.positions.length == 0 && plant.triangle_positions.length == 0) {
    return;
  }

  // Step 1: Measure the boundaries of the plant.
  let min = vec3.clone(plant.positions[0] || plant.triangle_positions[0]);
  let max = vec3.clone(plant.positions[0] || plant.triangle_positions[0]);
  for (let i = 1; i < plant.positions.length; i++) {
    vec3.min(min, min, plant.positions[i]);
    vec3.max(max, max, plant.positions[i]);
  }
  for (let i = 0; i < plant.triangle_positions.length; i++) {
    vec3.min(min, min, plant.triangle_positions[i]);
    vec3.max(max, max, plant.triangle_positions[i]);
  }

  // Let's just look at the middle of the bounding box...
  // (Borrow "center" for a second to figure out the bounding box size.)
  const center = vec3.create();
  const radius = vec3.length(vec3.subtract(center, max, min)) / 2;
  // (Now actually compute the center point of the bounding box.)
  vec3.lerp(center, min, max, 0.5);
  center[0] = 0;

  // Step 2: Draw the plant.
  const fieldOfView = toRadians(45);
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 1000.0;

  const eyeDistance = Math.max(radius / Math.sin(fieldOfView * 0.5), 0.1);
  const eyeVector = [0, -(eyeDistance * 1.01), 0];
  const eyePosition = vec3.subtract(vec3.create(), center, eyeVector);

  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

  const modelViewMatrix = mat4.create();
  mat4.lookAt(modelViewMatrix, eyePosition, center, [0, 0, -1]);
  mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation, [0, 0, 1]);

  const flaProjection = new Float32Array(projectionMatrix);
  const flaModelView = new Float32Array(modelViewMatrix);
  flatTriangleShader.draw(
    buffers.triangles,
    buffers.triangles.index_count,
    flaProjection,
    flaModelView
  );
  lineShader.draw(
    buffers.lines,
    buffers.lines.index_count,
    flaProjection,
    flaModelView,
    false
  );
}

let plant;
function updatePlant() {
  plant = new RenderContext();
  window.DEBUG_PLANT = plant;
  plant.render(state, render_config);
  fillBuffers(gardenContext, buffers, plant);
}
updatePlant();

let then = 0;
let rotation = 0;
function onFrame(now) {
  now *= 0.001;
  const deltaTime = now - then;
  then = now;

  rotation += deltaTime;

  draw(gardenContext, rotation, plant);
  requestAnimationFrame(onFrame);
}
requestAnimationFrame(onFrame);

const stepButton = document.getElementById("step");
if (!stepButton) {
  throw Error("Cannot find step button.");
}
stepButton.addEventListener("click", () => {
  step();
  updatePlant();
});

const resetButton = document.getElementById("reset");
if (resetButton) {
  resetButton.addEventListener("click", () => {
    init();
    updatePlant();
  });
}

function logDebugRender() {
  // eslint-disable-next-line no-console
  console.log(
    DEBUG_RENDER_LIMIT,
    state
      .slice(0, DEBUG_RENDER_LIMIT)
      .map(i => i[0])
      .join()
  );
}

const debugStepButton = document.getElementById("debug_plus");
if (debugStepButton) {
  debugStepButton.addEventListener("click", function() {
    DEBUG_RENDER_LIMIT += 1;
    logDebugRender();
    updatePlant();
  });
}

const debugMinusButton = document.getElementById("debug_minus");
if (debugMinusButton) {
  debugMinusButton.addEventListener("click", function() {
    DEBUG_RENDER_LIMIT -= 1;
    logDebugRender();
    updatePlant();
  });
}
