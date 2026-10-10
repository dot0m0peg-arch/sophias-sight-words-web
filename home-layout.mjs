import {createSceneBackground} from './scene-background.mjs';
// HomeScreen20-101 and StorybookHero1090-1105. Pip ownership is injected.
export function mountHomeLayout({document:doc,growthPoints=0,onPlay,onParent,renderCompanion}) {
  if(typeof onPlay!=='function'||typeof onParent!=='function'||typeof renderCompanion!=='function')throw new TypeError('Home requires callbacks and existing companion renderer');
  const node=(tag,cls,text='')=>{const n=doc.createElement(tag);n.className=cls;n.textContent=text;return n;};
  const element=node('section','sophia-home-layout');
  Object.assign(element.style,{position:'relative',width:'100%',height:'100%',overflow:'hidden',background:'#fff8e9',color:'#183f44',fontFamily:'system-ui,sans-serif'});
  const style=node('style','');style.textContent=
    '.sophia-home-layout *{box-sizing:border-box}.sophia-home-scroll{position:relative;z-index:1;height:100%;overflow-y:auto;overflow-x:hidden}.sophia-home-inner{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;min-height:100%;padding:var(--home-pad);gap:var(--home-gap)}'+
    '.sophia-home-left,.sophia-home-right{display:contents}.sophia-home-eyebrow{margin:0;color:#147d79;font-size:var(--home-eyebrow);font-weight:700;letter-spacing:var(--home-tracking);text-align:center}.sophia-home-title{margin:0;white-space:pre-line;text-align:center;font-weight:900;font-size:var(--home-title);line-height:1.12}'+
    '.sophia-home-hero{position:relative;width:100%;max-width:540px;height:var(--home-hero);flex-shrink:0;pointer-events:none}.sophia-home-garden{position:absolute;object-fit:contain;max-width:none;transform:translate(-50%,-50%) rotate(-2deg)}'+
    '.sophia-home-hero-pip{position:absolute;transform:translate(-50%,-50%);pointer-events:none}.sophia-home-hero-pip .pip-companion{width:100%;height:100%;padding:0;gap:0}.sophia-home-hero-pip .pip-art{flex:0 0 100%;width:100%;height:100%}.sophia-home-hero-pip .pip-copy{display:none}'+
    '.sophia-home-growth{width:100%;max-width:460px}.sophia-home-tagline{margin:0;text-align:center;font-size:var(--home-tagline)}.sophia-home-spacer{height:12px;flex-shrink:0}.sophia-home-actions{display:flex;flex-direction:column;gap:var(--home-action-gap);width:100%;max-width:460px}'+
    '.sophia-home-actions button{flex:1 1 0;display:block;width:100%;min-height:var(--home-button-height);border:0;border-radius:28px;box-shadow:0 3px 6px #0003;font:900 var(--home-button-font)/1.2 system-ui,sans-serif;cursor:pointer}.sophia-home-play{background:#147d79;color:white}.sophia-home-parent{background:#f17860;color:#183f44}.sophia-home-actions button:focus-visible{outline:3px solid #183f44;outline-offset:3px}'+
    '.sophia-home-layout[data-wide="true"]:not([data-split="true"]) .sophia-home-actions{flex-direction:row;gap:20px;max-width:750px}'+
    '.sophia-home-layout[data-split="true"] .sophia-home-inner{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;align-items:center}.sophia-home-layout[data-split="true"] .sophia-home-left,.sophia-home-layout[data-split="true"] .sophia-home-right{display:flex;flex-direction:column;align-items:center;min-width:0}.sophia-home-layout[data-split="true"] .sophia-home-left{gap:6px}.sophia-home-layout[data-split="true"] .sophia-home-right{gap:8px}.sophia-home-layout[data-split="true"] .sophia-home-eyebrow{white-space:nowrap;letter-spacing:0}.sophia-home-layout[data-split="true"] .sophia-home-actions{gap:8px}.sophia-home-layout[data-split="true"] .sophia-home-spacer{display:none}';
  const background=createSceneBackground({document:doc,game:'find',storybook:false});
  const scroll=node('div','sophia-home-scroll'),inner=node('div','sophia-home-inner');
  const left=node('div','sophia-home-left'),right=node('div','sophia-home-right');
  const eyebrow=node('p','sophia-home-eyebrow','A LITTLE ADVENTURE IN READING');
  const title=node('h1','sophia-home-title',"Sophia's\nSight Words");
  const hero=node('div','sophia-home-hero');hero.setAttribute('aria-hidden','true');
  const garden=node('img','sophia-home-garden');garden.src='assets/meshy_garden.png';garden.alt='';garden.draggable=false;
  const heroPip=node('div','sophia-home-hero-pip'),growth=node('div','sophia-home-growth');
  let heroCompanion,growthCompanion;
  try {
    heroCompanion=renderCompanion({document:doc,points:growthPoints,compact:true,showPip:true,decorative:true});
    growthCompanion=renderCompanion({document:doc,points:growthPoints,compact:true,showPip:false,decorative:false});
    for(const c of [heroCompanion,growthCompanion])if(!c?.element||typeof c.update!=='function'||typeof c.dispose!=='function')throw new TypeError('Companion renderer must return element/update/dispose');
  } catch(error) {heroCompanion?.dispose?.();growthCompanion?.dispose?.();background.dispose();throw error;}
  heroPip.append(heroCompanion.element);growth.append(growthCompanion.element);hero.append(garden,heroPip);
  const tagline=node('p','sophia-home-tagline','Listen. Discover. Grow.'),spacer=node('div','sophia-home-spacer');
  const actions=node('div','sophia-home-actions'),play=node('button','sophia-home-play','▶  PLAY'),parent=node('button','sophia-home-parent','PARENT');
  play.type=parent.type='button';actions.append(play,parent);left.append(eyebrow,title,hero);right.append(growth,tagline,spacer,actions);
  inner.append(left,right);scroll.append(inner);element.append(style,background.element,scroll);
  let disposed=false,points=growthPoints;
  const playAction=()=>{if(!disposed)onPlay();},parentAction=()=>{if(!disposed)onParent();};
  play.addEventListener('click',playAction);parent.addEventListener('click',parentAction);
  function layout() {
    if(disposed)return;const {width:w,height:h}=element.getBoundingClientRect();if(w<=0||h<=0)return;
    const wide=w>h,phone=Math.min(w,h)<500,compact=wide&&h<650,split=phone&&wide;
    element.dataset.wide=String(wide);element.dataset.phone=String(phone);element.dataset.split=String(split);
    const height=split?Math.max(80,Math.min(135,h*.42)):phone?Math.min(150,h*.23):compact?145:wide?255:265;
    const values={
      '--home-pad':(phone?16:wide?28:24)+'px','--home-gap':(phone?8:12)+'px',
      '--home-eyebrow':(phone?10:13)+'px','--home-tracking':(phone?1:2)+'px',
      '--home-title':(split?28:phone?32:compact?34:wide?42:44)+'px','--home-hero':height+'px',
      '--home-tagline':(split?16:phone?17:20)+'px','--home-action-gap':(phone?12:16)+'px',
      '--home-button-height':(phone?54:86)+'px','--home-button-font':(phone?22:29)+'px'
    };
    for(const [k,v] of Object.entries(values))element.style.setProperty(k,v);
    spacer.hidden=phone;
    heroCompanion.update({points,compact:true,showPip:true});
    growthCompanion.update({points,compact:phone||wide,showPip:false});
    placeHero();
  }
  function placeHero(){
    if(disposed)return;const {width:w,height:h}=hero.getBoundingClientRect();if(w<=0||h<=0)return;
    Object.assign(garden.style,{width:h*1.12+'px',height:h*1.12+'px',left:w*.5+h*.23+'px',top:h*.5+'px'});
    Object.assign(heroPip.style,{width:h*.65+'px',height:h+'px',left:w*.5-h*.40+'px',top:h*.535+'px'});
  }
  function update(next={}){if(disposed)return;if(next.growthPoints!==undefined)points=next.growthPoints;layout();}
  const view=doc.defaultView,observer=view?.ResizeObserver?new view.ResizeObserver(entries=>{
    if(entries.some(e=>e.target===element))layout();else placeHero();
  }):null;
  observer?.observe(element);observer?.observe(hero);if(!observer)view?.addEventListener('resize',layout);layout();
  return {element,update,dispose(){if(disposed)return;disposed=true;observer?.disconnect();if(!observer)view?.removeEventListener('resize',layout);
    play.removeEventListener('click',playAction);parent.removeEventListener('click',parentAction);heroCompanion.dispose();growthCompanion.dispose();background.dispose();element.remove();}};
}
