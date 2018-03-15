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

const cyl = (function() {
  const positions = [];
  const normals = [];

  const FACETS = 6;
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

  return {
    positions: positions,
    normals: normals,
  };
})();

const cyl_indices = [
  ...[0, 1, 2],
  ...[1, 3, 2],
  ...[2, 3, 4],
  ...[3, 5, 4],
  ...[4, 5, 6],
  ...[5, 7, 6],
  ...[6, 7, 8],
  ...[7, 9, 8],
  ...[8, 9, 10],
  ...[9, 11, 10],
  ...[10, 11, 0],
  ...[11, 1, 0],
];

class RenderContext {
  origin: Vec3;
  ending: Vec3;
  temp: Vec3;
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
  indices: number[];

  constructor() {
    this.origin = vec3.fromValues(0, 0, 0);
    this.ending = vec3.fromValues(0, 0, 0);
    this.temp = vec3.create();
    this.color = vec4.fromValues(1, 1, 1, 1);

    this.temp_vec4 = [];
    this.temp_vec4_pos = 0;

    this.stack = [];

    this.triangle_positions = [];
    this.triangle_colors = [];
    this.triangle_indices = [];
    this.triangle_normals = [];

    this.positions = [];
    this.colors = [];
    this.indices = [];
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
    const LINES_ARE_POLYGONS = true;

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
        this.triangle_indices.push(...cyl_indices.map(i => i + start_index));
      } finally {
        this.freeTempVec4(mark);
      }
    } else {
      this.ending[2] = -length;
      const ts = vec3.transformMat4(vec3.create(), this.origin, matrix);
      const te = vec3.transformMat4(vec3.create(), this.ending, matrix);

      this.indices.push(this.positions.length, this.positions.length + 1);
      this.colors.push(vec4.clone(this.color), vec4.clone(this.color));
      this.positions.push(ts, te);
    }
  }

  vertex(matrix) {
    this.positions.push(vec3.transformMat4(vec3.create(), this.origin, matrix));
    this.colors.push(vec4.clone(this.color));
  }

  pushPolygon() {
    this.stack.push({
      positions: this.positions,
      colors: this.colors,
      indices: this.indices,
      current_color: this.color,
    });
    this.positions = [];
    this.colors = [];
    this.indices = [];
    this.color = vec4.clone(this.color);
  }

  popPolygon() {
    if (this.positions.length >= 3) {
      const mark = this.markTempVec4();
      try {
        const start = this.triangle_positions.length;
        this.triangle_positions.push(...this.positions);
        this.triangle_colors.push(...this.colors);

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
          vec3.cross((tv2: any), (tv2: any), (tv1: any));

          vec4.add(this.triangle_normals[ti0], this.triangle_normals[ti0], tv2);
          vec4.add(this.triangle_normals[ti1], this.triangle_normals[ti1], tv2);
          vec4.add(this.triangle_normals[ti2], this.triangle_normals[ti2], tv2);
        }

        // Why am I normalizing the vectors on the CPU though? We could just
        // normalize them in the vector shader.
        for (let i = 0; i < this.positions.length; i++) {
          vec4.normalize(
            this.triangle_normals[start + i],
            this.triangle_normals[start + i]
          );
        }
      } finally {
        this.freeTempVec4(mark);
      }
    }

    const { positions, colors, indices, current_color } = this.stack.pop();
    this.positions = positions;
    this.colors = colors;
    this.indices = indices;
    this.color = current_color;
  }

  setColor(r, g, b) {
    vec4.set(this.color, r, g, b, 1);
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
const vsSource = `
attribute vec4 aVertexPosition;
attribute vec4 aVertexColor;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying lowp vec4 vColor;

void main() {
  gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
  vColor = aVertexColor;
}
`;
const fsSource = `
varying lowp vec4 vColor;

void main() {
  gl_FragColor = vColor;
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
  const colorBuffer = gl.createBuffer();

  return {
    position: positionBuffer,
    color: colorBuffer,
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

  const colors = [];
  for (let i = 0; i < obj.colors.length; i++) {
    colors.push(...obj.colors[i]);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.lines.color);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

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

  const tri_colors = [];
  for (let i = 0; i < obj.triangle_colors.length; i++) {
    tri_colors.push(...obj.triangle_colors[i]);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.triangles.color);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tri_colors), gl.STATIC_DRAW);

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
      vertexColor: gl.getAttribLocation(shaderProgram, "aVertexColor"),
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

  {
    const numComponents = 4;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.lines.color);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexColor,
      numComponents,
      type,
      normalize,
      stride,
      offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
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

  {
    const numComponents = 4;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.triangles.color);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexColor,
      numComponents,
      type,
      normalize,
      stride,
      offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
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
