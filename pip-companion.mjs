// Faithful composition from ChildUI.swift GrowthCompanion and MeshyPipView.
export const pipMilestones = Object.freeze([0,8,20,40,70,110]);
export const pipNames = Object.freeze(['Seedling','Little sprout','Leaf buddy','Flower crown','Garden wings','Rainbow friend']);
export function pipPresentation(points) {
  const value = Number.isFinite(points) ? Math.max(0,points) : 0;
  const stage = pipMilestones.findLastIndex(n => value >= n);
  return {points:value, stage, name:pipNames[stage], next:pipNames[Math.min(5,stage+1)],
    fraction:stage===5?1:Math.min(1,(value-pipMilestones[stage])/(pipMilestones[stage+1]-pipMilestones[stage])),
    remaining:stage===5?0:pipMilestones[stage+1]-value, size:.90+stage*.02};
}

export function createPipCompanion(doc, {asset='assets/meshy_pip.png', now=Date.now,
  setTimeout:later=globalThis.setTimeout, clearTimeout:clear=globalThis.clearTimeout,
  matchMedia=doc.defaultView?.matchMedia.bind(doc.defaultView)} = {}) {
  const node=(tag,text='',cls='')=>{const n=doc.createElement(tag);n.textContent=text;n.className=cls;return n;};
  const element=node('div','','pip-companion companion');
  const art=node('div','','pip-art');art.setAttribute('role','img');art.setAttribute('aria-label','Pip the smiling sprout');
  const shadow=node('div','','pip-shadow'),wings=node('div','','pip-wings');wings.append(node('i'),node('i'));
  const ns='http://www.w3.org/2000/svg';
  const svg=()=>{const s=doc.createElementNS(ns,'svg');s.setAttribute('viewBox','0 0 100 112');s.setAttribute('aria-hidden','true');return s;};
  const rainbow=svg();rainbow.classList.add('pip-rainbow');
  for(const [r,color,opacity] of [[48,'#f17860',.75],[43,'#ffcf69',.85]]){
    const c=doc.createElementNS(ns,'circle');
    for(const [key,value] of Object.entries({cx:50,cy:56,r,fill:'none',stroke:color,'stroke-opacity':opacity,'stroke-width':3,pathLength:1,'stroke-dasharray':'.44 .56','stroke-dashoffset':'-.53',transform:'translate(0 -8) rotate(180 50 56)'}))c.setAttribute(key,String(value));
    rainbow.append(c);
  }
  const greeting=node('div','','pip-greeting'),breathing=node('div','','pip-breathing');
  const image=node('img','','pip-original');image.src=asset;image.alt='';image.draggable=false;
  breathing.append(image);greeting.append(breathing);
  const crown=node('div','','pip-crown');crown.setAttribute('aria-hidden','true');
  // SF Symbols sun.max.fill is translated to its circle and eight radial rays.
  for(let i=0;i<3;i++){
    const sun=doc.createElementNS(ns,'svg');sun.setAttribute('viewBox','0 0 20 20');
    const c=doc.createElementNS(ns,'circle');c.setAttribute('cx','10');c.setAttribute('cy','10');c.setAttribute('r','4');sun.append(c);
    for(let a=0;a<8;a++){const ray=doc.createElementNS(ns,'path');ray.setAttribute('d','M10 1.2 L10 3.4');ray.setAttribute('transform',`rotate(${a*45} 10 10)`);sun.append(ray);}
    crown.append(sun);
  }
  const sparkles=node('div','','pip-sparkles');sparkles.setAttribute('aria-hidden','true');sparkles.append(node('span','✦'),node('span','✦'));
  art.append(shadow,wings,rainbow,greeting,crown,sparkles);
  const copy=node('div','','pip-copy growth'),feedback=node('p','','pip-feedback'),title=node('p','','pip-title');
  const meter=node('progress');meter.max=1;const caption=node('p','','pip-caption');
  copy.append(feedback,title,meter,caption);element.append(art,copy);
  const media=matchMedia?.('(prefers-reduced-motion: reduce)');
  let state={points:0,compact:false,dense:false,showPip:true,feedback:null,reaction:null,reactionKey:null,encouraging:false};
  let disposed=false,timer=null,reactionActive=false,remaining=0,deadline=0,lastReaction=null;
  const reduced=()=>!!media?.matches;
  function clearTimer(){if(timer!==null)clear(timer);timer=null;}
  function endGreeting(){timer=null;remaining=0;reactionActive=false;element.classList.remove('pip-reacting');sparkles.hidden=true;}
  function schedule(){
    clearTimer();
    if(!reactionActive||doc.visibilityState==='hidden')return;
    deadline=now()+remaining;timer=later(endGreeting,remaining);
  }
  function refreshMotion(){element.classList.toggle('pip-reduced',reduced());element.classList.toggle('pip-hidden',doc.visibilityState==='hidden');}
  function update(next={}){
    if(disposed)return;
    state={...state,...next};const p=pipPresentation(state.points);
    const compact=state.compact||state.dense;
    element.classList.toggle('pip-compact',compact);element.classList.toggle('pip-dense',state.dense);
    element.classList.toggle('pip-encouraging',state.encouraging);
    element.dataset.stage=String(p.stage);art.hidden=!state.showPip;
    art.style.setProperty('--pip-size',String(p.size));
    crown.hidden=p.stage<3;wings.hidden=p.stage<4;rainbow.toggleAttribute('hidden',p.stage<5);
    title.textContent=`Pip’s Growth Garden · ${p.name}${state.dense&&p.stage<5?` · ${p.remaining} to next`:''}`;
    feedback.textContent=state.feedback||'';feedback.hidden=!state.feedback;
    caption.textContent=p.stage<5?`${p.remaining} growth to ${p.next}`:'Look how your practice helped Pip grow!';caption.hidden=state.dense;
    meter.value=p.fraction;meter.setAttribute('aria-label',`Pip’s growth toward ${p.next}`);meter.setAttribute('aria-valuetext',`${Math.floor(p.fraction*100)} percent`);
    const key=state.reaction===null?null:(state.reactionKey??state.reaction);
    if(key!==lastReaction){
      clearTimer();lastReaction=key;reactionActive=key!==null;remaining=reactionActive?550:0;
      element.classList.toggle('pip-reacting',reactionActive);
      sparkles.hidden=!reactionActive||state.encouraging;schedule();
    }else sparkles.hidden=!reactionActive||state.encouraging;
    refreshMotion();
  }
  const visibility=()=>{
    if(disposed)return;
    if(doc.visibilityState==='hidden'&&timer!==null){remaining=Math.max(0,deadline-now());clearTimer();}
    else if(doc.visibilityState!=='hidden')schedule();
    refreshMotion();
  };
  doc.addEventListener('visibilitychange',visibility);media?.addEventListener?.('change',refreshMotion);update();
  return {element,update,snapshot:()=>({...pipPresentation(state.points),reactionActive,reducedMotion:reduced(),disposed}),
    dispose(){if(disposed)return;disposed=true;clearTimer();doc.removeEventListener('visibilitychange',visibility);media?.removeEventListener?.('change',refreshMotion);element.remove();}};
}
