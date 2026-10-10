// Stateless UnicornRaceScene, ChildUI.swift 158-213. Caller owns all clocks/rules.
export const unicornRoster=Object.freeze(["Sophia's Stardust","Sir Waffles","Captain Pickle","Disco Potato","Professor Noodle","Moonmallow","Banana Zoom","Octo Sparkles","Chef Cupcake","Pirate Pudding","Cactus Socks","Queen Jellybean","Rocket Ravioli","Sleepy Sprinkles","Dino Toot","Duckasaurus"]);
export function createUnicornRaceView({document:doc}) {
  const element=doc.createElement('div');element.className='sophia-unicorn-race';
  element.setAttribute('role','img');
  Object.assign(element.style,{display:'flex',flexDirection:'column',gap:'4px',height:'100%',minHeight:'0',pointerEvents:'none',color:'#183f44',fontFamily:'system-ui,sans-serif'});
  const header=doc.createElement('div');header.setAttribute('aria-hidden','true');
  Object.assign(header.style,{display:'flex',justifyContent:'space-between',gap:'8px',flex:'0 0 auto',fontSize:'20px',lineHeight:'24px'});
  const clock=doc.createElement('strong'),boost=doc.createElement('strong'),percent=doc.createElement('span');
  clock.dataset.nativeId='race-timer';header.append(clock,boost,percent);
  const stage=doc.createElement('div');stage.dataset.part='stage';stage.setAttribute('aria-hidden','true');
  Object.assign(stage.style,{position:'relative',flex:'1 1 auto',minHeight:'0',overflow:'hidden',borderRadius:'22px',pointerEvents:'none'});
  const ns='http://www.w3.org/2000/svg',svg=doc.createElementNS(ns,'svg');svg.setAttribute('focusable','false');
  Object.assign(svg.style,{position:'absolute',inset:'0',width:'100%',height:'100%'});
  const defs=doc.createElementNS(ns,'defs'),gradient=doc.createElementNS(ns,'linearGradient');
  // Unique per instance, so two simultaneous renderers never cross-reference gradients.
  const gradientId='sophia-track-'+(++createUnicornRaceView.instances);
  gradient.setAttribute('id',gradientId);gradient.setAttribute('x2','0');gradient.setAttribute('y2','1');
  for(const [offset,color] of [['0','rgb(255,242.25,219.3)'],['1','rgb(226.95,211.65,237.15)']]){
    const stop=doc.createElementNS(ns,'stop');stop.setAttribute('offset',offset);stop.setAttribute('stop-color',color);gradient.append(stop);
  }defs.append(gradient);svg.append(defs);
  function shape(tag,part,attributes={}){const n=doc.createElementNS(ns,tag);n.setAttribute('data-part',part);for(const [k,v] of Object.entries(attributes))n.setAttribute(k,String(v));svg.append(n);return n;}
  const sky=shape('rect','sky',{fill:'rgb(232.05,244.8,255)'}),
    sun=shape('circle','sun',{fill:'#ffcc00','fill-opacity':.55}),
    grass=shape('rect','grass',{fill:'rgb(191.25,226.95,191.25)'}),
    track=shape('rect','track',{fill:'url(#'+gradientId+')'});
  const lanes=Array.from({length:7},()=>shape('rect','lane',{fill:'white','fill-opacity':.7,height:1}));
  const checks=Array.from({length:40},(_,i)=>shape('rect','checker',{fill:(Math.floor(i/2)+i%2)%2===0?'#183f44':'white'}));
  stage.append(svg);
  const sprites=Array.from({length:16},(_,index)=>{
    const image=doc.createElement('img');image.dataset.racer=String(index);image.alt='';image.draggable=false;
    Object.assign(image.style,{position:'absolute',objectFit:'contain',transform:'translate(-50%,-50%)',maxWidth:'none',pointerEvents:'none'});
    image.src='assets/unicorn_'+index+'_'+index%8+'.png';return image;
  });
  // Preserve the original back-to-front drawing order.
  for(let index=6;index<16;index++)stage.append(sprites[index]);
  const names=[];
  for(let index=1;index<6;index++){
    stage.append(sprites[index]);const label=doc.createElement('span');label.textContent=unicornRoster[index];label.dataset.name=String(index);
    Object.assign(label.style,{position:'absolute',left:'6px',fontWeight:'700',whiteSpace:'nowrap'});stage.append(label);names.push(label);
  }
  const trails=['#ff2d55','#ffcc00','#30b0c7','#af52de'].map(color=>{
    const n=doc.createElement('i');n.dataset.part='boost-trail';Object.assign(n.style,{position:'absolute',borderRadius:'999px',background:color});stage.append(n);return n;
  });
  stage.append(sprites[0]);const sophia=doc.createElement('strong');sophia.textContent='SOPHIA';sophia.dataset.part='sophia-label';
  Object.assign(sophia.style,{position:'absolute',left:'6px',fontSize:'14px',fontWeight:'900'});stage.append(sophia);element.append(header,stage);
  let disposed=false,state={race:{progress:0,boostMs:0,hits:0,phase:'ready'},frame:0,opponents:Array(15).fill(0),secondsLeft:45};
  const attrs=(node,values)=>{for(const [k,v] of Object.entries(values))node.setAttribute(k,String(v));};
  function place() {
    if(disposed)return;const {width:w,height:h}=stage.getBoundingClientRect();if(w<=0||h<=0)return;
    svg.setAttribute('viewBox','0 0 '+w+' '+h);attrs(sky,{width:w,height:h});attrs(sun,{cx:w*.86,cy:h*.05,r:h*.15});
    attrs(grass,{width:w,height:h*.20,y:h*.08});attrs(track,{width:w,height:h*.83,y:h*.17});
    lanes.forEach((n,i)=>attrs(n,{width:w,y:h*(.37+i*.103)}));
    checks.forEach((n,i)=>attrs(n,{width:h*.043,height:h*.043,x:w*.75+(i%2)*h*.043,y:h*.17+Math.floor(i/2)*h*.043}));
    for(let index=0;index<16;index++){
      const height=h*(index===0?.35:index<6?.21:.16),progress=index===0?state.race.progress:state.opponents[index-1];
      const y=index===0?h*.775:index<6?h*(.435+(index-1)*.103)-h*.105:h*(.22+((index-6)%3)*.044)-h*.08;
      Object.assign(sprites[index].style,{width:height*1.65+'px',height:height+'px',left:w*.25+w*.5*progress+'px',top:y+'px'});
    }
    names.forEach((n,i)=>Object.assign(n.style,{top:h*(.435+i*.103)+h*.015+'px',fontSize:Math.min(Math.max(h*.035,9),12)+'px'}));
    trails.forEach((n,i)=>Object.assign(n.style,{width:h*.24+'px',height:h*.016+'px',left:w*.25+w*.5*state.race.progress-h*.3+'px',top:h*.87+i*h*.023+'px'}));
    sophia.style.top=h*.955+'px';
  }
  function update({race,frame,opponents,secondsLeft}) {
    if(disposed)return;
    if(!race||!Number.isFinite(race.progress)||race.progress<0||race.progress>1||!Number.isFinite(race.boostMs)||race.boostMs<0||!Number.isInteger(race.hits)||race.hits<0||!['ready','running','finished'].includes(race.phase))throw new TypeError('Valid caller race state required');
    if(!Number.isInteger(frame)||frame<0||frame>7)throw new RangeError('Caller frame must be integer0..7');
    if(!Array.isArray(opponents)||opponents.length!==15||opponents.some(p=>!Number.isFinite(p)||p<0||p>1))throw new TypeError('Fifteen caller opponent progress values required');
    if(!Number.isInteger(secondsLeft)||secondsLeft<0)throw new TypeError('Caller secondsLeft must be nonnegative integer');
    state={race:{progress:race.progress,boostMs:race.boostMs,hits:race.hits,phase:race.phase},frame,opponents:[...opponents],secondsLeft};
    clock.textContent=secondsLeft+'s';boost.textContent=race.boostMs>0?'RAINBOW BOOST!':race.hits+' word boosts';percent.textContent=Math.trunc(race.progress*100)+'%';
    element.dataset.phase=race.phase;
    element.setAttribute('aria-label','Unicorn Race. '+secondsLeft+' seconds of choosing time left. Sophia '+Math.trunc(race.progress*100)+' percent. '+race.hits+' correct words. Fifteen unicorn opponents.');
    sprites.forEach((n,index)=>{const src='assets/unicorn_'+index+'_'+((frame+index)%8)+'.png';if(n.getAttribute('src')!==src)n.src=src;});
    trails.forEach(n=>n.hidden=race.boostMs<=0);place();
  }
  const view=doc.defaultView,observer=view?.ResizeObserver?new view.ResizeObserver(place):null;
  observer?.observe(stage);if(!observer)view?.addEventListener('resize',place);update(state);
  return {element,update,dispose(){if(disposed)return;disposed=true;observer?.disconnect();if(!observer)view?.removeEventListener('resize',place);element.remove();}};
}
createUnicornRaceView.instances=0;
