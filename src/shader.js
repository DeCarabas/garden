// @flow
// @format
function initShaderProgram(gl: WebGLRenderingContext, vsSource, fsSource) {
  function getShaderType(type) {
    if (type == "vertex") {
      return gl.VERTEX_SHADER;
    } else if (type == "fragment") {
      return gl.FRAGMENT_SHADER;
    }
    throw new Error("Unknown shader type " + type);
  }

  function loadShader(gl, type, source) {
    const shader = gl.createShader(getShaderType(type));
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(
        "An error occurred compiling the shader",
        type,
        ":",
        gl.getShaderInfoLog(shader)
      );
      gl.deleteShader(shader);
      throw new Error("Failed to load " + type + " shader");
    }

    return shader;
  }

  const vertexShader = loadShader(gl, "vertex", vsSource);
  const fragmentShader = loadShader(gl, "fragment", fsSource);

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

  return {
    program: shaderProgram,
    attribute: attrib => gl.getAttribLocation(shaderProgram, attrib),
    uniform: uniform => gl.getUniformLocation(shaderProgram, uniform),
  };
}

function bindVec3Attribute(gl, attribute, buffer) {
  const numComponents = 3;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(
    attribute,
    numComponents,
    type,
    normalize,
    stride,
    offset
  );
  gl.enableVertexAttribArray(attribute);
}

function bindVec4Attribute(gl, attribute, buffer) {
  const numComponents = 4;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(
    attribute,
    numComponents,
    type,
    normalize,
    stride,
    offset
  );
  gl.enableVertexAttribArray(attribute);
}

function bindFloatAttribute(gl, attribute, buffer) {
  const numComponents = 1;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(
    attribute,
    numComponents,
    type,
    normalize,
    stride,
    offset
  );
  gl.enableVertexAttribArray(attribute);
}

function getFlatTriangleShader(gl: WebGLRenderingContext) {
  const vsSource = `
  attribute vec4 aVertexPosition;
  attribute vec4 aVertexNormal;
  attribute vec4 aVertexColor;

  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;

  varying lowp vec4 vColor;
  varying highp vec4 vNormal;
  varying highp vec4 vCameraToPoint;

  void main() {
    highp vec4 world_pos = uModelViewMatrix * aVertexPosition;

    gl_Position = uProjectionMatrix * world_pos;
    vColor = aVertexColor;
    vNormal = uModelViewMatrix * normalize(aVertexNormal);

    // Because we send in the model view matrix by the time we've done this
    // transform the camera is sitting at (0, 0, 0), so this vector is easy.
    vCameraToPoint = -world_pos;
  }
  `;

  const fsSource = `
  varying lowp vec4 vColor;
  varying highp vec4 vNormal;
  varying highp vec4 vCameraToPoint;

  void main() {
    highp vec3 ambientLight = vec3(0.2, 0.2, 0.2);
    highp vec4 lightColor = vec4(1, 1, 1, 1);

    // Is this the direction the photons are going, or the opposite? I don't
    // even know, to be honest.
    highp vec3 lightDirection = normalize(vec3(3, 10, 10));

    // Assume un-lit.
    lowp vec3 fragmentColor = ambientLight * vec3(vColor);

    // So lots of our geometry is 2-dimensional, and so we have to pretend that
    // it has a front and a back. That means the surface normal goes both ways!
    // However, we still need to know if we're looking at the lit side of the
    // leaf or not; we do that by figuring out if we're looking at the same side
    // of the leaf as the light. Easy!
    highp vec3 normal = normalize(vec3(vNormal));
    highp vec3 camera_to_point = normalize(vec3(vCameraToPoint));
    if (dot(lightDirection, normal) * dot(camera_to_point, normal) > 0.0) {
      // Hey look, we're on the same side as the light! We must be looking at
      // the lit side.
      highp float factor = max(
        dot(lightDirection, normal),
        dot(lightDirection, -normal));

      if (factor > 0.2 /* Diffuse threshold */) {
        fragmentColor = (factor * vec3(lightColor)) * vec3(vColor);
      }
    }

    gl_FragColor = vec4(fragmentColor, vColor.w);
  }
  `;

  const shader = initShaderProgram(gl, vsSource, fsSource);
  const info = {
    program: shader.program,
    attribLocations: {
      vertexPosition: shader.attribute("aVertexPosition"),
      vertexNormal: shader.attribute("aVertexNormal"),
      vertexColor: shader.attribute("aVertexColor"),
    },
    uniformLocations: {
      projectionMatrix: shader.uniform("uProjectionMatrix"),
      modelViewMatrix: shader.uniform("uModelViewMatrix"),
    },
  };

  function draw(
    buffers: {
      position: WebGLBuffer,
      color: WebGLBuffer,
      normal: WebGLBuffer,
      index: WebGLBuffer,
    },
    vertexCount: number,
    projectionMatrix: Float32Array,
    modelViewMatrix: Float32Array
  ) {
    gl.useProgram(info.program);
    bindVec3Attribute(
      gl,
      info.attribLocations.vertexPosition,
      buffers.position
    );
    bindVec4Attribute(gl, info.attribLocations.vertexColor, buffers.color);
    bindVec4Attribute(gl, info.attribLocations.vertexNormal, buffers.normal);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);

    gl.uniformMatrix4fv(
      info.uniformLocations.projectionMatrix,
      false,
      projectionMatrix
    );
    gl.uniformMatrix4fv(
      info.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix
    );

    {
      const type = gl.UNSIGNED_SHORT;
      const offset = 0;
      gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }
  }

  return { draw };
}

