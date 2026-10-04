const canvas = document.querySelector('#map');
const ctx = canvas.getContext('2d');
const assets = {};
const paths = [
  [6,20,42,3], [20,18,8,7], // Calle principal y plaza.
  [9,11,2,9], [23,11,2,7], [33,11,2,9], // Accesos al norte.
  [23,25,2,5], [9,30,26,2], [9,29,2,1], [33,29,2,1], // Circuito sur.
];
const buildings = [
  {name:'Casa', x:8,y:8,sx:0,sy:0,w:64,h:48},
  {name:'Casa', x:5,y:17,sx:128,sy:0,w:64,h:48},
  {name:'Casa', x:8,y:26,sx:0,sy:0,w:64,h:48},
  {name:'Casa', x:32,y:26,sx:128,sy:0,w:64,h:48},
  {name:'Centro médico',x:22,y:8,sx:192,sy:0,w:64,h:48},
  {name:'Tienda',x:32,y:8,sx:256,sy:0,w:48,h:48},
];
const road = (x,y) => paths.some(([a,b,w,h]) => x>=a && x<a+w && y>=b && y<b+h);
// Each 8 px quadrant chooses a surface, edge or outside corner by adjacency.
// Concave joins use a pixel mask over the original surface; no edge is repeated as fill.
function ground(x,y) {
  ctx.drawImage(assets.field,16,112,16,16,x*16,y*16,16,16);
  if (!road(x,y)) return;
  for(let qy=0;qy<2;qy++) for(let qx=0;qx<2;qx++) {
    const dx=qx?1:-1,dy=qy?1:-1;
    const horizontal=road(x+dx,y),vertical=road(x,y+dy),diagonal=road(x+dx,y+dy);
    const sx=horizontal?16+(qx*8):(qx?40:0);
    const sy=vertical?16+(qy*8):(qy?40:0);
    ctx.drawImage(assets.field,sx,sy,8,8,x*16+qx*8,y*16+qy*8,8,8);
    if(horizontal && vertical && !diagonal) {
      // A small inward corner joins the diagonal lawn without a seam at the intersection.
      ctx.save();ctx.beginPath();
      const px=x*16+(qx?16:0),py=y*16+(qy?16:0);
      ctx.moveTo(px,py);ctx.lineTo(px-dx*3,py);ctx.lineTo(px-dx*2,py-dy);
      ctx.lineTo(px-dx,py-dy*2);ctx.lineTo(px,py-dy*3);ctx.closePath();ctx.clip();
      ctx.drawImage(assets.field,16,112,16,16,x*16,y*16,16,16);ctx.restore();
    }
  }
}
function label(text,x,y,color='#f1edd4') {
  ctx.font='10px monospace';ctx.textAlign='center';
  const w=ctx.measureText(text).width+12;
  ctx.fillStyle='#10221eec';ctx.fillRect(x-w/2,y-11,w,16);
  ctx.fillStyle=color;ctx.fillText(text,x,y);
}
function draw() {
  ctx.imageSmoothingEnabled=false;
  ctx.clearRect(0,0,576,576);
  for(let y=0;y<36;y++) for(let x=0;x<48;x++) ground(x,y);
  const trees=[];
  for(let x=0;x<48;x+=2){trees.push([x,0],[x,2],[x,32],[x,34]);}
  for(let y=4;y<32;y+=2){trees.push([0,y],[2,y]);if(y<20||y>=24) trees.push([44,y],[46,y]);}
  // Garden groups frame residential yards; they do not obstruct door approaches.
  trees.push([6,5],[8,5],[12,5],[14,5],[20,5],[22,5],[26,5],[28,5],
    [6,14],[12,14],[14,14],[36,14],[38,14],[40,14],[40,16],
    [6,24],[12,24],[14,24],[30,24],[36,24],[38,24]);
  const objects=trees.map(([x,y])=>({x,y,kind:'tree',bottom:y*16+32}));
  objects.push(...buildings.map(b=>({...b,kind:'building',bottom:b.y*16+b.h})));
  objects.sort((a,b)=>a.bottom-b.bottom);
  for(const o of objects){
    if(o.kind==='tree') ctx.drawImage(assets.nature,0,0,32,32,o.x*16,o.y*16,32,32);
    else ctx.drawImage(assets.house,o.sx,o.sy,o.w,o.h,o.x*16,o.y*16,o.w,o.h);
  }
  if(document.querySelector('#grid').checked){ctx.strokeStyle='#ffffff25';ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<=768;x+=16){ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,768);}for(let y=0;y<=576;y+=16){ctx.moveTo(0,y+.5);ctx.lineTo(768,y+.5);}ctx.stroke();}
  if(document.querySelector('#labels').checked){
    for(const b of buildings) label(b.name,b.x*16+b.w/2,b.y*16-8);
    label('PLAZA · INICIO',24*16,21*16,'#e8c983');
    label('HACIA GUÁPILES →',41*16,21*16,'#e8c983');
    label('VIVIENDAS',16*16,28*16);
  }
}
try {
  await Promise.all(['field','house','nature'].map(async(name)=>{
    const img=new Image();img.src=`../assets/img/ninja-adventure/Tileset${{field:'Field',house:'House',nature:'Nature'}[name]}.png`;
    await img.decode();assets[name]=img;
  }));
  draw();
  for(const id of ['labels','grid']) document.querySelector('#'+id).addEventListener('change',draw);
  document.querySelector('#save').addEventListener('click',()=>{
    const a=document.createElement('a');a.download='jimenez-propuesta.png';a.href=canvas.toDataURL('image/png');a.click();
  });
} catch {document.querySelector('header p').textContent='No se pudieron cargar los assets de la propuesta.';}
