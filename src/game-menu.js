export class GameMenu {
  constructor({audio,onPause}) {
    this.audio=audio;this.onPause=onPause;
    const ids=['game-menu-button','game-menu-dialog','game-menu-close','menu-player-name','skin-button','team-button',
      'bag-button','bag-dialog','bag-close','options-button','options-dialog','options-close','audio-enabled',
      'music-volume','sfx-volume','music-volume-value','sfx-volume-value','audio-status'];
    this.ui=Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
    this.ui['game-menu-button'].addEventListener('click',()=>this.open());
    for(const [dialog,button] of [['game-menu-dialog','game-menu-close'],['bag-dialog','bag-close'],['options-dialog','options-close']]) {
      this.ui[button].addEventListener('click',()=>this.ui[dialog].close());
      this.ui[dialog].addEventListener('close',()=>this.updatePause());
    }
    // Reuse the existing server-backed character and team flows.
    for(const id of ['skin-button','team-button'])this.ui[id].addEventListener('click',()=>this.ui['game-menu-dialog'].close());
    this.ui['bag-button'].addEventListener('click',()=>this.replaceWith('bag-dialog'));
    this.ui['options-button'].addEventListener('click',()=>{this.renderAudio();this.replaceWith('options-dialog');});
    this.ui['audio-enabled'].addEventListener('change',()=>audio.configure({enabled:this.ui['audio-enabled'].checked}));
    for(const [id,key] of [['music-volume','musicVolume'],['sfx-volume','sfxVolume']]) {
      this.ui[id].addEventListener('input',()=>{audio.configure({[key]:Number(this.ui[id].value)});this.renderAudio();});
    }
    audio.onStatus=text=>{this.ui['audio-status'].textContent=text;};
    this.renderAudio();audio.report();
  }
  setProfile(profile){
    this.ready=Boolean(profile?.setup.complete);
    this.ui['game-menu-button'].disabled=!this.ready;
    this.ui['bag-button'].disabled=!this.ready;
    this.ui['menu-player-name'].textContent=profile?.player.username||'';
  }
  open(){if(this.ready&&!this.ui['game-menu-dialog'].open){this.ui['game-menu-dialog'].showModal();this.updatePause();}}
  replaceWith(id){this.ui['game-menu-dialog'].close();this.ui[id].showModal();this.updatePause();}
  updatePause(){this.onPause(['game-menu-dialog','bag-dialog','options-dialog'].some(id=>this.ui[id].open));}
  renderAudio(){
    const s=this.audio.settings;this.ui['audio-enabled'].checked=s.enabled;
    this.ui['music-volume'].value=s.musicVolume;this.ui['sfx-volume'].value=s.sfxVolume;
    this.ui['music-volume-value'].textContent=`${s.musicVolume}%`;this.ui['sfx-volume-value'].textContent=`${s.sfxVolume}%`;
  }
  clear(){this.setProfile(null);for(const id of ['game-menu-dialog','bag-dialog','options-dialog'])if(this.ui[id].open)this.ui[id].close();this.audio.reset();this.updatePause();}
}
