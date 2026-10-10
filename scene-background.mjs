// SceneBackground, ChildUI.swift 939-1027. Decoration only.
export function createSceneBackground({document:doc,game='find',storybook=true}) {
  const ns='http://www.w3.org/2000/svg', element=doc.createElement('div');
  element.className='sophia-scene-background';element.setAttribute('aria-hidden','true');
  Object.assign(element.style,{position:'absolute',inset:'0',overflow:'hidden',pointerEvents:'none'});
  const svg=doc.createElementNS(ns,'svg');
  svg.setAttribute('focusable','false');svg.setAttribute('aria-hidden','true');
  Object.assign(svg.style,{display:'block',width:'100%',height:'100%',pointerEvents:'none'});
  const garden=doc.createElement('img');garden.src='assets/meshy_garden.png';garden.alt='';garden.draggable=false;
  Object.assign(garden.style,{position:'absolute',width:'230px',height:'auto',right:'0',bottom:'0',pointerEvents:'none',maxWidth:'none'});
  element.append(svg,garden);
  let disposed=false,state={game,storybook:!!storybook};
  function shape(tag,part,attributes) {
    const n=doc.createElementNS(ns,tag);n.setAttribute('data-part',part);
    for(const [key,value] of Object.entries(attributes))n.setAttribute(key,String(value));
    svg.append(n);return n;
  }
  function draw() {
    if(disposed)return;
    const {width:w,height:h}=element.getBoundingClientRect();if(w<=0||h<=0)return;
    svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.replaceChildren();
    element.dataset.game=state.game;
    if(state.game==='race') {
      for(let i=0;i<7;i++){
        const x=w*i/6,y=h*(i%2===0?.9:.15);
        shape('circle','race-ring',{cx:x,cy:y,r:w*.13,fill:'none',stroke:'#dce4fa','stroke-width':3});
        shape('ellipse','note-head',{cx:x-3,cy:y+8,rx:12,ry:8,fill:'#147d79','fill-opacity':.14});
        shape('path','note-stem',{d:'M'+(x+8)+' '+(y+5)+' L'+(x+8)+' '+(y-35)+' L'+(x+25)+' '+(y-25),fill:'none',stroke:'#147d79','stroke-opacity':.14,'stroke-width':5});
      }
    } else if(state.game==='pop') {
      for(let i=0;i<9;i++)shape('circle','pop-ring',{cx:w*((i*173)%1000)/1000,cy:h*((i*271)%1000)/1000,r:22+i*6,fill:'none',stroke:'#c3e8e7','stroke-opacity':.5,'stroke-width':3});
    } else if(state.game==='twins') {
      for(let i=0;i<8;i++)shape('rect','twins-square',{x:w*((i*19)%100)/100,y:h*((i*31)%100)/100,width:60,height:60,rx:18,fill:'#f5dfde'});
    } else if(state.game==='train') {
      shape('rect','train-ground',{x:0,y:h*.82,width:w,height:h*.18,fill:'#e5ecdc'});
      shape('path','train-rail',{d:'M0 '+h*.91+' L'+w+' '+h*.91,fill:'none',stroke:'#147d79','stroke-opacity':.15,'stroke-width':7});
      for(let i=0;i<24;i++)shape('path','train-tie',{d:'M'+i*w/23+' '+h*.88+' L'+i*w/23+' '+h*.94,stroke:'#147d79','stroke-opacity':.15,'stroke-width':4});
    } else {
      shape('circle','sun',{cx:w*.96,cy:w*.05,r:w*.13,fill:'#ffcf69','fill-opacity':.45});
      shape('path','hill',{d:'M0 '+h+' L0 '+h*.88+' C'+w*.25+' '+h*.73+' '+w*.70+' '+h*1.02+' '+w+' '+h*.83+' L'+w+' '+h+' Z',fill:'#dceed9'});
      for(let i=0;i<6;i++){
        shape('circle','flower-petal',{cx:w*i/5,cy:h*.94,r:12,fill:'#f17860','fill-opacity':.22});
        shape('circle','flower-center',{cx:w*i/5,cy:h*.94,r:4,fill:'#ffcf69'});
      }
    }
  }
  function update(next={}) {
    if(disposed)return;
    if(next.game!==undefined)state.game=String(next.game);
    if(next.storybook!==undefined)state.storybook=!!next.storybook;
    garden.hidden=!state.storybook;garden.style.opacity=state.game==='letters'?'0.18':'0.1';draw();
  }
  const view=doc.defaultView,observer=view?.ResizeObserver?new view.ResizeObserver(draw):null;
  observer?.observe(element);if(!observer)view?.addEventListener('resize',draw);update();
  return {element,update,dispose(){if(disposed)return;disposed=true;observer?.disconnect();if(!observer)view?.removeEventListener('resize',draw);element.remove();}};
}
