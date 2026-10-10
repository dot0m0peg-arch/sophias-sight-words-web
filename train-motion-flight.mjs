export function trainMotionFlight(source, destination, unit, flight) {
  const t = Number.isFinite(flight) ? Math.max(0, Math.min(1, flight)) : 0;
  const p = Math.max(0, Math.min(1, (t - .2) / .8));
  const smooth = p * p * (3 - 2 * p);
  const mix = (a, b) => a + (b - a) * smooth;
  const width = mix(source.width, destination.width);
  const height = mix(source.height, destination.height);
  const cx = mix(source.x + source.width / 2, destination.x + destination.width / 2);
  const cy = mix(source.y + source.height / 2, destination.y + destination.height / 2)
    - Math.abs(Math.sin(p * Math.PI * 5)) * 18 * unit * (1 - p);
  const rect = t === 0 ? {...source} : t === 1 ? {...destination}
    : {x: cx - width / 2, y: cy - height / 2, width, height};
  const step = Math.sin(p * Math.PI * 10) * 7 * unit;
  return {
    rect,
    leftShoe: {x: cx - 22 * unit, y: rect.y + rect.height + step},
    rightShoe: {x: cx + 15 * unit, y: rect.y + rect.height - step},
    shoeScale: Math.min(1, t / .2) * (1 - p * .55)
  };
}
