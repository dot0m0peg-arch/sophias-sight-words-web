export function createRace() {
  return {elapsedMs:0,progress:0,boostMs:0,hits:0,misses:0,phase:'ready',place:0};
}
export function startRace(state) {
  return {...state,phase:state.phase === 'ready' ? 'running' : state.phase};
}
function finish(state) {
  if (state.progress >= 1 || state.elapsedMs >= 45000) {
    state.phase='finished'; state.boostMs=0;
    state.place=1+Array.from({length:15},(_,i)=>opponentProgress(i,state.elapsedMs))
      .filter(p=>p >= state.progress).length;
  }
  return state;
}
export function answerRace(state,correct) {
  const next={...state};
  if (next.phase !== 'running') return next;
  if (!correct) { next.misses++; return next; }
  next.progress=Math.min(next.progress+.09,1);
  next.boostMs=4000; next.hits++;
  return finish(next);
}
export function tickRace(state,milliseconds) {
  const next={...state};
  if (next.phase !== 'running' || milliseconds <= 0) return next;
  const dt=Math.min(milliseconds,45000-next.elapsedMs);
  const boosted=Math.min(dt,next.boostMs);
  next.progress=Math.min(next.progress+dt*.000003+boosted*.000024,1);
  next.elapsedMs+=dt; next.boostMs=Math.max(next.boostMs-dt,0);
  return finish(next);
}
export function secondsLeft(state) {
  return Math.max(Math.floor((45000-state.elapsedMs+999)/1000),0);
}
export function opponentProgress(index,elapsedMs) {
  const pace=.72+((index*7)%15)*.023;
  return Math.max(0,Math.min(1,Math.max(elapsedMs,0)/45000*pace));
}
