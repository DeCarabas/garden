// @flow
// @format
const { mat4, vec3 } = require("gl-matrix");

type production = {| probability: number, value: string[] |};

// parse a rules dictionary into a more usable form.
function parse_rules(rule_dictionary: {
  [string]: string | string[],
}): { [string]: production[] } {
  function parse_string(rule_value: string) {
    // Symbols stand alone, whitespace is ignored, everything between
    // parenthesis are treated as a single symbol.
    const symbols = [];
    let i = 0;
    while (i < rule_value.length) {
      switch (rule_value[i]) {
        case " ":
          break;
        case "(":
          {
            i++;
            const start = i;
            while (i < rule_value.length && rule_value[i] != ")") {
              i++;
            }
            symbols.push(rule_value.substr(start, i - start));
          }
          break;
        default:
          symbols.push(rule_value[i]);
          break;
      }
      i++;
    }
    return symbols;
  }

  const result = {};
  for (const rule in rule_dictionary) {
    let new_value;
    let rule_value = rule_dictionary[rule];
    if (typeof rule_value === "string") {
      new_value = [{ probability: 1, value: parse_string(rule_value) }];
    } else if (rule_value instanceof Array) {
      new_value = rule_value.map(r => {
        return { probability: 1.0 / rule_value.length, value: parse_string(r) };
      });
    } else {
      throw Error(
        "Not supported: rule of type " + typeof rule_value + ": " + rule_value
      );
    }
    result[rule] = new_value;
  }
  return result;
}

// Here are a gallery of systems that I'm playing with!
const systems = {
  // Two-dimensional hilbert curve
  hilbert2d: {
    initial: ["L"],
    angle: toRadians(90),
    initial_steps: 3,
    rules: parse_rules({
      L: "+RF-LFL-FR+",
      R: "-LF+RFR+FL-",
    }),
  },

  // Three-dimensional hilbert curve
  hilbert3d: {
    initial: ["A"],
    angle: toRadians(90),
    initial_steps: 2,
    rules: parse_rules({
      A: "B-F+CFC+F-D&F^D-F+&&CFC+F+B//",
      B: "A&F^CFB^F^D^^-F-D^|F^B|FC^F^A//",
      C: "|D^|F^B-F+C^F^A&&FA&F^C+F+B^F^D//",
      D: "|CFB-F+B|FA&F^A&&FB-F+B|FC//",
    }),
  },

  // Example 'f' of axial trees, kinda pretty.
  axialf: {
    initial: ["X"],
    angle: toRadians(22.5),
    initial_steps: 5,
    rules: parse_rules({
      X: "F-[[X]+X]+F[+FX]-X",
      F: "FF",
    }),
  },

  // "A three-dimensional bush-like structure"
  // This one has some instructions for colors and shapes which I haven't
  // implemented yet.
  first_bush: {
    initial: ["A"],
    angle: toRadians(22.5),
    initial_steps: 7,
    rules: parse_rules({
      A: "[&FL!A]/////'[&FL!A]///////'[&FL!A]",
      F: "S/////F",
      S: "FL",
      L: "['''^^{-f+f+f-|-f+f+f}]",
    }),
  },

  flower: {
    initial: ["plant"],
    angle: toRadians(18),
    initial_steps: 5,
    rules: parse_rules({
      plant:
        "(internode) + [(plant) + (flower)] - - // [ - - (leaf)] (internode)" +
        "[ + + (leaf)] - [ (plant) (flower) ] + + (plant) (flower)",
      internode: "F (sec) [// & & (leaf)] [// ^ ^ (leaf)] F (seg)",
      seg: "(seg) F (seg)",
      leaf: "[' { + f - ff - f + | + f - ff - f } ]",
      flower:
        "[& & & (pedicel) ' / (wedge) //// (wedge) //// (wedge) //// (wedge)" +
        "//// (wedge) ]",
      pedicel: "FF",
      wedge: "['^F][{&&&&-f+f|-f+f}]",
    }),
  },

  stochastic: {
    initial: ["F"],
    angle: toRadians(22.5),
    initial_steps: 5,
    rules: parse_rules({
      F: ["F[+F]F[-F]F", "F[+F]F", "F[-F]F"],
    }),
  },
};

const { initial, angle, initial_steps, rules } = systems["stochastic"];

function rewrite(state, rules) {
  let result = [];
  for (let i = 0; i < state.length; i++) {
    const current = state[i];
    const replacements = rules[current] || [];
    if (replacements.length == 0) {
      result.push(current);
    } else if (replacements.length == 1) {
      result.push(...replacements[0].value);
    } else {
      let target = Math.random();
      const replacement =
        replacements.find(p => {
          target -= p.probability;
          return target <= 0;
        }) || replacements[replacements.length - 1];
      result.push(...replacement.value);
    }
  }
  return result;
}

let state = initial;
let DEBUG_RENDER_LIMIT = state.length;
function step() {
  state = rewrite(state, rules);
  DEBUG_RENDER_LIMIT = state.length;
}

for (let i = 0; i < initial_steps; i++) {
  step();
}

// Rendering stuff
class MeasureContext {
  min: vec3;
  max: vec3;

  constructor() {
    this.min = vec3.fromValues(0, 0, 0);
    this.max = vec3.fromValues(0, 0, 0);
  }

