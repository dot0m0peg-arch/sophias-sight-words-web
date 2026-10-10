const SIDES = 8;
const EPSILON = 0.00001;

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function divideByNativeLength(vector) {
  const length = Math.max(Math.sqrt(dot(vector, vector)), EPSILON);
  return vector.map(value => value / length);
}

export function buildShoeTube(points, radius) {
  if (!(points instanceof Float32Array)) {
    throw new TypeError('points must be a Float32Array of xyz triplets');
  }
  if (points.length < 6 || points.length % 3 !== 0) {
    throw new RangeError('points must contain at least two complete xyz points');
  }
  for (const value of points) {
    if (!Number.isFinite(value)) throw new RangeError('points must be finite');
  }
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RangeError('radius must be finite and positive');
  }

  const count = points.length / 3;
  const positions = new Float32Array(count * SIDES * 3);
  const normals = new Float32Array(positions.length);
  const indices = new Uint32Array((count - 1) * SIDES * 6);
  let priorU = null;
  let priorT = null;
  let indexOffset = 0;

  for (let i = 0; i < count; i++) {
    const previous = Math.max(i - 1, 0) * 3;
    const next = Math.min(i + 1, count - 1) * 3;
    const delta = [
      points[next] - points[previous],
      points[next + 1] - points[previous + 1],
      points[next + 2] - points[previous + 2]
    ];
    const t = divideByNativeLength(delta);
    const axis = Math.abs(t[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0];
    let u = cross(t, axis);

    if (priorU !== null) {
      const turn = cross(priorT, t);
      const cosine = Math.max(-1, Math.min(1, dot(priorT, t)));
      const sin2 = dot(turn, turn);
      let transport = priorU;
      if (sin2 > 0.000000001) {
        const crossed = cross(turn, priorU);
        const weight = dot(turn, priorU) * (1 - cosine) / sin2;
        transport = priorU.map((value, j) =>
          value * cosine + crossed[j] + turn[j] * weight);
      }
      const projection = dot(transport, t);
      u = transport.map((value, j) => value - t[j] * projection);
    }

    u = divideByNativeLength(u);
    const v = cross(t, u);
    priorU = u;
    priorT = t;

    for (let k = 0; k < SIDES; k++) {
      const angle = Math.fround(Math.fround(k * 2 * Math.fround(Math.PI)) / SIDES);
      const cosine = Math.fround(Math.cos(angle));
      const sine = Math.fround(Math.sin(angle));
      const offset = (i * SIDES + k) * 3;
      for (let j = 0; j < 3; j++) {
        const normal = u[j] * cosine + v[j] * sine;
        normals[offset + j] = normal;
        positions[offset + j] = points[i * 3 + j] + normal * radius;
      }

      if (i < count - 1) {
        const a = i * SIDES + k;
        const b = i * SIDES + (k + 1) % SIDES;
        indices.set([a, b, a + SIDES, b, b + SIDES, a + SIDES], indexOffset);
        indexOffset += 6;
      }
    }
  }

  return { positions, normals, indices };
}
