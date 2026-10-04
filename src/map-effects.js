/** Cosmetic effects only: no collision, encounter, weather or network state. */
export class MapEffects {
 constructor(){
  this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.assets={};
  for(const name of ['ripples','leaf','grass']){const image=new Image();image.src=new URL(`../assets/img/effects/${name}.png`,import.meta.url).href;image.decode().then(()=>{this.assets[name]=image;}).catch(()=>{});}
 }
 setZone(zone){this.zone=zone;this.trees=(zone.objects||[]).filter(o=>o.kind==='tree'&&(Math.floor(o.x)+Math.floor(o.y))%7===0);}
 water(ctx,camera,now){
  const z=this.zone,im=this.assets.ripples;if(!z||z.kind||!im||this.motion.matches)return;
  const x0=Math.max(0,Math.floor(camera.x/16)),y0=Math.max(0,Math.floor(camera.y/16)),x1=Math.min(z.width,Math.ceil((camera.x+camera.w)/16)),y1=Math.min(z.height,Math.ceil((camera.y+camera.h)/16));
  ctx.save();ctx.globalAlpha=.65;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(z.terrain[y*z.width+x]===2&&(x*3+y*5)%11===0){const frame=Math.floor(now/260+x+y)%4;ctx.drawImage(im,frame*16,0,16,16,x*16,y*16,16,16);}
  ctx.restore();
 }
 foreground(ctx,camera,players,now){
  const z=this.zone;if(!z||z.kind||this.motion.matches)return;
  const leaf=this.assets.leaf,grass=this.assets.grass;
  if(leaf){ctx.save();ctx.globalAlpha=.85;for(const o of this.trees){const x=o.x*16,y=o.y*16;if(x<camera.x-32||x>camera.x+camera.w||y<camera.y-40||y>camera.y+camera.h)continue;const phase=(now/1000+o.x*.73+o.y*.31)%9;if(phase>3.5)continue;const sx=Math.floor(phase*3)%8*9;ctx.drawImage(leaf,sx,0,9,7,Math.round(x+12+Math.sin(phase*2)*8+phase*4),Math.round(y+8+phase*12),9,7);}ctx.restore();}
  if(grass)for(const p of players){const pos=p.visual,x=Math.floor(pos.x/16),y=Math.floor(pos.y/16);if(now-p.movedAt>180||z.terrain[y*z.width+x]!==4)continue;const frame=Math.floor(now/65)%6;ctx.drawImage(grass,frame*12,0,12,13,Math.round(pos.x-6),Math.round(pos.y-7),12,13);}
 }
}
