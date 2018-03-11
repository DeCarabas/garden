// @flow
// @format
const { mat4, vec3, vec4 } = require("gl-matrix");
const { itemExpr, makeRuleSet, rewrite } = require("./lsystem");
const systems = require("./systems");

import type { item_expr } from "./lsystem";
import type { Mat4, Vec3, Vec4 } from "gl-matrix";

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

class RenderContext {
  origin: Vec3;
  ending: Vec3;
  temp: Vec3;

  stack;

  triangle_positions;
  triangle_indices;

  positions: Vec3[];
  indices: number[];

  constructor() {
    this.origin = vec3.fromValues(0, 0, 0);
    this.ending = vec3.fromValues(0, 0, 0);
    this.temp = vec3.create();

    this.stack = [];

    this.triangle_positions = [];
    this.triangle_indices = [];

    this.positions = [];
    this.indices = [];
  }

  line(matrix, length) {
    this.ending[2] = -length;

    const ts = vec3.transformMat4(vec3.create(), this.origin, matrix);
    const te = vec3.transformMat4(vec3.create(), this.ending, matrix);

    this.indices.push(this.positions.length, this.positions.length + 1);
    this.positions.push(ts, te);
  }

  vertex(matrix) {
    this.positions.push(vec3.transformMat4(vec3.create(), this.origin, matrix));
  }

  pushPolygon() {
    this.stack.push({
      positions: this.positions,
      indices: this.indices,
    });
    this.positions = [];
    this.indices = [];
  }

  popPolygon() {
    if (this.positions.length >= 3) {
      const start = this.triangle_positions.length;
      this.triangle_positions.push(...this.positions);
      for (let i = 1; i < this.positions.length - 1; i++) {
        this.triangle_indices.push(start, start + i, start + i + 1);
      }
    }

    const { positions, indices } = this.stack.pop();
    this.positions = positions;
    this.indices = indices;
  }

  render(state, config) {
    let { step_length, angle_delta } = config;
    const state_stack = [];
    const poly_stack = [];

    // These head and left vectors are somewhat arbitrary?
    const head_vector = vec3.fromValues(0, 0, -1);
    const left_vector = vec3.fromValues(-1, 0, 0);
    const up_vector = vec3.create();
    vec3.cross(up_vector, head_vector, left_vector);

    // TODO: Actually initialize by head/left/up?
    let current_matrix = mat4.create();
    let poly_depth = 0;

    vec3.scale(head_vector, head_vector, step_length);

    for (let i = 0; i < state.length && i < DEBUG_RENDER_LIMIT; i++) {
      const [current, _vals] = state[i];
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
        state_stack.push(mat4.clone(current_matrix));
      } else if (current == "]") {
        current_matrix = state_stack.pop();
      } else if (current == "{") {
        this.pushPolygon();
      } else if (current == ".") {
        this.vertex(current_matrix);
      } else if (current == "}") {
        this.popPolygon();
      }
    }
  }
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180.0);
}

// HTML mechanics, WebGL bullshit.
const vsSource = `
attribute vec4 aVertexPosition;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

void main() {
  gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
}
`;
const fsSource = `
  void main() {
    gl_FragColor = vec4(1,1,1,1);
  }
`;

function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const shaderProgram = gl.createProgram();
  if (shaderProgram == null) {
    throw new Error("Unable to create shader program");
  }
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error(
      "Unable to initialize the shader program: " +
        (gl.getProgramInfoLog(shaderProgram) || "")
    );
    throw new Error("Failed to init shader program");
  }

  return shaderProgram;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(
      "An error occurred compiling the shaders: " +
        (gl.getShaderInfoLog(shader) || "")
    );
    gl.deleteShader(shader);
    throw new Error("Failed to load shader");
  }

  return shader;
}

function createBuffers(gl) {
  const positionBuffer = gl.createBuffer();
  const indexBuffer = gl.createBuffer();

  return {
    position: positionBuffer,
    indices: indexBuffer,
  };
}

function fillBuffers(gl, buffers, obj) {
  const positions = [];
  for (let i = 0; i < obj.positions.length; i++) {
    positions.push(...obj.positions[i]);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.lines.position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.lines.indices);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(obj.indices),
    gl.STATIC_DRAW
  );

  const tri_positions = [];
  for (let i = 0; i < obj.triangle_positions.length; i++) {
    tri_positions.push(...obj.triangle_positions[i]);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.triangles.position);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(tri_positions),
    gl.STATIC_DRAW
  );

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.triangles.indices);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(obj.triangle_indices),
    gl.STATIC_DRAW
  );
}

function initBuffers(gl) {
  return {
    lines: createBuffers(gl),
    triangles: createBuffers(gl),
  };
}

function setup(gl) {
  gl.clearColor(0, 0, 0, 1);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.lineWidth(3.0);

  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(
        shaderProgram,
        "uProjectionMatrix"
      ),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
    },
  };
  return programInfo;
}

const garden = document.getElementById("garden");
if (!(garden && garden instanceof HTMLCanvasElement)) {
  throw Error("Cannot find garden.");
}
const gardenContext = garden.getContext("webgl");
if (gardenContext == null) {
  throw Error("Cannot get GL context.");
}
const programInfo = setup(gardenContext);
const buffers = initBuffers(gardenContext);

const render_config = {
  step_length: 0.5,
  angle_delta: angle,
};

function draw(gl, cubeRotation, plant) {
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
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

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

  drawCube(
    gl,
    projectionMatrix,
    modelViewMatrix,
    plant.indices.length,
    plant.triangle_indices.length
  );
}

function drawCube(
  gl,
  projectionMatrix,
  modelViewMatrix,
  lineVertexCount,
  triangleVertexCount
) {
  // == Lines ================================================================
  {
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.lines.position);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  }

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.lines.indices);

  gl.useProgram(programInfo.program);
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    (projectionMatrix: any)
  );
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelViewMatrix,
    false,
    (modelViewMatrix: any)
  );

  {
    const type = gl.UNSIGNED_SHORT;
    const offset = 0;
    gl.drawElements(gl.LINES, lineVertexCount, type, offset);
  }

  // == Triangles =============================================================
  {
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.triangles.position);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  }

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.triangles.indices);

  gl.useProgram(programInfo.program);
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    (projectionMatrix: any)
  );
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelViewMatrix,
    false,
    (modelViewMatrix: any)
  );

  {
    const type = gl.UNSIGNED_SHORT;
    const offset = 0;
    gl.drawElements(gl.TRIANGLES, triangleVertexCount, type, offset);
  }
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
