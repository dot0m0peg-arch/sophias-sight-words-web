import {activeWords} from './words.mjs';
export function nextQuestion(data, options={}) {
  const skill=options.skill??'word', random=options.randomUnit??Math.random;
  const words=skill==='word'?activeWords(data):(data.lettersEnabled?Array.from('abcdefghijklmnopqrstuvwxyz'):[]);
  if (!words.length) return null;
  const progress=skill==='word'?data.progress:data.letterProgress;
  const trial=skill==='word'?data.trial:data.letterTrial;
  const state=w=>({level:0,attempts:0,lastSeen:-1,dueAt:null,reviewAtMs:0,recentMisses:0,streak:0,...(progress?.[skill==='word'?w:`${skill}:${w}`]??{})});
  const developing=words.filter(w=>state(w).level===0);
  const started=developing.filter(w=>state(w).attempts>0).sort((a,b)=>state(a).lastSeen-state(b).lastSeen);
  const working=[...started,...developing.filter(w=>state(w).attempts===0)].slice(0,4);
  const active=words.filter(w=>state(w).level>0||working.includes(w));
  const available=active.filter(w=>(state(w).dueAt??0)<=trial);
  const eligible=available.length?available:active;
  const other=eligible.filter(w=>state(w).lastSeen!==trial-1);
  const alternate=active.filter(w=>state(w).lastSeen!==trial-1);
  const candidates=other.length?other:(alternate.length?alternate:eligible);
  const oldest=(list,key)=>list.reduce((best,w)=>best===undefined||key(w)<key(best)?w:best,undefined);
  const stale=candidates.filter(w=>trial-state(w).lastSeen>=Math.max(6,active.length*2));
  const due=candidates.filter(w=>state(w).dueAt!==null&&state(w).dueAt<=trial);
  const now=options.nowMs??Date.now();
  const reviews=candidates.filter(w=>state(w).reviewAtMs>0&&state(w).reviewAtMs<=now);
  const confident=candidates.filter(w=>state(w).level>0);
  let target=oldest(stale,w=>state(w).lastSeen)??oldest(due,w=>state(w).dueAt)??oldest(reviews,w=>state(w).reviewAtMs);
  if(target===undefined&&trial%5===4) target=oldest(confident,w=>state(w).lastSeen);
  if(target===undefined) {
    const weights=candidates.map(w=>10+(5-Math.min(Math.max(state(w).level,0),5))*12+state(w).recentMisses*25);
    let draw=random()*weights.reduce((a,b)=>a+b,0);
    target=candidates.at(-1);
    for(let i=0;i<candidates.length;i++){draw-=weights[i];if(draw<0){target=candidates[i];break;}}
  }
  const p=state(target);
  const wanted=p.recentMisses>=2?2:Math.min(Math.min(Math.max(data.choices,3),5),3+Math.trunc(p.streak/3));
  const count=Math.min(wanted,words.length), twins=['c','k','q'];
  const distractors=words.filter(w=>w!==target&&!(skill==='sound'&&twins.includes(target)&&twins.includes(w))).sort((a,b)=>state(b).level-state(a).level);
  const choices=[...distractors.slice(0,Math.max(count-1,0)),target];
  for(let i=choices.length-1;i>0;i--){const j=Math.min(Math.max(Math.trunc(random()*(i+1)),0),i);[choices[i],choices[j]]=[choices[j],choices[i]];}
  return {target,choices};
}
