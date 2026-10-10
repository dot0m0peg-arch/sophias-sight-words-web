// Original native shoe format and discrete 1.2-second lace motion.
const SIDE_VALUES = 129 * 3;
const MOTION_VALUES = 8 * 101 * 2 * SIDE_VALUES;

function byteView(bytes) {
  if (bytes instanceof ArrayBuffer) return new DataView(bytes);
  if (bytes instanceof Uint8Array) {
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  throw new TypeError('Expected an ArrayBuffer or Uint8Array');
}

function finiteFloat(view, offset) {
  const value = view.getFloat32(offset, true);
  if (!Number.isFinite(value)) {
    throw new RangeError(`Nonfinite shoe coordinate at byte ${offset}`);
  }
  return value;
}

export function decodeShoeMesh(bytes) {
  const view = byteView(bytes);
  if (view.byteLength < 12) throw new RangeError('Truncated shoe mesh header');
  if (view.getUint32(0, true) !== 0x53484f45) {
    throw new RangeError('Invalid shoe mesh magic');
  }
  const vertexCount = view.getUint32(4, true);
  const indexCount = view.getUint32(8, true);
  if (vertexCount === 0 || indexCount === 0 || indexCount % 3 !== 0) {
    throw new RangeError('Expected a nonempty triangle mesh');
  }
  const indexStart = 12 + vertexCount * 32;
  if (view.byteLength !== indexStart + indexCount * 2) {
    throw new RangeError('Shoe mesh length does not match its counts');
  }
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = new Uint16Array(indexCount);
  for (let vertex = 0; vertex < vertexCount; vertex++) {
    const start = 12 + vertex * 32;
    for (let component = 0; component < 8; component++) {
      const value = finiteFloat(view, start + component * 4);
      if (component < 3) positions[vertex * 3 + component] = value;
      else if (component < 6) normals[vertex * 3 + component - 3] = value;
      else uvs[vertex * 2 + component - 6] = value;
    }
  }
  for (let index = 0; index < indexCount; index++) {
    const value = view.getUint16(indexStart + index * 2, true);
    if (value >= vertexCount) throw new RangeError('Shoe index exceeds vertex count');
    indices[index] = value;
  }
  // Keep UVs unchanged; the renderer owns the native texture transform.
  return { positions, normals, uvs, indices };
}

export function decodeShoeMotion(bytes) {
  const view = byteView(bytes);
  if (view.byteLength !== MOTION_VALUES * 4) {
    throw new RangeError('Expected exactly eight stages of shoe motion');
  }
  const frames = new Float32Array(MOTION_VALUES);
  for (let index = 0; index < frames.length; index++) {
    frames[index] = finiteFloat(view, index * 4);
  }
  return frames;
}

export function sampleShoeMotion(
  frames, stage, elapsedMs, { animate = true, reducedMotion = false } = {},
) {
  if (!(frames instanceof Float32Array) || frames.length !== MOTION_VALUES) {
    throw new TypeError('Expected the complete decoded shoe motion');
  }
  if (!Number.isInteger(stage) || stage < 0 || stage > 7) {
    throw new RangeError('Shoe stage must be an integer from zero to seven');
  }
  if (!Number.isFinite(elapsedMs)) throw new RangeError('Elapsed time must be finite');
  if (typeof animate !== 'boolean' || typeof reducedMotion !== 'boolean') {
    throw new TypeError('Motion options must be booleans');
  }
  const frame = animate && !reducedMotion
    ? Math.floor(Math.min(Math.max(elapsedMs / 1200, 0), 1) * 100)
    : 100;
  const start = (stage * 101 + frame) * 2 * SIDE_VALUES;
  const teal = new Float32Array(SIDE_VALUES);
  const coral = new Float32Array(SIDE_VALUES);
  for (let index = 0; index < SIDE_VALUES; index++) {
    const a = frames[start + index];
    const b = frames[start + SIDE_VALUES + index];
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new RangeError('Nonfinite sampled lace coordinate');
    }
    teal[index] = a;
    coral[index] = b;
  }
  return { frame, teal, coral };
}
