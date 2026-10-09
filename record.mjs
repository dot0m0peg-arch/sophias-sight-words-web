import {activeWords} from './words.mjs';

const defaults = {
  attempts:0, correct:0, recentMisses:0, totalResponseMs:0, lastSeen:-1,
  dueAt:null, independentCorrect:0, successfulDays:0, lastSuccessDay:-1,
  level:0, streak:0, reviewAtMs:0, lastPracticeMs:0, assistedAttempts:0,
  lastEvidenceTrial:-1000
};

export function recordAnswer(data, word, correct, responseMs, options={}) {
  const skill=options.skill ?? 'word';
  const words=skill==='word' ? activeWords(data) :
    (data.lettersEnabled ? Array.from({length:26},(_,i)=>String.fromCharCode(97+i)) : []);
  const key=skill==='word' ? word : `${skill}:${word.toLowerCase()}`;
  const mapName=skill==='word' ? 'progress' : 'letterProgress';
  const trialName=skill==='word' ? 'trial' : 'letterTrial';
  const trial=data[trialName];
  const previous={...defaults,...data[mapName][key]};
  const updated={...previous};
  const now=Math.max(options.nowMs ?? Date.now(),0);
  const day=Math.floor(now/86400000);
  const independent=(options.independent ?? true) && words.length>1;
  updated.attempts++;
  updated.correct+=correct ? 1 : 0;
  updated.totalResponseMs+=Math.min(Math.max(responseMs,0),120000);
  updated.lastSeen=trial;
  updated.lastPracticeMs=now;
  if(!independent) updated.assistedAttempts++;
  if(!correct) {
    updated.streak=0;
    updated.recentMisses=Math.min(previous.recentMisses+1,5);
    updated.level=Math.max(previous.level-1,0);
    updated.dueAt=trial+3;
    updated.reviewAtMs=0;
  } else if(independent) {
    updated.independentCorrect++;
    updated.recentMisses=Math.max(previous.recentMisses-1,0);
    updated.dueAt=null;
    const newDay=previous.lastSuccessDay<0 || day>previous.lastSuccessDay;
    const spaced=previous.lastEvidenceTrial<0 || trial-previous.lastSeen>=Math.min(3,words.length) || newDay;
    if(spaced) {
      updated.streak++;
      updated.lastEvidenceTrial=trial;
      if(newDay) {
        updated.successfulDays++;
        updated.lastSuccessDay=day;
      }
      if(previous.level===0 && updated.streak>=2) updated.level=1;
      else if(previous.level>0 && newDay && previous.reviewAtMs>0 && previous.reviewAtMs<=now)
        updated.level=Math.min(previous.level+1,5);
      if(updated.level>0 && (previous.reviewAtMs===0 || (newDay && previous.reviewAtMs<=now)))
        updated.reviewAtMs=now+[1,3,7,14,30][Math.min(updated.level,5)-1]*86400000;
    }
  } else if(previous.dueAt!==null) updated.dueAt=trial+3;
  let growthPoints=Math.min(Math.max(data.growthPoints,0),999999)+1;
  if(updated.level>previous.level) growthPoints=Math.min(growthPoints+2,1000000);
  return {...data,growthPoints,[mapName]:{...data[mapName],[key]:updated},[trialName]:trial+1};
}
