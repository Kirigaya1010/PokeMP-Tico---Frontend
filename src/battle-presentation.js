const sprite=(id,back)=>new URL(`../assets/img/pokemon/${id}${back?'-back':''}.png`,import.meta.url).href;
const SHEETS={claw:[32,32,4],fire:[20,30,10],water:[40,33,11],plant:[30,28,8],spark:[30,35,9],boost:[53,35,8]};
/** Animate only public frames delivered after the server resolves an action. */
export class BattlePresentation {
 constructor(ui,{onSound=()=>{},onQuiet=()=>{}}={}){
  this.ui=ui;this.onSound=onSound;this.onQuiet=onQuiet;this.assets={};this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.serial=0;this.animations=new Set();this.hpFrames=new Set();
  this.field=ui['own-mon'].closest('.battlefield');this.canvas=document.createElement('canvas');this.canvas.className='battle-fx';this.canvas.setAttribute('aria-hidden','true');this.field.append(this.canvas);
  this.box=document.getElementById('battle-narration');this.line=document.getElementById('battle-line');this.advance=document.getElementById('battle-advance');
  // Older read-only design fixtures can omit the new narration nodes.
  if(!this.box){this.box=document.createElement('div');this.box.className='battle-narration';this.line=document.createElement('p');this.advance=document.createElement('button');this.advance.textContent='Continuar ▾ · Enter';this.box.append(this.line,this.advance);ui['battle-log'].before(this.box);}
  this.advance.addEventListener('click',()=>this.accelerate());this.box.addEventListener('click',e=>{if(e.target!==this.advance)this.accelerate();});
  ui['battle-dialog'].addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.repeat&&this.busy&&!e.target.closest('input,select')){e.preventDefault();this.accelerate();}});
  ui['battle-dialog'].addEventListener('close',()=>this.reset());this.motion.addEventListener('change',()=>this.finish());
  for(const key of Object.keys(SHEETS)){const im=new Image();im.src=new URL(`../assets/img/effects/${key}.png`,import.meta.url).href;im.decode().then(()=>{this.assets[key]=im;}).catch(()=>{});}
 }
 reset(){this.capturedId=null;this.finish();this.ending=null;this.lastText='';this.id=null;this.sequence=0;this.latest=null;this.lastLog=[];this.line.textContent='';}
 cancel(){this.serial++;this.onQuiet();if(this.wake){this.wake();this.wake=null;}clearTimeout(this.timer);for(const a of this.animations)a.cancel();this.animations.clear();for(const id of this.hpFrames)cancelAnimationFrame(id);this.hpFrames.clear();this.ball?.remove();this.ball=null;for(const prefix of ['own','rival'])this.ui[`${prefix}-mon`].style.opacity='';if(this.capturedId)this.ui[`${this.prefix(this.capturedId)}-mon`].style.opacity='0';this.canvas.getContext('2d').clearRect(0,0,this.canvas.width,this.canvas.height);this.busy=false;}
 finish(){this.cancel();if(this.ending){this.lastText=this.ending;this.ending=null;}if(this.latest)this.paint(this.latest);if(this.lastText)this.line.textContent=this.lastText;}
 accelerate(){if(this.wake){this.wake();this.wake=null;}}
 delay(ms,serial){return new Promise(resolve=>{if(serial!==this.serial)return resolve();this.wake=()=>{clearTimeout(this.timer);resolve();};this.timer=setTimeout(()=>{this.wake=null;resolve();},document.hidden?0:ms);});}
 animate(el,keyframes,duration=400){if(this.motion.matches||document.hidden)return;const a=el.animate(keyframes,{duration,easing:'steps(6,end)'});this.animations.add(a);a.finished.catch(()=>{}).finally(()=>this.animations.delete(a));}
 frame(b){return [{playerId:b.own.player.id,pokemon:b.own.team[b.own.activeIndex]},{playerId:b.opponent.player.id,pokemon:b.opponent.pokemon}];}
 paint(frame,animateHp=false){
  for(const id of this.hpFrames)cancelAnimationFrame(id);this.hpFrames.clear();
  for(const entry of frame||[]){const prefix=entry.playerId===this.playerId?'own':'rival',p=entry.pokemon,im=this.ui[`${prefix}-mon`],bar=this.ui[`${prefix}-hp`],text=this.ui[`${prefix}-hp-text`];
   this.ui[`${prefix}-mon-name`].textContent=p.name;this.ui[`${prefix}-level`].textContent=`Nv. ${p.level}${p.status?` · ${{poison:'ENV',burn:'QUE',sleep:'DOR',paralysis:'PAR',freeze:'CON'}[p.status]||p.status}`:''}`;
   const changed=im.dataset.pokemonId!==p.id;im.dataset.pokemonId=p.id;if(im.src!==sprite(p.speciesId,prefix==='own'))im.src=sprite(p.speciesId,prefix==='own');im.alt=p.name;
   im.classList.toggle('fainted',p.hp===0);im.classList.toggle('battle-idle',p.hp>0);bar.max=p.stats.hp;
   if(changed&&animateHp)this.animate(im,[{opacity:0,transform:`translateX(${prefix==='own'?'-60':'60'}px) scale(.65)`},{opacity:1,transform:'translateX(0) scale(1)'}]);
   const before=Number(bar.value),start=performance.now(),serial=this.serial;
   const display=value=>{bar.value=value;text.textContent=`PS ${Math.round(value)} / ${p.stats.hp}`;};
   if(animateHp&&!changed&&!this.motion.matches&&before!==p.hp){const update=now=>{if(serial!==this.serial)return;const t=Math.min(1,(now-start)/450);display(before+(p.hp-before)*t);if(t<1){const id=requestAnimationFrame(at=>{this.hpFrames.delete(id);update(at);});this.hpFrames.add(id);}};update(start);}else display(p.hp);
   if(p.hp===0&&animateHp)this.animate(im,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(65px)'}],450);
  }
 }
 prefix(id){return id===this.playerId?'own':'rival';}
 async effect(key,target,serial){
  const sheet=this.assets[key],spec=SHEETS[key];if(!sheet||this.motion.matches||document.hidden)return;
  const rect=this.field.getBoundingClientRect(),r=this.ui[`${target}-mon`].getBoundingClientRect();this.canvas.width=Math.ceil(rect.width);this.canvas.height=Math.ceil(rect.height);const ctx=this.canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  const [w,h,frames]=spec,start=performance.now(),x=r.left-rect.left+r.width/2,y=r.top-rect.top+r.height/2;
  await new Promise(resolve=>{const draw=now=>{if(serial!==this.serial)return resolve();const t=(now-start)/500;ctx.clearRect(0,0,this.canvas.width,this.canvas.height);if(t>=1)return resolve();ctx.drawImage(sheet,Math.min(frames-1,Math.floor(t*frames))*w,0,w,h,Math.round(x-w*2),Math.round(y-h*2),w*4,h*4);requestAnimationFrame(draw);};draw(start);});
 }
 async capture(step,serial){
  const target=this.ui[`${this.prefix(step.targetId)}-mon`],r=target.getBoundingClientRect(),rect=this.field.getBoundingClientRect(),ball=document.createElement('span');ball.className='battle-ball';ball.setAttribute('aria-hidden','true');ball.style.left=`${r.left-rect.left+r.width/2-9}px`;ball.style.top=`${r.top-rect.top+r.height/2-9}px`;this.field.append(ball);this.ball=ball;
  this.animate(ball,[{transform:'translate(-160px,90px) rotate(0deg)'},{transform:'translate(-80px,-40px) rotate(180deg)'},{transform:'translate(0,0) rotate(360deg)'}],450);
  await this.delay(450,serial);if(serial!==this.serial)return;target.style.opacity='0';
  for(let i=0;i<Math.min(3,step.capture.shakes);i++){this.animate(ball,[{transform:'rotate(0deg)'},{transform:'rotate(-22deg)'},{transform:'rotate(22deg)'},{transform:'rotate(0deg)'}],220);await this.delay(240,serial);if(serial!==this.serial)return;}
  if(step.capture.success)this.animate(ball,[{filter:'brightness(1)'},{filter:'brightness(2)'},{filter:'brightness(1)'}],250);
  else target.style.opacity='';await this.delay(200,serial);ball.remove();if(this.ball===ball)this.ball=null;
 }
 update(b){
  if(!b)return;this.playerId=b.own.player.id;const frame=this.frame(b),fresh=this.id!==b.id;
  this.latest=frame;this.lastLog=b.log||[];
  if(fresh){this.reset();this.playerId=b.own.player.id;this.id=b.id;this.sequence=b.presentation?.sequence||0;this.latest=frame;this.lastLog=b.log||[];this.paint(frame);for(const prefix of ['own','rival']){this.ui[`${prefix}-mon`].style.opacity='';this.animate(this.ui[`${prefix}-mon`],[{opacity:0,transform:`translateX(${prefix==='own'?'-70':'70'}px)`},{opacity:1,transform:'translateX(0)'}],500);}this.lastText=(b.log||[]).slice(-2).join('\n');this.line.textContent=this.lastText;return;}
  const p=b.presentation;if(p&&p.sequence>this.sequence){this.sequence=p.sequence;this.play(p.steps,frame,b.log);}
  else if(!this.busy)this.paint(frame);
 }
 end(event){
  const p=event.presentation;if(p&&p.sequence>this.sequence){this.sequence=p.sequence;this.play(p.steps,p.steps.at(-1)?.after,event.log);}
  const extra=(event.log||[]).slice(this.lastLog.length);this.lastLog=event.log||[];this.ending=extra.length?extra.join('\n'):event.reason;
  if(!this.busy){this.lastText=this.ending;this.line.textContent=this.ending;this.ending=null;}
 }
 async play(steps,final,log){
  this.cancel();this.capturedId=(steps||[]).find(s=>s.capture?.success)?.targetId||null;const serial=this.serial;this.busy=true;this.latest=final;this.lastLog=log||[];this.ending=null;
  for(const step of steps||[]){
   if(serial!==this.serial)return;this.paint(step.before);this.onSound(step.audio||[]);
   const texts=(step.texts||[]).filter(t=>!/^Tienes 60/.test(t));this.lastText=texts.at(-1)||'';this.line.textContent=texts[0]||'';
   if(step.kind==='move'&&texts.some(t=>t.includes(' usa '))){const actor=this.prefix(step.actorId),target=this.prefix(step.targetId),im=this.ui[`${actor}-mon`];this.animate(im,[{transform:'translate(0,0)'},{transform:`translate(${actor==='own'?24:-24}px,${actor==='own'?-12:12}px)`},{transform:'translate(0,0)'}],360);const self=/up/.test(step.moveEffect||'')||['synthesis','focus-energy','protect'].includes(step.moveEffect),key=!step.movePower?'boost':step.moveType==='fire'?'fire':step.moveType==='water'?'water':step.moveType==='grass'?'plant':step.moveId==='scratch'?'claw':'spark';void this.effect(key,self?actor:target,serial);}
   if(step.kind==='item'&&!step.capture)void this.effect('boost',this.prefix(step.actorId),serial);
   if(step.capture)await this.capture(step,serial);else await this.delay(this.motion.matches?120:330,serial);
   if(serial!==this.serial)return;
   const changed=(step.after||[]).find(e=>{const prior=step.before.find(p=>p.pokemon.id===e.pokemon.id);return prior&&prior.pokemon.hp>e.pokemon.hp;});
   if(changed)this.animate(this.ui[`${this.prefix(changed.playerId)}-mon`],[{filter:'brightness(2)',transform:'translateX(-5px)'},{filter:'brightness(1)',transform:'translateX(5px)'},{filter:'brightness(1)',transform:'translateX(0)'}],220);
   this.paint(step.after,true);if(step.capture?.success)this.ui[`${this.prefix(step.targetId)}-mon`].style.opacity='0';
   for(let i=1;i<texts.length;i++){await this.delay(650,serial);if(serial!==this.serial)return;this.lastText=texts[i];this.line.textContent=texts[i];}
   await this.delay(650,serial);
  }
  if(serial!==this.serial)return;this.busy=false;this.paint(final);if(this.ending){this.lastText=this.ending;this.line.textContent=this.ending;this.ending=null;}
 }
}
