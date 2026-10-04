import { BattlePresentation } from './battle-presentation.js';
import { loadCharacters, characterFrame, characterUrl } from './characters.js';

const element=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const sprite=(id,back=false)=>new URL(`../assets/img/pokemon/${id}${back?'-back':''}.png`,import.meta.url).href;
const TYPES={normal:'Normal',fire:'Fuego',water:'Agua',grass:'Planta',poison:'Veneno',bug:'Bicho',flying:'Volador',steel:'Acero',dark:'Siniestro',dragon:'Dragón'};

export class SocialUI {
  constructor({send,onPause,onReconnect,onBattleSound,onBattleQuiet}) {
    Object.assign(this,{send,onPause,onReconnect});
    const ids=['chat-form','chat-text','chat-send','chat-target','chat-messages','social-message',
      'challenge-panel','challenge-description','challenge-clock','challenge-accept','challenge-reject',
      'player-dialog','other-player-name','other-player-skin','player-close','player-challenge','player-whisper','player-message',
      'battle-dialog','battle-rules','battle-title','battle-clock','battle-status','rival-mon-name','rival-level','rival-hp','rival-hp-text','rival-mon',
      'own-mon-name','own-level','own-hp','own-hp-text','own-mon','battle-fight','battle-pokemon','battle-surrender','battle-run','battle-reconnect',
      'battle-character','battle-options','battle-log','battle-close','battle-message'];
    this.ui=Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
    this.presentation=new BattlePresentation(this.ui,{onSound:onBattleSound,onQuiet:onBattleQuiet});
    this.bagButton=element('button','Bolsa');this.bagButton.className='secondary';this.bagButton.addEventListener('click',()=>{this.optionMode='items';this.renderOptions();});this.ui['battle-fight'].parentElement.insertBefore(this.bagButton,this.ui['battle-surrender']);
    this.players=[];this.messages=[];this.online=false;this.canControl=false;
    this.ui['chat-text'].addEventListener('input',()=>{
      const input=this.ui['chat-text'];if([...input.value].length>200)input.value=[...input.value].slice(0,200).join('');
    });
    this.ui['chat-form'].addEventListener('submit',e=>{
      e.preventDefault();const text=this.ui['chat-text'].value;
      if(!text.trim()||[...text].length>200){this.notice('Escribe un mensaje de hasta 200 caracteres.');return;}
      if(this.transmit({type:'chat.send',text,targetId:this.ui['chat-target'].value||null}))this.ui['chat-text'].value='';
    });
    this.ui['player-close'].addEventListener('click',()=>this.ui['player-dialog'].close());
    this.ui['player-dialog'].addEventListener('close',()=>this.updatePause());
    this.ui['player-challenge'].addEventListener('click',()=>{
      if(this.transmit({type:'challenge.send',targetId:this.selected?.id}))this.ui['player-dialog'].close();
    });
    this.ui['player-whisper'].addEventListener('click',()=>{
      this.ui['chat-target'].value=this.selected.id;this.ui['player-dialog'].close();this.ui['chat-text'].focus();
    });
    this.ui['challenge-panel'].addEventListener('cancel',e=>e.preventDefault());
    this.ui['challenge-panel'].addEventListener('close',()=>this.updatePause());
    this.ui['battle-character'].addEventListener('click',()=>document.getElementById('game-menu-button').click());
    this.ui['challenge-accept'].addEventListener('click',()=>this.transmit({type:'challenge.reply',id:this.challenge?.id,accept:true}));
    this.ui['challenge-reject'].addEventListener('click',()=>this.transmit(this.challenge?.from.id===this.player?.id
      ? {type:'challenge.cancel',id:this.challenge.id}:{type:'challenge.reply',id:this.challenge?.id,accept:false}));
    this.ui['battle-fight'].addEventListener('click',()=>{this.optionMode='moves';this.renderOptions();});
    this.ui['battle-pokemon'].addEventListener('click',()=>{this.optionMode='team';this.renderOptions();});
    this.ui['battle-run'].addEventListener('click',()=>this.action('run'));
    this.ui['battle-surrender'].addEventListener('click',()=>this.action('surrender'));
    this.ui['battle-reconnect'].addEventListener('click',()=>this.onReconnect());
    this.ui['battle-close'].addEventListener('click',()=>{if(!this.battle){this.ui['battle-dialog'].close();this.result=null;this.updatePause();}});
    this.ui['battle-dialog'].addEventListener('cancel',e=>{if(this.battle)e.preventDefault();});
    this.ui['battle-dialog'].addEventListener('close',()=>this.updatePause());
    setInterval(()=>this.tick(),500);
  }
  updatePause(){this.onPause(Boolean(this.battle||this.ui['battle-dialog'].open||this.ui['player-dialog'].open||this.ui['challenge-panel'].open));}
  setIdentity(player){this.player=player;}
  clear(){
    this.presentation.reset();this.player=null;this.battle=null;this.challenge=null;this.result=null;this.selected=null;this.messages=[];this.pending=false;
    this.ui['chat-messages'].replaceChildren();this.ui['chat-text'].value='';this.ui['social-message'].textContent='';
    if(this.ui['challenge-panel'].open)this.ui['challenge-panel'].close();
    for(const id of ['battle-dialog','player-dialog'])if(this.ui[id].open)this.ui[id].close();
    this.setConnection(false,false);this.updatePause();
  }
  setConnection(online,canControl=this.canControl){
    if(this.connectionSet&&this.online===online&&this.canControl===canControl)return;
    this.connectionSet=true;this.online=online;this.canControl=canControl;
    const chatState=document.getElementById('chat-state');if(chatState)chatState.textContent=online?'EN VIVO':'SIN CONEXIÓN';
    this.ui['chat-text'].disabled=!online;this.ui['chat-send'].disabled=!online;this.ui['chat-target'].disabled=!online;
    if(this.challenge)this.renderChallenge();
    if(this.selected)this.ui['player-challenge'].disabled=!online||!canControl||Boolean(this.battle||this.challenge);
    if(this.battle)this.renderBattle();
  }
  presence(players){
    this.players=players;
    const target=this.ui['chat-target'].value;
    const global=element('option','Global');global.value='';this.ui['chat-target'].replaceChildren(global);
    for(const player of players.filter(p=>p.id!==this.player?.id)){
      const option=element('option',`Susurro a ${player.username}`);option.value=player.id;this.ui['chat-target'].append(option);
    }
    if(players.some(p=>p.id===target))this.ui['chat-target'].value=target;
    if(this.selected&&!players.some(p=>p.id===this.selected.id)){
      this.ui['player-message'].textContent='Este jugador se desconectó.';this.ui['player-challenge'].disabled=true;this.ui['player-whisper'].disabled=true;
    }
  }
  transmit(body){
    if(!this.online||!this.send(body)){this.notice('Conecta al mundo para realizar esta acción.');return false;}
    this.notice('');return true;
  }
  notice(text){
    this.ui['social-message'].textContent=text;
    this.ui['battle-message'].textContent=text;
    this.ui['player-message'].textContent=text;
  }
  async openPlayer(player){
    if(!this.online||player.id===this.player?.id||this.battle)return;
    this.selected=player;this.ui['other-player-name'].textContent=player.username;
    this.ui['player-message'].textContent='';this.ui['player-whisper'].disabled=false;
    this.ui['player-challenge'].disabled=!this.canControl||Boolean(this.challenge);
    if(!this.ui['player-dialog'].open)this.ui['player-dialog'].showModal();this.updatePause();
    const canvas=this.ui['other-player-skin'],ctx=canvas.getContext('2d');ctx.clearRect(0,0,64,64);ctx.imageSmoothingEnabled=false;
    try {
      const characters=await loadCharacters();if(this.selected?.id!==player.id)return;
      const character=characters.find(c=>c.id===player.skinId),image=new Image();
      const frame=character?characterFrame(character,false,0):null;
      image.src=frame?characterUrl(frame.file):new URL('../assets/img/custom/jarodski.png',import.meta.url).href;
      await image.decode();if(this.selected?.id!==player.id)return;
      if(frame)ctx.drawImage(image,frame.sx,frame.sy,16,16,0,0,64,64);
      else if(player.skinId==='jarodski')ctx.drawImage(image,0,0,Math.round(image.width/4),Math.round(image.height/4),0,0,64,64);
    } catch {this.ui['player-message'].textContent='No se pudo cargar la vista del personaje.';}
  }
  event(event){
    if(event.type==='error'){this.pending=false;this.notice(event.message||'El servidor rechazó la acción.');if(this.battle)this.renderOptions();return;}
    if(event.type==='chat.message'){
      const m=event.message;if(!m||typeof m.text!=='string'||!m.sender)return;
      this.messages.push(m);if(this.messages.length>100)this.messages.shift();
      const item=element('li');item.className=m.channel==='whisper'?'whisper-message':'';
      const label=m.channel==='whisper'?`${m.sender.username} → ${m.recipient.username} · susurro`:`${m.sender.username} · global`;
      item.append(element('small',`${new Date(m.sentAt).toLocaleTimeString('es-CR',{hour:'2-digit',minute:'2-digit'})} · ${label}`),element('p',m.text));
      this.ui['chat-messages'].append(item);while(this.ui['chat-messages'].children.length>100)this.ui['chat-messages'].firstChild.remove();
      this.ui['chat-messages'].scrollTop=this.ui['chat-messages'].scrollHeight;return;
    }
    if(event.type==='challenge.snapshot'){
      this.challenge=event.challenge;this.renderChallenge();if(event.message)this.notice(event.message);return;
    }
    if(event.type==='battle.snapshot'){
      const isNew=event.battle&&this.battle?.id!==event.battle.id;
      this.pending=false;this.battle=event.battle;
      if(!this.battle){if(!this.result&&this.ui['battle-dialog'].open)this.ui['battle-dialog'].close();this.updatePause();return;}
      this.result=null;this.challenge=null;this.renderChallenge();
      if(this.ui['player-dialog'].open)this.ui['player-dialog'].close();
      // Battle must remain the top dialog, including when an invitation arrived during another menu.
      if(isNew)for(const id of ['team-dialog','setup-dialog','game-menu-dialog','bag-dialog','options-dialog']){const dialog=document.getElementById(id);if(dialog?.open)dialog.close();}
      this.optionMode=this.battle.needsSwitch?'team':isNew?'moves':this.optionMode||'moves';
      if(!this.ui['battle-dialog'].open)this.ui['battle-dialog'].showModal();this.renderBattle();this.updatePause();return;
    }
    if(event.type==='battle.end'){
      this.ui['battle-message'].textContent='';
      this.battle=null;this.pending=false;this.result=event;
      this.ui['battle-status'].textContent=`${event.captured?'¡Pokémon capturado!':event.escaped?'Escapaste del encuentro.':event.winnerId===null?'Empate':event.winnerId===this.player?.id?'¡Ganaste la batalla!':'Perdiste la batalla.'} ${event.reason}`;
      this.presentation.end(event);this.renderLog(event.log);this.ui['battle-options'].replaceChildren();
      for(const id of ['battle-fight','battle-pokemon','battle-surrender','battle-run'])this.ui[id].disabled=true;
      this.bagButton.disabled=true;
      this.ui['battle-close'].hidden=false;this.ui['battle-reconnect'].hidden=true;this.ui['battle-clock'].textContent='Batalla terminada';
      if(!this.ui['battle-dialog'].open)this.ui['battle-dialog'].showModal();this.updatePause();
    }
  }
  renderChallenge(){
    const c=this.challenge;
    if(!c){if(this.ui['challenge-panel'].open)this.ui['challenge-panel'].close();this.updatePause();return;}
    if(!this.ui['challenge-panel'].open)this.ui['challenge-panel'].showModal();this.updatePause();
    const outgoing=c.from.id===this.player?.id;
    this.ui['challenge-description'].textContent=outgoing?`Esperando respuesta de ${c.to.username}.`:`${c.from.username} te reta a un duelo amistoso.`;
    this.ui['challenge-accept'].hidden=outgoing;this.ui['challenge-reject'].textContent=outgoing?'Cancelar reto':'Rechazar';
    this.ui['challenge-accept'].disabled=this.ui['challenge-reject'].disabled=!this.online||!this.canControl;
    this.tick();
  }
  action(kind,index,itemId){
    const b=this.battle;if(!b||this.pending||!this.canControl)return;this.presentation.finish();
    if(this.transmit({type:'battle.action',id:b.id,turn:b.turn,kind,...(index===undefined?{}:{index}),...(itemId?{itemId}:{})})){
      this.pending=true;this.renderOptions();this.ui['battle-surrender'].disabled=true;this.ui['battle-run'].disabled=true;this.bagButton.disabled=true;
    }
  }
  renderBattle(){
    const b=this.battle;if(!b)return;
    const own=b.own.team[b.own.activeIndex],rival=b.opponent.pokemon;
    this.ui['battle-title'].textContent=`${b.mode==='wild'?'Encuentro salvaje':b.mode==='trainer'?'Batalla':'Duelo'} · ${b.opponent.player.username}`;
    this.ui['battle-rules'].textContent=b.mode==='wild'||b.mode==='trainer'?'Equipo real: PS/PP y progreso se conservan. Derrota o rendición: regreso a Jiménez con el equipo curado. 60 s por acción; 30 s para reconectar.':'Duelo amistoso: copia del equipo con PS/PP completos. Sin XP ni cambios al equipo guardado.';
    this.bagButton.hidden=!['wild','trainer'].includes(b.mode);this.bagButton.disabled=!this.online||!this.canControl||b.needsSwitch||b.waitingForSwitch||b.own.submitted||this.pending;
    this.ui['battle-run'].hidden=b.mode!=='wild';this.ui['battle-run'].disabled=!this.online||!this.canControl||b.needsSwitch||b.own.submitted||this.pending;
    this.presentation.update(b);
    this.ui['battle-status'].textContent=!this.online?'Conexión perdida. Reconecta antes de 30 segundos.'
      :!this.canControl?'Esta pestaña observa el duelo. Reconecta para tomar el control.'
      :b.needsSwitch?'Tu Pokémon se debilitó. Elige otro Pokémon.'
      :b.waitingForSwitch?'Esperando el cambio de Pokémon del rival.'
      :b.own.submitted?'Acción enviada. Esperando al rival…':`Turno ${b.turn} · Elige tu acción.`;
    if(b.disconnected.length)this.ui['battle-status'].textContent+=` ${b.disconnected.map(p=>`${p.username} sin conexión`).join(' · ')}.`;
    this.ui['battle-surrender'].disabled=!this.online||!this.canControl||this.pending;
    this.ui['battle-fight'].disabled=!this.online||!this.canControl||b.own.submitted||b.waitingForSwitch||this.pending;
    this.ui['battle-pokemon'].disabled=!this.online||!this.canControl||b.own.submitted||this.pending;
    this.ui['battle-close'].hidden=true;this.ui['battle-reconnect'].hidden=this.online&&this.canControl;
    this.ui['battle-message'].textContent='';this.renderOptions();this.renderLog(b.log);this.tick();
  }
  renderOptions(){
    const b=this.battle,container=this.ui['battle-options'];container.replaceChildren();if(!b)return;
    const own=b.own.team[b.own.activeIndex];
    const disabled=!this.online||!this.canControl||b.own.submitted||this.pending||(b.waitingForSwitch&&!b.needsSwitch);
    if(this.optionMode==='items'&&!b.needsSwitch){
      for(const item of (b.items||[]).filter(i=>i.kind!=='return')){
        const button=element('button',`${item.name} × ${item.count}${item.kind==='potion'?` · ${item.heal} PS`:''}`);
        button.disabled=disabled||b.waitingForSwitch||item.count<1||Boolean(own.charge)||(item.kind==='ball'&&(b.mode!=='wild'||b.own.team.length>=6));
        button.addEventListener('click',()=>{if(item.kind==='potion'){this.selectedItem=item;this.optionMode='item-target';this.renderOptions();}else this.action('item',undefined,item.id);});container.append(button);
      }
      if(b.own.team.length>=6)container.append(element('p','Equipo lleno (6/6): no puedes lanzar Poké Balls.'));
      if(!(b.items||[]).some(i=>i.count>0))container.append(element('p','No tienes objetos. Compra provisiones en la tienda.'));
    }else if(this.optionMode==='item-target'&&!b.needsSwitch){
      const item=this.selectedItem;
      b.own.team.forEach((p,index)=>{const button=element('button',`${item.name} → ${p.name} · PS ${p.hp}/${p.stats.hp}`);button.disabled=disabled||p.hp<=0||p.hp>=p.stats.hp;button.addEventListener('click',()=>this.action('item',index,item.id));container.append(button);});
    }else if(this.optionMode==='team'||b.needsSwitch){
      b.own.team.forEach((p,index)=>{
        const button=element('button',`${p.name} · Nv. ${p.level} · PS ${p.hp}/${p.stats.hp}${index===b.own.activeIndex?' · En combate':''}`);
        const image=element('img');image.src=sprite(p.speciesId);image.alt='';button.prepend(image);
        button.disabled=disabled||index===b.own.activeIndex||p.hp<=0||(own.hp>0&&Boolean(own.trapped||own.charge));button.addEventListener('click',()=>this.action('switch',index));container.append(button);
      });
    }else{
      own.moves.forEach((m,index)=>{
        const button=element('button',`${m.name} · ${TYPES[m.type]||m.type} · PP ${m.pp}/${m.maxPp}`);
        button.disabled=disabled||(!own.charge&&m.pp<=0)||(own.charge&&own.charge.index!==index);button.addEventListener('click',()=>this.action('move',index));container.append(button);
      });
      if(!own.moves.some(m=>m.pp>0)){const button=element('button','Forcejeo · Sin PP disponibles');button.disabled=disabled||Boolean(own.charge);button.addEventListener('click',()=>this.action('move',-1));container.append(button);}
    }
  }
  renderLog(log){this.ui['battle-log'].replaceChildren(...(log||[]).map(text=>element('li',text)));this.ui['battle-log'].scrollTop=this.ui['battle-log'].scrollHeight;}
  tick(){
    const seconds=time=>Math.max(0,Math.ceil((time-Date.now())/1000));
    if(this.challenge)this.ui['challenge-clock'].textContent=`El reto vence en ${seconds(this.challenge.expiresAt)} s.`;
    if(this.battle){const b=this.battle;this.ui['battle-clock'].textContent=`Turno ${b.turn} · ${seconds(b.deadline)} s${b.disconnected.map(p=>` · ${p.username}: ${seconds(p.until)} s para volver`).join('')}`;}
  }
}
