// @flow
// @format
const { mat4, vec3, vec4 } = require("gl-matrix");
const { makeRuleSet, rewrite } = require("./lsystem");

import type { item_expr } from "./lsystem";
import type { Mat4, Vec3, Vec4 } from "gl-matrix";

type production = {| probability: number, value: string[] |};

function parseItemExpr(rule_value: string): item_expr[] {
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
          symbols.push([rule_value.substr(start, i - start), []]);
        }
        break;
      default:
        symbols.push([rule_value[i], []]);
        break;
    }
    i++;
  }
  return symbols;
}

function itemExpr(chunks: string[], ...vals: any[]) {
  // One big string...
  let rule_value = "";
  for (let i = 0; i < chunks.length; i++) {
    rule_value += chunks[i];
    if (i < vals.length) {
      rule_value += vals[i].toString();
    }
  }
  return parseItemExpr(rule_value);
}

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
  // debug
  debug: {
    initial: [["F", []]],
    angle: toRadians(0),
    initial_steps: 0,
    rules: makeRuleSet({
      rules: {
        F: [{ next: itemExpr`FF` }],
      },
    }),
  },

  // Hexagonal gosper curve (not right)
  hex_gosper: {
    initial: ["F", "F1"],
    angle: toRadians(60),
    initial_steps: 4,
    rules: parse_rules({
      F1: "F(F1)+F(Fr)++F(Fr)-F(F1)--F(F1)F(F1)-F(Fr)+",
      Fr: "-F(F1)+F(Fr)F(Fr)++F(Fr)+F(F1)--F(F1)-F(Fr)",
    }),
  },

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
    initial: [["A", []]],
    angle: toRadians(90),
    initial_steps: 2,
    rules: makeRuleSet({
      rules: {
        A: [{ next: parseItemExpr("B-F+CFC+F-D&F^D-F+&&CFC+F+B//") }],
        B: [{ next: parseItemExpr("A&F^CFB^F^D^^-F-D^|F^B|FC^F^A//") }],
        C: [{ next: parseItemExpr("|D^|F^B-F+C^F^A&&FA&F^C+F+B^F^D//") }],
        D: [{ next: parseItemExpr("|CFB-F+B|FA&F^A&&FB-F+B|FC//") }],
      },
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
    rules: makeRuleSet({
      rules: {
        plant: [
          {
            next: itemExpr`
              (internode) + [(plant) + (flower)] - - // [ - - (leaf)]
              (internode) [ + + (leaf)] - [ (plant) (flower) ] + + (plant)
              (flower)
            `,
          },
        ],
        internode: [
          {
            next: itemExpr`F (sec) [// & & (leaf)] [// ^ ^ (leaf)] F (seg)`,
          },
        ],
        seg: [{ next: parseItemExpr("(seg) F (seg)") }],
        leaf: [{ next: itemExpr`[' { + f - ff - f + | + f - ff - f } ]` }],
        flower: [
          {
            next: itemExpr`
              [& & & (pedicel) ' / (wedge) //// (wedge) //// (wedge) ////
              (wedge) //// (wedge) ]
            `,
          },
        ],
        pedicel: [{ next: itemExpr`FF` }],
        wedge: [{ next: itemExpr`['^F][{&&&&-f+f|-f+f}]` }],
      },
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

  rando_flower: {
    initial: [["plant", []]],
    angle: toRadians(18),
    initial_steps: 5,
    rules: makeRuleSet({
      rules: {
        plant: [
          {
            next: itemExpr`
              (internode) + [(plant) + (flower)] - - // [ - - (leaf)] (internode)
              [ + + (leaf)] - [ (plant) (flower) ] + + (plant) (flower)
            `,
          },
        ],
        internode: [
          {
            next: itemExpr`F (sec) [// & & (leaf)] [// ^ ^ (leaf)] F (seg)`,
          },
        ],
        seg: [
          { next: itemExpr`(seg) [// & & (leaf)] [// ^ ^ (leaf)] F (seg)` },
          { next: itemExpr`(seg) F (seg)` },
          { next: itemExpr`(seg)` },
        ],
        leaf: [{ next: itemExpr`[' { + f - ff - f + | + f - ff - f } ]` }],
        flower: [
          {
            next: itemExpr`
              [& & & (pedicel) ' / (wedge) //// (wedge) //// (wedge) ////
              (wedge) //// (wedge)]
            `,
          },
        ],
        pedicel: [{ next: itemExpr`FF` }],
        wedge: [{ next: itemExpr`['^F][{&&&&-f+f|-f+f}]` }],
      },
    }),
  },
};

const { initial, angle, initial_steps, rules } = systems.hilbert3d;

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
  initial_matrix: Mat4;
  target_matrix: Mat4;
  scale_vec: Vec3;
  translate_vec: Vec3;

  positions: Vec3[];
  colors: Vec4[];
  vertexNormals: Vec3[];
  indices: number[];

  constructor() {
    // Translate in by a little bit, just so that the center is the base of the
    // cube.
    this.initial_matrix = mat4.create();
    mat4.fromTranslation(this.initial_matrix, [0, 0, -0.5]);

    this.target_matrix = mat4.create();

    const LINE_THICKNESS = 0.1;
    this.scale_vec = [LINE_THICKNESS, LINE_THICKNESS, 1];
    this.translate_vec = [0, 0, 0];

    this.positions = [];
    this.colors = [];
    this.vertexNormals = [];
    this.indices = [];
  }

  line(matrix, length) {
    this.scale_vec[2] = length;
    this.translate_vec[2] = -length / 2;

    mat4.multiply(this.target_matrix, this.initial_matrix, matrix);
    mat4.translate(this.target_matrix, this.target_matrix, this.translate_vec);
    mat4.scale(this.target_matrix, this.target_matrix, this.scale_vec);

    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, this.target_matrix);
    mat4.transpose(normalMatrix, normalMatrix);

    const index_offset = this.positions.length;
    for (let i = 0; i < cube.positions.length; i++) {
      const pos = vec3.transformMat4(
        vec3.create(),
        cube.positions[i],
        this.target_matrix
      );
      const norm = vec3.transformMat4(
        vec3.create(),
        cube.vertexNormals[i],
        normalMatrix
      );

      this.positions.push(pos);
      this.colors.push(cube.colors[i]);
      this.vertexNormals.push(norm);
    }

    for (let i = 0; i < cube.indices.length; i++) {
      this.indices.push(cube.indices[i] + index_offset);
    }
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
  let current_matrix = mat4.create();

  vec3.scale(head_vector, head_vector, step_length);

  for (let i = 0; i < state.length && i < DEBUG_RENDER_LIMIT; i++) {
    const [current, _vals] = state[i];
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

    gl_FragColor = vec4(vColor.rgb * vLighting, vColor.a);
    //gl_FragColor = vec4(vLighting, 1.0);
    //gl_FragColor = vColor;
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

const cube = (function() {
  const positions = [
    // Front face
    vec3.fromValues(-0.5, -0.5, 0.5),
    vec3.fromValues(0.5, -0.5, 0.5),
    vec3.fromValues(0.5, 0.5, 0.5),
    vec3.fromValues(-0.5, 0.5, 0.5),

    // Back face
    vec3.fromValues(-0.5, -0.5, -0.5),
    vec3.fromValues(-0.5, 0.5, -0.5),
    vec3.fromValues(0.5, 0.5, -0.5),
    vec3.fromValues(0.5, -0.5, -0.5),

    // Top face
    vec3.fromValues(-0.5, 0.5, -0.5),
    vec3.fromValues(-0.5, 0.5, 0.5),
    vec3.fromValues(0.5, 0.5, 0.5),
    vec3.fromValues(0.5, 0.5, -0.5),

    // Bottom face
    vec3.fromValues(-0.5, -0.5, -0.5),
    vec3.fromValues(0.5, -0.5, -0.5),
    vec3.fromValues(0.5, -0.5, 0.5),
    vec3.fromValues(-0.5, -0.5, 0.5),

    // Right face
    vec3.fromValues(0.5, -0.5, -0.5),
    vec3.fromValues(0.5, 0.5, -0.5),
    vec3.fromValues(0.5, 0.5, 0.5),
    vec3.fromValues(0.5, -0.5, 0.5),

    // Left face
    vec3.fromValues(-0.5, -0.5, -0.5),
    vec3.fromValues(-0.5, -0.5, 0.5),
    vec3.fromValues(-0.5, 0.5, 0.5),
    vec3.fromValues(-0.5, 0.5, -0.5),
  ];

  const faceColors = [
    vec4.fromValues(1.0, 1.0, 1.0, 1.0), // Front face: white
    vec4.fromValues(1.0, 0.0, 0.0, 1.0), // Back face: red
    vec4.fromValues(0.0, 1.0, 0.0, 1.0), // Top face: green
    vec4.fromValues(0.0, 0.0, 1.0, 1.0), // Bottom face: blue
    vec4.fromValues(1.0, 1.0, 0.0, 1.0), // Right face: yellow
    vec4.fromValues(1.0, 0.0, 1.0, 1.0), // Left face: purple
  ];
  let colors = [];
  for (let j = 0; j < faceColors.length; j++) {
    const c = faceColors[j];
    colors.push(c, c, c, c);
  }

  const vertexNormals = [
    // Front
    vec3.fromValues(0.0, 0.0, 1.0),
    vec3.fromValues(0.0, 0.0, 1.0),
    vec3.fromValues(0.0, 0.0, 1.0),
    vec3.fromValues(0.0, 0.0, 1.0),

    // Back
    vec3.fromValues(0.0, 0.0, -1.0),
    vec3.fromValues(0.0, 0.0, -1.0),
    vec3.fromValues(0.0, 0.0, -1.0),
    vec3.fromValues(0.0, 0.0, -1.0),

    // Top
    vec3.fromValues(0.0, 1.0, 0.0),
    vec3.fromValues(0.0, 1.0, 0.0),
    vec3.fromValues(0.0, 1.0, 0.0),
    vec3.fromValues(0.0, 1.0, 0.0),

    // Bottom
    vec3.fromValues(0.0, -1.0, 0.0),
    vec3.fromValues(0.0, -1.0, 0.0),
    vec3.fromValues(0.0, -1.0, 0.0),
    vec3.fromValues(0.0, -1.0, 0.0),

    // Right
    vec3.fromValues(1.0, 0.0, 0.0),
    vec3.fromValues(1.0, 0.0, 0.0),
    vec3.fromValues(1.0, 0.0, 0.0),
    vec3.fromValues(1.0, 0.0, 0.0),

    // Left
    vec3.fromValues(-1.0, 0.0, 0.0),
    vec3.fromValues(-1.0, 0.0, 0.0),
    vec3.fromValues(-1.0, 0.0, 0.0),
    vec3.fromValues(-1.0, 0.0, 0.0),
  ];

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

  return { positions, colors, vertexNormals, indices };
})();

function createBuffers(gl) {
  const positionBuffer = gl.createBuffer();
  const colorBuffer = gl.createBuffer();
  const normalBuffer = gl.createBuffer();
  const indexBuffer = gl.createBuffer();

  return {
    position: positionBuffer,
    color: colorBuffer,
    indices: indexBuffer,
    normals: normalBuffer,
  };
}

function fillBuffers(gl, buffers, obj) {
  const positions = [];
  for (let i = 0; i < obj.positions.length; i++) {
    positions.push(...obj.positions[i]);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const colors = [];
  for (let i = 0; i < obj.colors.length; i++) {
    colors.push(...obj.colors[i]);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  const normals = [];
  for (let i = 0; i < obj.vertexNormals.length; i++) {
    normals.push(...obj.vertexNormals[i]);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normals);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(obj.indices),
    gl.STATIC_DRAW
  );
}

function initBuffers(gl, obj) {
  const buffers = createBuffers(gl);
  fillBuffers(gl, buffers, obj);
  return buffers;
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
const buffers = initBuffers(gardenContext, cube);

const render_config = {
  step_length: 0.5,
  angle_delta: angle,
};

function draw(gl, cubeRotation, plant) {
  // Step 1: Measure the boundaries of the plant.
  let min = vec3.clone(plant.positions[0]);
  let max = vec3.clone(plant.positions[0]);
  for (let i = 1; i < plant.positions.length; i++) {
    vec3.min(min, min, plant.positions[i]);
    vec3.max(max, max, plant.positions[i]);
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
  // mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -6.0]);
  // mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation * 0.7, [0, 1, 0]);

  drawCube(gl, projectionMatrix, modelViewMatrix, plant.indices.length);
}

function drawCube(gl, projectionMatrix, modelViewMatrix, vertexCount) {
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
    (projectionMatrix: any)
  );
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.normalMatrix,
    false,
    (normalMatrix: any)
  );
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelViewMatrix,
    false,
    (modelViewMatrix: any)
  );

  {
    const type = gl.UNSIGNED_SHORT;
    const offset = 0;
    gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
  }
}

let plant;
function updatePlant() {
  plant = new RenderContext();
  window.DEBUG_PLANT = plant;
  render(state, plant, render_config);
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
