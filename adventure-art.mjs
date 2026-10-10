// AdventureArt, ChildUI.swift 1107-1166. No animation or learning ownership.
export function createAdventureArt({document:doc,game}) {
  const element=doc.createElement('div');element.className='sophia-adventure-art';
  element.dataset.game=String(game);element.setAttribute('aria-hidden','true');
  Object.assign(element.style,{position:'relative',width:'100%',height:'100%',pointerEvents:'none'});
  const items=[];let disposed=false;
  function item(tag,part,text=''){
    const n=doc.createElement(tag);n.textContent=text;n.dataset.part=part;
    Object.assign(n.style,{position:'absolute',boxSizing:'border-box',pointerEvents:'none'});
    element.append(n);items.push(n);return n;
  }
  function image(asset,part){
    const n=item('img',part);n.src='assets/'+asset+'.png';n.alt='';n.draggable=false;
    Object.assign(n.style,{objectFit:'contain',maxWidth:'none'});return n;
  }
  const backdrop=item('div','backdrop');
  backdrop.style.background=({race:'rgb(237.15,239.7,252.45)',twins:'rgb(249.9,232.05,224.4)',pop:'rgb(226.95,242.25,239.7)',train:'rgb(255,239.7,204)'}[game]||'rgb(237.15,244.8,229.5)');
  backdrop.style.borderRadius='44px';
  const layout=[];
  const box=(n,w,h,x=0,y=0,rotation=0)=>layout.push({n,w,h,x,y,rotation});
  const word=(text,w,h,x,y,rotation,paper)=>{
    const n=item('div','word',text);
    Object.assign(n.style,{display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'18px',border:'2px solid rgba(24,63,68,.15)',background:paper,color:'#183f44',fontWeight:'900',fontFamily:'system-ui,sans-serif'});
    box(n,w,h,x,y,rotation);n.dataset.font=String(w*.35);return n;
  };
  if(game==='find'){
    box(image('meshy_garden','garden'),1,1,.25);
    // Only the original static stage0 crop: .90 scale * native resting .985.
    const shadow=item('div','pip-shadow');
    Object.assign(shadow.style,{height:'6px',borderRadius:'50%',background:'rgba(24,63,68,.12)'});
    box(shadow,.65,0,-.36,0);shadow.dataset.shadow='true';
    const pip=image('meshy_pip','static-pip');pip.style.objectFit='cover';
    box(pip,.65,1,-.36);pip.dataset.scale=String(.90*.985);
  } else if(game==='race')box(image('unicorn_0_0','unicorn'),1.4,.9);
  else if(game==='twins'){
    word('cat',.60,.69,-.27,-.04,-10,'white');word('cat',.60,.69,.25,.04,10,'#ffcf69');
  } else if(game==='pop'){
    for(const [text,d,x,y] of [['a',.46,-.40,-.17],['the',.66,.18,.15],['I',.46,.48,-.28]]){
      const n=item('div','bubble',text);
      Object.assign(n.style,{display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'50%',border:'2px solid rgba(20,125,121,.35)',background:'rgba(255,255,255,.86)',color:'#183f44',fontWeight:'700',fontFamily:'system-ui,sans-serif'});
      n.dataset.font=String(d*.30);box(n,d,d,x,y);
    }
  } else if(game==='train'){
    for(const [i,text,color] of [[0,'go','#147d79'],[1,'see','#f17860']]){
      const car=item('div','train-car',text);
      Object.assign(car.style,{display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'12px',background:color,color:i===0?'white':'#183f44',fontWeight:'700',fontFamily:'system-ui,sans-serif'});
      car.dataset.font='.21';box(car,.59,.41,(i===0?-1:1)*.32,0);
      for(const direction of [-1,1]){
        const wheel=item('div','train-wheel');wheel.style.borderRadius='50%';wheel.style.background='#183f44';
        box(wheel,.14,.14,(i===0?-1:1)*.32+direction*.145,0);wheel.dataset.wheel='true';
      }
    }
  } else {
    box(image('meshy_garden','garden'),.90,1,-.28);
    word('Aa',.62,.67,.30,.06,8,'white');
  }
  function place(){
    if(disposed)return;const {width:w,height:h}=element.getBoundingClientRect();if(w<=0||h<=0)return;
    Object.assign(backdrop.style,{width:h*1.45+'px',height:h*.83+'px',left:w/2+'px',top:h/2+'px',transform:'translate(-50%,-50%)'});
    for(const p of layout){
      const n=p.n,shadow=n.dataset.shadow,wheel=n.dataset.wheel;
      const train=game==='train';
      // VStack car+wheels has a native fixed3px gap; HStack centers the whole height.
      const offsetY=shadow?28:train?(wheel?(h*.41/2+1.5):( -h*.14/2-1.5)):p.y*h;
      Object.assign(n.style,{width:p.w*h+'px',height:shadow?'6px':p.h*h+'px',left:w/2+p.x*h+'px',top:h/2+offsetY+'px',
        transform:'translate(-50%,-50%) rotate('+p.rotation+'deg)'+(n.dataset.scale?' scale('+n.dataset.scale+')':'')});
      if(n.dataset.font)n.style.fontSize=Number(n.dataset.font)*h+'px';
    }
  }
  const view=doc.defaultView,observer=view?.ResizeObserver?new view.ResizeObserver(place):null;
  observer?.observe(element);if(!observer)view?.addEventListener('resize',place);place();
  return {element,dispose(){if(disposed)return;disposed=true;observer?.disconnect();if(!observer)view?.removeEventListener('resize',place);element.remove();}};
}
