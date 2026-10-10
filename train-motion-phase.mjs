export function trainMotionPhase(elapsedMs, carCount, reducedMotion = false) {
  if (reducedMotion) return {phase:'complete',flight:1,burst:1,carsAlpha:1,done:true};
  const ms = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  if (ms < 1500) return {phase:'flight',flight:ms/1500,burst:0,carsAlpha:1,done:false};
  if (carCount < 5) return {phase:'complete',flight:1,burst:0,carsAlpha:1,done:true};
  if (ms < 1900) return {phase:'pause',flight:1,burst:0,carsAlpha:1,done:false};
  if (ms < 4300) {
    const burst = (ms - 1900) / 2400;
    return {phase:'burst',flight:1,burst,carsAlpha:Math.max(1-burst/.22,0),done:false};
  }
  return {phase:'complete',flight:1,burst:1,carsAlpha:0,done:true};
}
