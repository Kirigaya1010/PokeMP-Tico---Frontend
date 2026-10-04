// Read-only layout fixture. No accounts, sockets, sound playback or preference changes.
import { GameMenu } from '../src/game-menu.js';
const audio={settings:{enabled:true,musicVolume:30,sfxVolume:60},onStatus:()=>{},report(){this.onStatus('Audio activado.');},configure(){},reset(){}};
const menu=new GameMenu({audio,onPause:()=>{}});
menu.setProfile({setup:{complete:true},player:{username:'Entrenador Jiménez'}});
for(const id of ['skin-button','team-button'])document.getElementById(id).disabled=false;
const screen=new URL(location.href).searchParams.get('screen');
if(screen==='audio')document.getElementById('options-dialog').showModal();else menu.open();
for(const input of document.querySelectorAll('input'))input.disabled=true;
for(const button of document.querySelectorAll('button'))button.disabled=true;
