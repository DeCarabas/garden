// @flow
// @format
const { vec3, vec4 } = require("gl-matrix");

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

module.exports = {
  cube,
};
