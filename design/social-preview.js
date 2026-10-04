// Read-only layout fixture; no sockets, accounts or storage mutations.
import { SocialUI } from '../src/social-ui.js';
const data=await fetch('./trainer-preview.json').then(r=>r.json());
const ui=new SocialUI({send:()=>false,onPause:()=>{},onReconnect:()=>{}});
const player={id:'design-a',username:'Entrenador Jiménez',skinId:'ninja-boy'};
const wild=new URL(location.href).searchParams.get('mode')==='wild';
const opponent={id:'design-b',username:wild?'Pokémon salvaje':'Rival Guápiles',skinId:'ninja-princess'};
ui.setIdentity(player);ui.setConnection(true,true);ui.presence([player,opponent]);
ui.event({type:'chat.message',message:{text:'¡Nos vemos en el parque de Jiménez!',sender:opponent,channel:'global',sentAt:Date.now()}});
ui.event({type:'chat.message',message:{text:'¿Listo para el duelo?',sender:player,recipient:opponent,channel:'whisper',sentAt:Date.now()}});
const team=[structuredClone(data.examples[0])],rival=structuredClone(data.examples[1]);
if(wild){rival.speciesId=16;rival.name='Pidgey';rival.types=['normal','flying'];}
if(new URL(location.href).searchParams.get('screen')!=='chat')ui.event({type:'battle.snapshot',battle:{id:'design-duel',mode:new URL(location.href).searchParams.get('mode')||'pvp',turn:1,deadline:Date.now()+60000,
 own:{player,team,activeIndex:0,submitted:false},opponent:{player:opponent,pokemon:rival,remaining:1,submitted:false},
 needsSwitch:false,waitingForSwitch:false,disconnected:[],log:[wild?'¡Apareció un Pokémon salvaje!':'Duelo amistoso: sin premios ni cambios al equipo guardado.','Entrenador Jiménez envía a Bulbasaur.',wild?'¡Pidgey salvaje está listo para combatir!':'Rival Guápiles envía a Charmander.']}});
// Disable fixture actions: this page only displays the implementation's layout.
for(const button of document.querySelectorAll('button'))button.disabled=true;
