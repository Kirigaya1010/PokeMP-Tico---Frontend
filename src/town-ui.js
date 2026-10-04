const node=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
const money=value=>`₡${new Intl.NumberFormat('es-CR').format(value||0)}`;
/** Dialogue/shop and bag views consume private server snapshots. */
export class TownUI {
 constructor({send,onPause}){
  Object.assign(this,{send,onPause});this.online=false;this.canControl=false;this.inventory=[];this.team=[];this.balance=0;
  this.bag=document.getElementById('bag-dialog');this.bagList=document.getElementById('bag-items');this.bagNotice=document.getElementById('bag-message');
  this.balanceLabel=document.getElementById('money-value');this.bagBalance=document.getElementById('bag-money');
  document.getElementById('bag-button').addEventListener('click',()=>this.renderBag());
  this.dialog=node('dialog',undefined,'town-dialog');this.dialog.setAttribute('aria-labelledby','town-heading');
  const heading=node('div',undefined,'dialog-heading');this.title=node('h2');this.title.id='town-heading';this.close=node('button','Cerrar · Esc','secondary');this.close.addEventListener('click',()=>this.closeDialogue());heading.append(this.title,this.close);
  this.text=node('p',undefined,'dialogue-text');this.counter=node('p',undefined,'small-copy');this.next=node('button','Continuar · E / Enter');this.next.addEventListener('click',()=>this.advance());
  this.services=node('div',undefined,'town-services');this.notice=node('p');this.notice.setAttribute('role','status');this.dialog.append(heading,this.text,this.counter,this.next,this.services,this.notice);document.body.append(this.dialog);
  this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.closeDialogue();});this.dialog.addEventListener('close',()=>this.onPause(false));
  this.dialog.addEventListener('keydown',e=>{if(typeof e.key!=='string'||e.repeat||e.isComposing)return;const key=e.key.toLowerCase();if((key==='e'||key==='enter')&&!e.target.closest('input,select')&&(key==='e'||e.target.tagName!=='BUTTON')){e.preventDefault();this.advance();}});
 }
 clear(){this.conversation=null;this.battle=null;this.inventory=[];this.team=[];this.balance=0;this.dialog.close();this.onPause(false);this.renderBag();}
 setConnection(online,canControl){if(this.online===online&&this.canControl===canControl)return;this.online=online;this.canControl=canControl;this.renderDialogue();this.renderBag();}
 event(event){
  if(event.type==='dialog.snapshot'){
   const changed=this.conversation?.id!==event.dialog?.id;this.conversation=event.dialog;if(changed){this.page=0;this.notice.textContent='';}
   if(!this.conversation){this.dialog.close();this.onPause(false);}else{if(!this.dialog.open)this.dialog.showModal();this.onPause(true);this.renderDialogue();}return;
  }
  if(event.type==='battle.snapshot'){this.battle=event.battle;this.renderBag();return;}
  if(event.type==='battle.end'){this.battle=null;this.renderBag();return;}
  if(event.type==='error'){this.pending=false;this.closeAfterUse=false;this.notice.textContent=event.message||'Acción rechazada.';this.bagNotice.textContent=this.notice.textContent;this.renderBag();this.renderDialogue();return;}
  if(event.type!=='player.progress')return;
  this.balance=event.money;this.inventory=event.inventory||[];this.team=event.team||[];this.pending=false;this.balanceLabel.textContent=money(this.balance);this.bagBalance.textContent=`Pokécolones: ${money(this.balance)}`;
  if(event.message){this.notice.textContent=event.message;this.bagNotice.textContent=event.message;}
  if(this.closeAfterUse){this.closeAfterUse=false;this.bag.close();}
  this.renderBag();this.renderDialogue();
 }
 transmit(body){if(!this.online||!this.canControl||this.pending)return false;if(!this.send(body))return false;this.pending=true;this.renderBag();this.renderDialogue();return true;}
 closeDialogue(){if(!this.conversation)return;if(this.online&&this.canControl)this.send({type:'dialog.close',id:this.conversation.id});else{this.dialog.close();this.onPause(false);}}
 advance(){if(!this.conversation||!this.online||!this.canControl)return;if(this.page<this.conversation.pages.length-1){this.page++;this.renderDialogue();}else if(!['shop','medical'].includes(this.conversation.role))this.closeDialogue();}
 renderDialogue(){
  const d=this.conversation;if(!d)return;this.title.textContent=d.name;this.text.textContent=d.pages[this.page]||'';this.counter.textContent=`${this.page+1} / ${d.pages.length}`;
  const last=this.page>=d.pages.length-1;this.next.hidden=last&&['shop','medical'].includes(d.role);this.next.textContent=last?'Terminar · E / Enter':'Continuar · E / Enter';this.next.disabled=!this.online||!this.canControl;this.close.disabled=false;
  this.services.replaceChildren();if(!last)return;
  const disabled=!this.online||!this.canControl||this.pending;
  if(d.role==='medical'){const b=node('button','Curar todo el equipo · Gratis');b.disabled=disabled;b.addEventListener('click',()=>this.transmit({type:'medical.heal'}));this.services.append(b);}
  if(d.role==='shop'){
   this.services.append(node('p',`Tus Pokécolones: ${money(this.balance)}`));
   for(const item of this.inventory){const row=node('article',undefined,'shop-item'),text=node('div');text.append(node('h3',item.name),node('p',item.description,'small-copy'),node('span',`${money(item.price)} · En bolsa: ${item.count}`));
    const label=node('label','Cantidad'),quantity=node('input');quantity.type='number';quantity.min='1';quantity.step='1';quantity.value='1';quantity.setAttribute('aria-label',`Cantidad de ${item.name}`);quantity.disabled=disabled;label.append(quantity);
    const button=node('button','Comprar');button.disabled=disabled||this.balance<item.price;button.addEventListener('click',()=>this.transmit({type:'shop.buy',itemId:item.id,quantity:Number(quantity.value)}));row.append(text,label,button);this.services.append(row);}
  }
 }
 renderBag(){
  if(!this.bagList)return;this.bagList.replaceChildren();const disabled=!this.online||!this.canControl||this.pending||Boolean(this.battle);
  if(!this.inventory.some(i=>i.count>0))this.bagList.append(node('p','Tu bolsa está vacía. Puedes comprar provisiones en la tienda.'));
  for(const item of this.inventory.filter(i=>i.count>0)){
   const row=node('article',undefined,'bag-item');row.append(node('h3',`${item.name} × ${item.count}`),node('p',item.description,'small-copy'));
   if(item.kind==='potion'){
    const select=node('select');select.setAttribute('aria-label',`Pokémon para ${item.name}`);
    this.team.forEach(p=>{const option=node('option',`${p.name} · PS ${p.hp}/${p.stats.hp}`);option.value=p.id;option.disabled=p.hp<=0||p.hp>=p.stats.hp;select.append(option);});const candidate=this.team.find(p=>p.hp>0&&p.hp<p.stats.hp);if(candidate)select.value=candidate.id;
    const button=node('button','Usar');button.disabled=disabled||!candidate;button.addEventListener('click',()=>this.transmit({type:'bag.use',itemId:item.id,pokemonId:select.value}));select.disabled=disabled;row.append(select,button);
   }else if(item.kind==='return'){
    const button=node('button','Volver al último pueblo');button.disabled=disabled;button.addEventListener('click',()=>{this.closeAfterUse=true;if(!this.transmit({type:'bag.use',itemId:item.id}))this.closeAfterUse=false;});row.append(button);
   }else row.append(node('p','Úsala desde Bolsa durante un encuentro salvaje.','small-copy'));
   this.bagList.append(row);
  }
  if(this.battle)this.bagList.append(node('p','En PvE usa «Bolsa» en la pantalla de combate. Los objetos no están disponibles en PvP.','small-copy'));
 }
}
