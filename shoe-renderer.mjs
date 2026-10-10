// Browser rendering of the ORIGINAL App/ShoeLacingScene.swift SceneKit scene.
// Geometry decoding, lace construction, stage timing and learning belong to callers.
const EYE = [0.10, -0.55, 1.8], TARGET = [0.025, 0, 0.13];
const COLORS = [[0.03, 0.50, 0.55], [0.91, 0.35, 0.27]];
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const unit = a => { const n = Math.hypot(...a); return a.map(v => v / n); };
const BACK = unit(EYE.map((v, i) => v - TARGET[i]));
const RIGHT = unit(cross([0, 0, 1], BACK)), UP = cross(BACK, RIGHT);
const VERTEX = `
attribute vec3 position; attribute vec3 normal; attribute vec2 uv;
uniform vec2 halfSize;
varying vec3 worldPosition; varying vec3 worldNormal; varying vec2 textureUV;
void main() {
  vec3 delta = position - vec3(0.10, -0.55, 1.8);
  vec3 right = vec3(${RIGHT.join(',')});
  vec3 up = vec3(${UP.join(',')});
  vec3 back = vec3(${BACK.join(',')});
  float z = dot(delta, back);
  gl_Position = vec4(dot(delta, right)/halfSize.x, dot(delta, up)/halfSize.y,
      -(2.0*z+10.01)/9.99, 1.0);
  worldPosition = position; worldNormal = normal; textureUV = vec2(uv.x, 1.0-uv.y);
}`;
const FRAGMENT = `
precision mediump float;
varying vec3 worldPosition; varying vec3 worldNormal; varying vec2 textureUV;
uniform sampler2D image; uniform vec3 color; uniform bool textured;
void main() {
  vec3 n = normalize(worldNormal);
  if (!gl_FrontFacing) n = -n;
  vec3 light = normalize(vec3(-1.0, -2.0, 3.0)-worldPosition);
  float lambert = max(dot(n, light), 0.0);
  vec4 base = textured ? texture2D(image, textureUV) : vec4(color, 1.0);
  gl_FragColor = vec4(base.rgb * (0.65 + 0.65 * lambert), base.a);
}`;

function geometry(value, needsUV = false) {
  if (!value || !(value.positions instanceof Float32Array) || value.positions.length < 9 ||
      value.positions.length % 3 || !(value.normals instanceof Float32Array) ||
      value.normals.length !== value.positions.length ||
      ![Uint16Array, Uint32Array].some(Type => value.indices instanceof Type) ||
      value.indices.length < 3 || value.indices.length % 3) throw new TypeError('Invalid shoe geometry');
  const count = value.positions.length / 3;
  if (count > 65536 || value.indices.some(v => v >= count)) throw new RangeError('Shoe index out of range');
  const uvs = value.uvs ?? new Float32Array(count * 2);
  if (!(uvs instanceof Float32Array) || uvs.length !== count * 2 || (needsUV && !value.uvs) ||
      [value.positions, value.normals, uvs].some(a => a.some(v => !Number.isFinite(v))))
    throw new TypeError('Invalid shoe vertex data');
  // Own copies allow reliable context restoration without retaining mutable caller buffers.
  return { positions: value.positions.slice(), normals: value.normals.slice(),
    uvs: uvs.slice(), indices: new Uint16Array(value.indices) };
}

