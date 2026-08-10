const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_texCoord;
void main() {
  v_texCoord = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
uniform sampler2D u_image;
uniform sampler2D u_mask;
uniform vec2 u_texelSize;
uniform float u_strength;
in vec2 v_texCoord;
out vec4 outColor;
void main() {
  vec4 center = texture(u_image, v_texCoord);
  vec3 total = vec3(0.0);
  float weightTotal = 0.0;
  float sigma = 1.6 + u_strength * 2.4;
  for (int y = -3; y <= 3; y++) {
    for (int x = -3; x <= 3; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec3 sampleColor = texture(u_image, v_texCoord + offset * u_texelSize).rgb;
      float spatial = exp(-dot(offset, offset) / (2.0 * sigma * sigma));
      vec3 delta = center.rgb - sampleColor;
      float range = exp(-dot(delta, delta) / 0.045);
      float weight = spatial * range;
      total += sampleColor * weight;
      weightTotal += weight;
    }
  }
  vec3 smoothed = total / max(weightTotal, 0.0001);
  float mask = texture(u_mask, v_texCoord).r;
  float blend = mask * u_strength * 0.34;
  outColor = vec4(mix(center.rgb, smoothed, blend), center.a);
}`;

let renderer = null;

export function applyGpuSmoothing(canvas, maskCanvas, amount = 0) {
  const strength = Math.min(1, Math.max(0, Number(amount) / 100));
  if (!canvas || !maskCanvas || strength <= 0) return false;
  if (!renderer || renderer.width !== canvas.width || renderer.height !== canvas.height) {
    renderer = createRenderer(canvas.width, canvas.height);
  }
  if (!renderer) return false;
  renderer.render(canvas, maskCanvas, strength);
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(renderer.canvas, 0, 0);
  return true;
}

function createRenderer(width, height) {
  const webglCanvas = document.createElement("canvas");
  webglCanvas.width = width;
  webglCanvas.height = height;
  const gl = webglCanvas.getContext("webgl2", { premultipliedAlpha: false });
  if (!gl) return null;
  const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  if (!program) return null;
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const imageTexture = gl.createTexture();
  const maskTexture = gl.createTexture();
  configureTexture(gl, imageTexture, width, height);
  configureTexture(gl, maskTexture, width, height);
  const uniforms = {
    image: gl.getUniformLocation(program, "u_image"),
    mask: gl.getUniformLocation(program, "u_mask"),
    texelSize: gl.getUniformLocation(program, "u_texelSize"),
    strength: gl.getUniformLocation(program, "u_strength")
  };
  return {
    canvas: webglCanvas,
    width,
    height,
    render(image, mask, strength) {
      gl.viewport(0, 0, image.width, image.height);
      gl.useProgram(program);
      uploadTexture(gl, imageTexture, image);
      uploadTexture(gl, maskTexture, mask);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imageTexture);
      gl.uniform1i(uniforms.image, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, maskTexture);
      gl.uniform1i(uniforms.mask, 1);
      gl.uniform2f(uniforms.texelSize, 1 / image.width, 1 / image.height);
      gl.uniform1f(uniforms.strength, strength);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  };
}

function configureTexture(gl, texture, width, height) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
}

function uploadTexture(gl, texture, source) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
}

function createProgram(gl, vertexSource, fragmentSource) {
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}
