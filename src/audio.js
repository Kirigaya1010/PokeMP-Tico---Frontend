const SETTINGS_KEY = 'pokemp.audio.v1';
const DEFAULTS = {enabled:true,musicVolume:30,sfxVolume:60};
const volume = value => typeof value === 'number' && Number.isFinite(value) ? Math.max(0,Math.min(100,value)) : null;

/** Local audio preferences only. No account or session data enters browser storage. */
export class GameAudio {
  constructor({onStatus=()=>{}}={}) {
    this.onStatus=onStatus;
    this.settings={...DEFAULTS};
    try {
      const saved=JSON.parse(localStorage.getItem(SETTINGS_KEY));
      if(saved&&typeof saved==='object')this.settings={
        enabled:typeof saved.enabled==='boolean'?saved.enabled:DEFAULTS.enabled,
        musicVolume:volume(saved.musicVolume)??DEFAULTS.musicVolume,
        sfxVolume:volume(saved.sfxVolume)??DEFAULTS.sfxVolume,
      };
    } catch { /* Storage can be disabled; keep working with in-memory settings. */ }
    this.manifest={tracks:{},effects:{},cries:{}};
    this.unlocked=false;this.effects=new Set();this.timers=new Set();this.battleId=null;this.audioSequence=0;
    const unlock=event=>{
      if(!event.isTrusted||(event.type==='keydown'&&typeof event.key!=='string'))return;
      this.unlocked=true;this.syncMusic();this.report();
      document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);
    };
    document.addEventListener('pointerdown',unlock,true);document.addEventListener('keydown',unlock,true);
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){this.music?.pause();this.stopEffects();}else this.syncMusic();
    });
    window.addEventListener('pagehide',()=>{this.music?.pause();this.stopEffects();});
  }
  async load() {
    try {
      const response=await fetch(new URL('../assets/audio/manifest.json',import.meta.url),{cache:'no-store'});
      if(!response.ok)throw new Error('No se pudo cargar el catálogo de audio.');
      this.manifest=await response.json();this.syncMusic();
    } catch {this.loadError='No se pudo cargar el audio.';}
    this.report();
  }
  get available(){return Object.keys(this.manifest.tracks||{}).length>0;}
  report(){
    const text=this.loadError||(!this.available?'Recursos de audio pendientes de incorporar.':!this.settings.enabled?'Audio silenciado.':!this.unlocked?'El audio comienza después de tu primera interacción.':'Audio activado.');
    this.onStatus(text);
  }
  configure(changes){
    if(typeof changes.enabled==='boolean')this.settings.enabled=changes.enabled;
    for(const key of ['musicVolume','sfxVolume'])if(volume(changes[key])!==null)this.settings[key]=volume(changes[key]);
    try {localStorage.setItem(SETTINGS_KEY,JSON.stringify(this.settings));} catch { /* Optional preferences. */ }
    for(const effect of this.effects)effect.volume=this.settings.sfxVolume/100;
    if(!this.settings.enabled)this.stopEffects();
    this.syncMusic();this.report();
  }
  url(entry){
    const url=new URL(entry.file,new URL('../assets/',import.meta.url));
    if(url.origin!==location.origin||!url.pathname.startsWith(new URL('../assets/',import.meta.url).pathname))throw new Error('Ruta de audio inválida.');
    return url.href;
  }
  track(id){
    if(this.trackId===id)return;
    this.trackId=id;
    if(this.music){this.music.pause();this.music.removeAttribute('src');this.music.load();}
    this.music=null;this.musicFinished=false;this.syncMusic();
  }
  syncMusic(){
    const entry=this.manifest.tracks?.[this.trackId];
    if(!entry||this.musicFinished)return;
    if(!this.music){
      try {
        this.music=new Audio(this.url(entry));this.music.preload='none';this.music.loop=entry.loop!==false&&!entry.loopStart;
        if(entry.loop!==false&&entry.loopStart>0)this.music.addEventListener('ended',()=>{
          if(this.music?.ended){this.music.currentTime=entry.loopStart;this.syncMusic();}
        });
        if(entry.loop===false){const music=this.music;music.addEventListener('ended',()=>{if(this.music===music)this.musicFinished=true;});}
        this.music.addEventListener('error',()=>{this.loadError='No se pudo reproducir la música.';this.report();});
      } catch {this.loadError='Ruta de música no válida.';this.report();return;}
    }
    this.music.volume=this.settings.musicVolume/100;
    if(document.hidden||!this.unlocked||!this.settings.enabled||this.settings.musicVolume===0){this.music.pause();return;}
    const music=this.music;
    music.play().catch(()=>{if(this.music===music)this.onStatus('El navegador bloqueó el audio. Actívalo desde Opciones.');});
  }
  effect(id){this.playEffect(this.manifest.effects?.[id]);}
  cry(speciesId){this.playEffect(this.manifest.cries?.[speciesId]);}
  playEffect(entry){
    if(!entry||!this.unlocked||!this.settings.enabled||this.settings.sfxVolume===0||document.hidden)return;
    try {
      // Bound simultaneous playback to avoid accumulating sounds after rapid menu clicks.
      if(this.effects.size>=12){const oldest=this.effects.values().next().value;oldest.pause();this.effects.delete(oldest);}
      const sound=new Audio(this.url(entry));sound.volume=this.settings.sfxVolume/100;this.effects.add(sound);
      const remove=()=>this.effects.delete(sound);sound.addEventListener('ended',remove,{once:true});sound.addEventListener('error',remove,{once:true});
      sound.play().catch(remove);
    } catch { /* A failed effect cannot interrupt gameplay or networking. */ }
  }
  setZone(zone){
    this.zoneTrack=zone?.kind==='medical'?'medical':(zone?.outdoorZoneId||zone?.id||'').startsWith('calle-vieja')?'calle-vieja':zone?'jimenez':null;
    if(!this.battleId&&this.trackId!=='victory')this.track(this.zoneTrack);
  }
  resumeWorld(){this.battleId=null;this.track(this.zoneTrack);}
  battleEvent(event,playerId){
    if(event.type==='battle.snapshot'&&event.battle){
      const battle=event.battle,isNew=this.battleId!==battle.id;
      this.track('battle');
      if(isNew){
        this.stopEffects();this.battleId=battle.id;this.audioSequence=battle.audio?.sequence||0;
        this.queue([{kind:'cry',speciesId:battle.own.team[battle.own.activeIndex].speciesId},{kind:'cry',speciesId:battle.opponent.pokemon.speciesId}]);
      }else if(battle.audio&&battle.audio.sequence>this.audioSequence){
        this.audioSequence=battle.audio.sequence;if(!battle.presentation)this.queue(battle.audio.events);
      }
    }else if(event.type==='battle.end'){
      this.battleId=null;this.track(!event.escaped&&event.winnerId===playerId?'victory':this.zoneTrack);
    }
  }
  queue(events){
    for(const [index,event] of (events||[]).entries()){
      const timer=setTimeout(()=>{this.timers.delete(timer);if(event.kind==='cry')this.cry(event.speciesId);else this.effect(event.kind);},index*450);
      this.timers.add(timer);
    }
  }
  stopEffects(){for(const timer of this.timers)clearTimeout(timer);this.timers.clear();for(const effect of this.effects)effect.pause();this.effects.clear();}
  reset(){this.zoneTrack=null;this.track(null);this.stopEffects();this.battleId=null;this.audioSequence=0;}
}