export function createShoeRenderer(canvas, {mesh, texture, fixedLaces = []} = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('Canvas required');
  if (!Array.isArray(fixedLaces) || ![0,2].includes(fixedLaces.length)) throw new TypeError('Two fixed laces required');
  const shoe = geometry(mesh, true), fixed = fixedLaces.map(g => geometry(g));
  if (!texture || !(texture.width > 0 && texture.height > 0)) throw new TypeError('Decoded original texture required');
  const gl = canvas.getContext('webgl', {alpha: true, antialias: true, premultipliedAlpha: false});
  if (!gl) throw new Error('WebGL is unavailable');
  let disposed = false, lost = false, program, image, locations, staticBuffers = [], movingBuffers = [];
  let moving = [], objects = [], textures = [], programs = [], shaders = [];
  const checkLive = () => { if (disposed) throw new Error('Shoe renderer disposed'); };
  function release() {
    for (const buffer of objects) gl.deleteBuffer(buffer);
    for (const value of textures) gl.deleteTexture(value);
    for (const value of programs) gl.deleteProgram(value);
    for (const value of shaders) gl.deleteShader(value);
    objects = []; textures = []; programs = []; shaders = [];
    staticBuffers = []; movingBuffers = [];
  }
  function upload(data) {
    const fields = {};
    for (const key of ['positions', 'normals', 'uvs', 'indices']) {
      const buffer = gl.createBuffer(); if (!buffer) throw new Error('Cannot allocate shoe buffer');
      objects.push(buffer); fields[key] = buffer;
      const target = key === 'indices' ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;
      gl.bindBuffer(target, buffer); gl.bufferData(target, data[key], gl.STATIC_DRAW);
    }
    return {...fields, count: data.indices.length};
  }
  function compile(type, source) {
    const shader = gl.createShader(type); shaders.push(shader);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  function initialize() {
    program = gl.createProgram(); programs.push(program);
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    locations = Object.fromEntries(['halfSize', 'image', 'color', 'textured'].map(k => [k, gl.getUniformLocation(program, k)]));
    for (const k of ['position', 'normal', 'uv']) locations[k] = gl.getAttribLocation(program, k);
    image = gl.createTexture(); textures.push(image); gl.bindTexture(gl.TEXTURE_2D, image);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    staticBuffers = [shoe, ...fixed].map(upload); movingBuffers = moving.map(upload);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.clearColor(0, 0, 0, 0);
  }
  function drawGeometry(buffers, color, textured = false) {
    for (const [name, key, size] of [['position','positions',3],['normal','normals',3],['uv','uvs',2]]) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers[key]); gl.enableVertexAttribArray(locations[name]);
      gl.vertexAttribPointer(locations[name], size, gl.FLOAT, false, 0, 0);
    }
    gl.uniform3fv(locations.color, color); gl.uniform1i(locations.textured, textured);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    gl.drawElements(gl.TRIANGLES, buffers.count, gl.UNSIGNED_SHORT, 0);
  }
  function redraw() {
    checkLive(); if (lost) return false;
    const width = canvas.clientWidth || canvas.width, height = canvas.clientHeight || canvas.height;
    if (!(width > 0 && height > 0)) return false;
    const dpr = Math.min(2, Math.max(1, canvas.ownerDocument?.defaultView?.devicePixelRatio || 1));
    const w = Math.max(1, Math.round(width*dpr)), h = Math.max(1, Math.round(height*dpr));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    gl.viewport(0, 0, w, h); gl.useProgram(program); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    // Preserve the native camera at normal landscape ratios; fit its full width
    // into narrow browser panels instead of cropping the owner's mesh/laces.
    const halfHeight = 0.55 * Math.max(1, h/w);
    gl.uniform2f(locations.halfSize, halfHeight*w/h, halfHeight);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, image); gl.uniform1i(locations.image, 0);
    drawGeometry(staticBuffers[0], [1,1,1], true);
    fixed.forEach((_, i) => drawGeometry(staticBuffers[i+1], COLORS[i]));
    movingBuffers.forEach((b, i) => drawGeometry(b, COLORS[i]));
    return true;
  }
  function draw(teal, coral) {
    checkLive(); const next = teal === undefined && coral === undefined ? [] : [geometry(teal), geometry(coral)];
    moving = next;
    if (lost) return false;
    // The 129-point paths have constant topology. Reuse their buffers each sampled frame.
    if (movingBuffers.length === next.length) next.forEach((data, i) => {
      for (const key of ['positions','normals','uvs','indices']) {
        const target = key === 'indices' ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;
        gl.bindBuffer(target, movingBuffers[i][key]); gl.bufferData(target, data[key], gl.DYNAMIC_DRAW);
      }
      movingBuffers[i].count = data.indices.length;
    });
    else {
      for (const b of movingBuffers) for (const key of ['positions','normals','uvs','indices']) {
        gl.deleteBuffer(b[key]); objects.splice(objects.indexOf(b[key]), 1);
      }
      movingBuffers = next.map(upload);
    }
    return redraw();
  }
  function onLost(event) { event.preventDefault(); lost = true; }
  function onRestored() {
    if (disposed) return;
    // Objects from the previous context generation are already invalid.
    objects=[]; textures=[]; programs=[]; shaders=[];
    try { initialize(); lost=false; redraw(); }
    catch (error) { release(); lost=true; canvas.dispatchEvent(new CustomEvent('shoe-render-error', {detail:error.message})); }
  }
  let observer;
  function dispose() {
    if (disposed) return; disposed=true; observer?.disconnect();
    canvas.removeEventListener('webglcontextlost', onLost); canvas.removeEventListener('webglcontextrestored', onRestored);
    release(); moving=[];
  }
  try {
    initialize();
    canvas.addEventListener('webglcontextlost', onLost); canvas.addEventListener('webglcontextrestored', onRestored);
    const Observer = canvas.ownerDocument?.defaultView?.ResizeObserver;
    if (Observer) { observer = new Observer(() => { if (!disposed) redraw(); }); observer.observe(canvas); }
    redraw();
  } catch (error) { dispose(); throw error; }
  return Object.freeze({draw, redraw, dispose});
}
