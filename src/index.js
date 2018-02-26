// @flow
// @format
const { mat4 } = require("gl-matrix");

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
  /*::
  min_x: number;
  min_y: number;
  max_x: number;
  max_y: number;
  */

  constructor() {
    this.min_x = 0;
    this.max_x = 0;
    this.min_y = 0;
    this.max_y = 0;
  }
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

// HTML mechanics, WebGL bullshit.
const vsSource = `
attribute vec4 aVertexPosition;
attribute vec3 aVertexNormal;
attribute vec4 aVertexColor;

uniform mat4 uNormalMatrix;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying lowp vec4 vColor;
varying highp vec4 vNormal;

void main() {
  gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
  vColor = aVertexColor;
  vNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);
}
`;
const fsSource = `
  varying lowp vec4 vColor;
  varying highp vec4 vNormal;

  void main() {
    highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
    highp vec3 directionalLightColor = vec3(1, 1, 1);
    highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

    highp float directional = max(dot(vNormal.xyz, directionalVector), 0.0);
    highp vec3 vLighting = ambientLight + (directionalLightColor * directional);

    gl_FragColor = vec4(vColor.rgb * vLighting, vColor.a);
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

function initBuffers(gl) {
  const positions = [
    // Front face
    ...[-1.0, -1.0, 1.0],
    ...[1.0, -1.0, 1.0],
    ...[1.0, 1.0, 1.0],
    ...[-1.0, 1.0, 1.0],

    // Back face
    ...[-1.0, -1.0, -1.0],
    ...[-1.0, 1.0, -1.0],
    ...[1.0, 1.0, -1.0],
    ...[1.0, -1.0, -1.0],

    // Top face
    ...[-1.0, 1.0, -1.0],
    ...[-1.0, 1.0, 1.0],
    ...[1.0, 1.0, 1.0],
    ...[1.0, 1.0, -1.0],

    // Bottom face
    ...[-1.0, -1.0, -1.0],
    ...[1.0, -1.0, -1.0],
    ...[1.0, -1.0, 1.0],
    ...[-1.0, -1.0, 1.0],

    // Right face
    ...[1.0, -1.0, -1.0],
    ...[1.0, 1.0, -1.0],
    ...[1.0, 1.0, 1.0],
    ...[1.0, -1.0, 1.0],

    // Left face
    ...[-1.0, -1.0, -1.0],
    ...[-1.0, -1.0, 1.0],
    ...[-1.0, 1.0, 1.0],
    ...[-1.0, 1.0, -1.0],
  ];
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const faceColors = [
    [1.0, 1.0, 1.0, 1.0], // Front face: white
    [1.0, 0.0, 0.0, 1.0], // Back face: red
    [0.0, 1.0, 0.0, 1.0], // Top face: green
    [0.0, 0.0, 1.0, 1.0], // Bottom face: blue
    [1.0, 1.0, 0.0, 1.0], // Right face: yellow
    [1.0, 0.0, 1.0, 1.0], // Left face: purple
  ];
  let colors = [];
  for (let j = 0; j < faceColors.length; j++) {
    const c = faceColors[j];
    colors = colors.concat(c, c, c, c);
  }

  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  const vertexNormals = [
    // Front
    ...[0.0, 0.0, 1.0],
    ...[0.0, 0.0, 1.0],
    ...[0.0, 0.0, 1.0],
    ...[0.0, 0.0, 1.0],

    // Back
    ...[0.0, 0.0, -1.0],
    ...[0.0, 0.0, -1.0],
    ...[0.0, 0.0, -1.0],
    ...[0.0, 0.0, -1.0],

    // Top
    ...[0.0, 1.0, 0.0],
    ...[0.0, 1.0, 0.0],
    ...[0.0, 1.0, 0.0],
    ...[0.0, 1.0, 0.0],

    // Bottom
    ...[0.0, -1.0, 0.0],
    ...[0.0, -1.0, 0.0],
    ...[0.0, -1.0, 0.0],
    ...[0.0, -1.0, 0.0],

    // Right
    ...[1.0, 0.0, 0.0],
    ...[1.0, 0.0, 0.0],
    ...[1.0, 0.0, 0.0],
    ...[1.0, 0.0, 0.0],

    // Left
    ...[-1.0, 0.0, 0.0],
    ...[-1.0, 0.0, 0.0],
    ...[-1.0, 0.0, 0.0],
    ...[-1.0, 0.0, 0.0],
  ];
  const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(vertexNormals),
    gl.STATIC_DRAW
  );

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.
  const indices = [
    ...[...[0, 1, 2], ...[0, 2, 3]], // front
    ...[...[4, 5, 6], ...[4, 6, 7]], // back
    ...[...[8, 9, 10], ...[8, 10, 11]], // top
    ...[...[12, 13, 14], ...[12, 14, 15]], // bottom
    ...[...[16, 17, 18], ...[16, 18, 19]], // right
    ...[...[20, 21, 22], ...[20, 22, 23]], // left
  ];
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );

  return {
    position: positionBuffer,
    color: colorBuffer,
    indices: indexBuffer,
    normals: normalBuffer,
  };
}

function setup(gl) {
  gl.clearColor(0, 0, 0, 1);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
      vertexColor: gl.getAttribLocation(shaderProgram, "aVertexColor"),
      vertexNormal: gl.getAttribLocation(shaderProgram, "aVertexNormal"),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(
        shaderProgram,
        "uProjectionMatrix"
      ),
      normalMatrix: gl.getUniformLocation(shaderProgram, "uNormalMatrix"),
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
  x: 0,
  y: 0,
  heading: Math.PI * 1.5,
  step_length: 10,
  step_factor: 1,
  angle_delta: angle,
};

let state = initial;
function draw(gl, cubeRotation) {
  // Step 1: Measure the boundaries of the plant.
  const measure_context = new MeasureContext();
  render(state, measure_context, render_config);
  const render_width = measure_context.max_x - measure_context.min_x;
  const render_height = measure_context.max_y - measure_context.min_y;

  // Step 2: Draw the plant.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const fieldOfView = toRadians(45);
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;

  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

  const modelViewMatrix = mat4.create();
  mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -6.0]);
  mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation * 0.7, [0, 1, 0]);
  mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation, [0, 0, 1]);

  const normalMatrix = mat4.create();
  mat4.invert(normalMatrix, modelViewMatrix);
  mat4.transpose(normalMatrix, normalMatrix);

  {
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
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
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normals);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexNormal,
      numComponents,
      type,
      normalize,
      stride,
      offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);
  }

  {
    const numComponents = 4;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
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

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

  gl.useProgram(programInfo.program);
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    projectionMatrix
  );
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.normalMatrix,
    false,
    normalMatrix
  );
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelViewMatrix,
    false,
    modelViewMatrix
  );

  {
    const vertexCount = 36;
    const type = gl.UNSIGNED_SHORT;
    const offset = 0;
    gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
  }

  // gardenContext.clearRect(0, 0, garden.width, garden.height);
  // gardenContext.save();
  // gardenContext.scale(
  //   garden.width / render_width,
  //   garden.height / render_height
  // );
  // gardenContext.translate(-measure_context.min_x, -measure_context.min_y);
  // render(state, gardenContext, render_config);
  // gardenContext.restore();
}

let then = 0;
let rotation = 0;
function onFrame(now) {
  now *= 0.001;
  const deltaTime = now - then;
  then = now;

  rotation += deltaTime;

  draw(gardenContext, rotation);
  requestAnimationFrame(onFrame);
}
requestAnimationFrame(onFrame);

function step() {
  state = rewrite(state, rules);
  render_config.step_length /= render_config.step_factor;
}
const stepButton = document.getElementById("step");
if (!stepButton) {
  throw Error("Cannot find step button.");
}
stepButton.addEventListener("click", step);
