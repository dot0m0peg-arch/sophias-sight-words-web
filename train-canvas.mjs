// Drawing translation of App/WordTrainScene.swift. No learning, timers or assets.
export function drawTrainScene(ctx, area, words, frame = {}) {
  const unit = Math.min(area.width / 650, area.height / 125);
  if (!(unit > 0)) return null;
  const left = area.x + area.width / 2 - 310 * unit;
  const baseline = area.y + area.height - 22 * unit;
  const slots = Array.from({length: 5}, (_, i) => ({
    x: left + (130 + i * 98) * unit, y: baseline - 46 * unit,
    width: 88 * unit, height: 46 * unit
  }));
  const ink = '#183f44';
  const rounded = (r, radius, color) => {
    ctx.fillStyle = color; ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.width, r.height, radius); ctx.fill();
  };
  const rect = (x, y, width, height, radius, color) => rounded({x,y,width,height}, radius,color);
  const circle = (x,y,radius,color) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x,y,radius,0,Math.PI*2); ctx.fill();
  };
  const line = (x,y,x2,y2,color,width) => {
    ctx.strokeStyle=color; ctx.lineWidth=width; ctx.beginPath();
    ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();
  };
  const car = (word,r,alpha,wheels) => {
    ctx.save(); ctx.globalAlpha=alpha;
    try {
    rounded(r,10*unit,'#ffcf69');
    if(wheels) for(const f of [.22,.78]) {
      circle(r.x+r.width*f,r.y+r.height+3*unit,8*unit,ink);
      circle(r.x+r.width*f,r.y+r.height+3*unit,3*unit,'#ffffff');
    }
    ctx.fillStyle=ink;ctx.font=`bold ${Math.min(r.height*.47,30*unit)}px system-ui`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(word,r.x+r.width/2,r.y+r.height/2);
    } finally { ctx.restore(); }
  };
  const shoe = (p,scale,right) => {
    const u=unit*scale;if(!(u>0))return;
    const w=30*u,h=18*u;
    rect(p.x-w/2,p.y,w,h,7*u,'#f17860');
    rect(p.x-w/2,p.y+h-4*u,w,5*u,2*u,ink);
    rect(right?p.x+w/2-10*u:p.x-w/2,p.y+4*u,10*u,9*u,4*u,'#fff8e9');
  };
  ctx.save();
  try {
    ctx.globalAlpha=1;
    rounded(area,24*unit,'#e2f2ed');
    circle(area.x+area.width-34*unit,area.y+27*unit,18*unit,'#ffd57b');
    line(area.x+12*unit,baseline+12*unit,area.x+area.width-12*unit,baseline+12*unit,'#7a9c92',3*unit);
    for(let i=0;i<25;i++) {
      const x=area.x+area.width*i/24;
      line(x,baseline+9*unit,x,baseline+17*unit,'#afcbc0',4*unit);
    }
    rect(left,baseline-38*unit,106*unit,38*unit,8*unit,'#147d79');
    rect(left+66*unit,baseline-74*unit,34*unit,62*unit,6*unit,'#f17860');
    rect(left+73*unit,baseline-65*unit,20*unit,20*unit,3*unit,'#fff8e9');
    ctx.fillStyle=ink;ctx.fillRect(left+17*unit,baseline-61*unit,13*unit,28*unit);
    for(const x of [20,80]) {
      circle(left+x*unit,baseline+unit,12*unit,ink);
      circle(left+x*unit,baseline+unit,5*unit,'#ffcf69');
    }
    const flying=Boolean(frame.moving) && words.length>0;
    const visible=flying?words.length-1:words.length;
    for(let i=0;i<Math.min(visible,5);i++) car(words[i],slots[i],frame.carsAlpha??1,true);
    if(flying) {
      car(words[words.length-1],frame.moving.rect,1,false);
      shoe(frame.moving.leftShoe,frame.moving.shoeScale,false);
      shoe(frame.moving.rightShoe,frame.moving.shoeScale,true);
    }
    for(const p of frame.particles??[]) {
      ctx.globalAlpha=p.alpha;circle(p.x,p.y,p.radius,p.color);
    }
  } finally { ctx.restore(); }
  return {unit,slots,baseline,left};
}