  line(matrix, length) {
    const target = vec3.create();
    vec3.transformMat4(target, [0, 0, 0], matrix);
    vec3.min(this.min, this.min, target);
    vec3.max(this.max, this.max, target);

    vec3.transformMat4(target, [0, 0, length], matrix);
    vec3.min(this.min, this.min, target);
    vec3.max(this.max, this.max, target);
  }
}

class RenderContext {
  gl: WebGLRenderingContext;
  initial_matrix: mat4;
  target_matrix: mat4;
  projection_matrix: mat4;
  scale_vec: vec3;
  translate_vec: vec3;

  constructor(gl, projection_matrix, initial_matrix) {
    this.gl = gl;

    // Translate in by a little bit, just so that the center is the base of the
    // cube.
    this.initial_matrix = mat4.create();
    mat4.translate(this.initial_matrix, initial_matrix, [0, 0, -0.5]);

    this.projection_matrix = projection_matrix;
    this.target_matrix = mat4.create();

    const LINE_THICKNESS = 0.1;
    this.scale_vec = [LINE_THICKNESS, LINE_THICKNESS, 1];
    this.translate_vec = [0, 0, 0];
  }

  line(matrix, length) {
    this.scale_vec[2] = length;
    this.translate_vec[2] = -length / 2;

    mat4.multiply(this.target_matrix, this.initial_matrix, matrix);
    mat4.translate(this.target_matrix, this.target_matrix, this.translate_vec);
    mat4.scale(this.target_matrix, this.target_matrix, this.scale_vec);
    drawCube(this.gl, this.projection_matrix, this.target_matrix);
  }
}

function render(state, context, config) {
  let { step_length, angle_delta } = config;
  const state_stack = [];

  // These head and left vectors are somewhat arbitrary?
  const head_vector = vec3.fromValues(0, 0, -1);
  const left_vector = vec3.fromValues(-1, 0, 0);
  const up_vector = vec3.create();
  vec3.cross(up_vector, head_vector, left_vector);

  // TODO: Actually initialize by head/left/up?
  let current_matrix: mat4 = mat4.create();

  vec3.scale(head_vector, head_vector, step_length);

  for (let i = 0; i < state.length && i < DEBUG_RENDER_LIMIT; i++) {
    const current = state[i];
    if (current == "F") {
      // Draw a "line" (always draws along -Z, which is also head.)
      context.line(current_matrix, step_length);
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
    }
  }
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180.0);
}

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

    //gl_FragColor = vec4(vColor.rgb * vLighting, vColor.a);
    gl_FragColor = vec4(vLighting, 1.0);
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
    ...[-0.5, -0.5, 0.5],
    ...[0.5, -0.5, 0.5],
    ...[0.5, 0.5, 0.5],
    ...[-0.5, 0.5, 0.5],

    // Back face
    ...[-0.5, -0.5, -0.5],
    ...[-0.5, 0.5, -0.5],
    ...[0.5, 0.5, -0.5],
    ...[0.5, -0.5, -0.5],

    // Top face
    ...[-0.5, 0.5, -0.5],
    ...[-0.5, 0.5, 0.5],
    ...[0.5, 0.5, 0.5],
    ...[0.5, 0.5, -0.5],

    // Bottom face
    ...[-0.5, -0.5, -0.5],
    ...[0.5, -0.5, -0.5],
    ...[0.5, -0.5, 0.5],
    ...[-0.5, -0.5, 0.5],

    // Right face
    ...[0.5, -0.5, -0.5],
    ...[0.5, 0.5, -0.5],
    ...[0.5, 0.5, 0.5],
    ...[0.5, -0.5, 0.5],

    // Left face
    ...[-0.5, -0.5, -0.5],
    ...[-0.5, -0.5, 0.5],
    ...[-0.5, 0.5, 0.5],
    ...[-0.5, 0.5, -0.5],
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
  step_length: 0.5,
  angle_delta: angle,
};

function draw(gl, cubeRotation) {
  // Step 1: Measure the boundaries of the plant.
  const measure_context = new MeasureContext();
  render(state, measure_context, render_config);

  // Let's just look at the middle of the bounding box...
  // (Borrow "center" for a second to figure out the bounding box size.)
  const center = vec3.create();
  const radius =
    vec3.length(
      vec3.subtract(center, measure_context.max, measure_context.min)
    ) / 2;
  // (Now actually compute the center point of the bounding box.)
  vec3.lerp(center, measure_context.min, measure_context.max, 0.5);
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
  // mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -6.0]);
  // mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation * 0.7, [0, 1, 0]);

  const ctx = new RenderContext(gl, projectionMatrix, modelViewMatrix);
  render(state, ctx, render_config);
  // drawCube(gl, projectionMatrix, modelViewMatrix);
}

function drawCube(gl, projectionMatrix, modelViewMatrix) {
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

const stepButton = document.getElementById("step");
if (!stepButton) {
  throw Error("Cannot find step button.");
}
stepButton.addEventListener("click", step);

const debugStepButton = document.getElementById("debug_plus");
if (debugStepButton) {
  debugStepButton.addEventListener("click", function() {
    DEBUG_RENDER_LIMIT += 1;
    //console.log(DEBUG_RENDER_LIMIT, state.substr(0, DEBUG_RENDER_LIMIT));
  });
}

const debugMinusButton = document.getElementById("debug_minus");
if (debugMinusButton) {
  debugMinusButton.addEventListener("click", function() {
    DEBUG_RENDER_LIMIT -= 1;
    //console.log(DEBUG_RENDER_LIMIT, state.substr(0, DEBUG_RENDER_LIMIT));
  });
}