function getLineShader(gl: WebGLRenderingContext) {
  const vsSource = `
  // Position of the point in 3-space.
  attribute vec4 aPosition;

  // 1 or -1 depending on which side of the line we're pushing.
  attribute float aDirection;

  // The next point in the line.
  attribute vec4 aPositionNext;

  // The previous point in the line.
  attribute vec4 aPositionPrev;

  // The color of the line.
  attribute vec4 aVertexColor;

  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;
  uniform float uAspectRatio;
  uniform float uThickness;
  uniform int uMiter; // 1 if you want to do mitering between segments.

  varying lowp vec4 vColor;

  void main() {
    vec2 aspect = vec2(uAspectRatio, 1.0);
    mat4 modelViewProjection = uProjectionMatrix * uModelViewMatrix;

    vec4 currentProjected = modelViewProjection * aPosition;
    vec4 previousProjected = modelViewProjection * aPositionPrev;
    vec4 nextProjected = modelViewProjection * aPositionNext;

    vec2 currentScreen = currentProjected.xy / currentProjected.w * aspect;
    vec2 previousScreen = previousProjected.xy / previousProjected.w * aspect;
    vec2 nextScreen = nextProjected.xy / nextProjected.w * aspect;

    // Work out what direction to offset by, and how much to offset by.
    float len = uThickness;
    vec2 dir = vec2(0.0, 0.0);
    if (currentScreen == previousScreen) {
      // current is the first point in the line segment.
      dir = normalize(nextScreen - previousScreen);
    } else if (currentScreen == nextScreen || (uMiter != 1)) {
      // current is the last point in the line segment, or no mitering.
      dir = normalize(currentScreen - previousScreen);
    } else {
      // somewhere in the middle, and we need to do mitering.
      vec2 dirA = normalize(currentScreen - previousScreen);
      vec2 dirB = normalize(nextScreen - currentScreen);
      vec2 tangent = normalize(dirA + dirB);
      vec2 perp = vec2(-dirA.y, dirA.x);
      vec2 miter = vec2(-tangent.y, tangent.x);

      dir = tangent;
      len = uThickness / dot(miter, perp);
    }

    vec2 normal = vec2(-dir.y, dir.x);
    normal *= len / 2.0;
    normal.x /= uAspectRatio;

    vec4 offset = vec4(normal * aDirection, -0.001, 0.0);
    gl_Position = currentProjected + offset;

    vColor = aVertexColor;
  }
  `;

  const fsSource = `
  varying lowp vec4 vColor;

  void main() {
    // Lines aren't lit.
    gl_FragColor = vColor;
  }
  `;

  const shader = initShaderProgram(gl, vsSource, fsSource);
  const info = {
    program: shader.program,
    attribLocations: {
      position: shader.attribute("aPosition"),
      next: shader.attribute("aPositionNext"),
      prev: shader.attribute("aPositionPrev"),
      direction: shader.attribute("aDirection"),
      color: shader.attribute("aVertexColor"),
    },
    uniformLocations: {
      projectionMatrix: shader.uniform("uProjectionMatrix"),
      modelViewMatrix: shader.uniform("uModelViewMatrix"),
      aspectRatio: shader.uniform("uAspectRatio"),
      thickness: shader.uniform("uThickness"),
      miter: shader.uniform("uMiter"),
    },
  };

  function draw(
    buffers: {
      position: WebGLBuffer,
      next: WebGLBuffer,
      prev: WebGLBuffer,
      direction: WebGLBuffer,
      color: WebGLBuffer,
      index: WebGLBuffer,
    },
    vertexCount: number,
    projectionMatrix: Float32Array,
    modelViewMatrix: Float32Array,
    thickness: number,
    miter: boolean
  ) {
    const aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;

    gl.useProgram(info.program);
    bindVec3Attribute(gl, info.attribLocations.position, buffers.position);
    bindVec3Attribute(gl, info.attribLocations.next, buffers.next);
    bindVec3Attribute(gl, info.attribLocations.prev, buffers.prev);
    bindFloatAttribute(gl, info.attribLocations.direction, buffers.direction);
    bindVec4Attribute(gl, info.attribLocations.color, buffers.color);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);

    gl.uniformMatrix4fv(
      info.uniformLocations.projectionMatrix,
      false,
      projectionMatrix
    );
    gl.uniformMatrix4fv(
      info.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix
    );
    gl.uniform1f(info.uniformLocations.aspectRatio, aspectRatio);
    gl.uniform1f(info.uniformLocations.thickness, thickness);
    gl.uniform1i(info.uniformLocations.miter, miter ? 1 : 0);

    {
      const type = gl.UNSIGNED_SHORT;
      const offset = 0;
      gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }
  }

  return { draw };
}

module.exports = {
  getFlatTriangleShader,
  getLineShader,
};
