/** Learning choices are issued and persisted exclusively by the server. */
export class ProgressionUI {
 constructor({send,onPause,onTeam}){Object.assign(this,{send,onPause,onTeam});this.online=false;this.canControl=false;this.pending=[];
  this.dialog=document.createElement('dialog');this.dialog.className='learning-dialog';this.dialog.setAttribute('aria-labelledby','learn-heading');
  this.title=document.createElement('h2');this.title.id='learn-heading';this.title.textContent='Aprender movimiento';this.description=document.createElement('p');this.options=document.createElement('div');this.options.className='actions';this.notice=document.createElement('p');this.notice.setAttribute('role','status');this.dialog.append(this.title,this.description,this.options,this.notice);document.body.append(this.dialog);
  this.dialog.addEventListener('cancel',e=>e.preventDefault());this.dialog.addEventListener('close',()=>onPause(false));
 }
 clear(){this.pending=[];this.team=[];this.dialog.close();this.onPause(false);}
 setConnection(online,canControl){if(this.online===online&&this.canControl===canControl)return;this.online=online;this.canControl=canControl;this.render();}
 event(event){if(event.type==='error'){this.submitted=false;if(this.pending.length){this.notice.textContent=event.message||'Acción rechazada.';this.render();}return;}if(event.type!=='player.progress')return;
  this.notice.textContent=event.message||'';this.team=event.team;this.pending=event.pendingMoves||[];this.submitted=false;this.onTeam(event.team,event.message);this.render();
 }
 render(){const q=this.pending[0];if(!q){if(this.dialog.open)this.dialog.close();this.onPause(false);return;}const p=this.team?.find(p=>p.id===q.pokemonId);if(!p)return;
  this.description.textContent=`${p.name} quiere aprender ${q.move.name}. Elige un movimiento que olvidar o conserva los actuales.`;this.options.replaceChildren();
  for(const [index,label] of [...p.moves.map((m,i)=>[i,`Olvidar ${m.name} · PP ${m.pp}/${m.maxPp}`]),[-1,'No aprender']]){const button=document.createElement('button');button.textContent=label;button.disabled=!this.online||!this.canControl||this.submitted;button.addEventListener('click',()=>{if(this.send({type:'pokemon.learn',id:q.id,index})){this.submitted=true;this.notice.textContent='Guardando elección…';this.render();}});this.options.append(button);}
  if(!this.dialog.open)this.dialog.showModal();this.onPause(true);
 }
}
