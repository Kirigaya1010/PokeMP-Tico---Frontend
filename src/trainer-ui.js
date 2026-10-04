import { loadCharacters, characterFrame, characterUrl } from './characters.js';

const TYPE_NAMES = {grass:'Planta',poison:'Veneno',fire:'Fuego',water:'Agua',normal:'Normal',flying:'Volador',bug:'Bicho',steel:'Acero',dark:'Siniestro',dragon:'Dragón'};
const STATS = {hp:'PS máximos',attack:'Ataque',defense:'Defensa',specialAttack:'Ataque especial',specialDefense:'Defensa especial',speed:'Velocidad'};
const spriteUrl = id => new URL(`../assets/img/pokemon/${id}.png`,import.meta.url).href;
const node = (tag,text,className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};

/** Private account setup and read-only team, using only server-issued profiles. */
export class TrainerUI {
  constructor({getApi,onReady,onSkinChanged,onUnauthorized,onLogout,onPause,onMenu}) {
    Object.assign(this,{getApi,onReady,onSkinChanged,onUnauthorized,onLogout,onPause,onMenu});
    this.ui = Object.fromEntries(['setup-dialog','setup-title','setup-step','character-step','starter-step',
      'character-search','character-options','character-selection','starter-options','starter-selection',
      'setup-message','setup-next','setup-back','setup-confirm','setup-retry','setup-logout',
      'team-dialog','team-button','team-close','team-message','team-slots','skin-button','skin-cancel','setup-description'].map(id=>[id,document.getElementById(id)]));
    this.version = 0;
    this.mode='setup';
    this.ui['setup-dialog'].addEventListener('cancel',event=>{if(this.mode!=='skin'||this.saving)event.preventDefault();});
    this.ui['skin-button'].addEventListener('click',()=>this.openSkin());
    this.ui['skin-cancel'].addEventListener('click',()=>{if(!this.saving)this.ui['setup-dialog'].close();});
    for (const id of ['setup-dialog','team-dialog']) this.ui[id].addEventListener('close',()=>this.updatePause());
    this.ui['setup-next'].addEventListener('click',()=>this.step(2));
    this.ui['setup-back'].addEventListener('click',()=>this.step(1));
    this.ui['setup-confirm'].addEventListener('click',()=>this.confirm());
    this.ui['setup-retry'].addEventListener('click',()=>this.prepareSetup());
    this.ui['setup-logout'].addEventListener('click',()=>{if(!this.saving)this.onLogout();});
    this.ui['character-search'].addEventListener('input',()=>{
      const term=this.ui['character-search'].value.toLowerCase();
      for (const button of this.ui['character-options'].children) button.hidden=!button.dataset.name.includes(term);
    });
    this.ui['team-button'].addEventListener('click',()=>this.openTeam());
    this.ui['team-close'].addEventListener('click',()=>this.ui['team-dialog'].close());
    document.addEventListener('keydown',event=>{
      if (typeof event.key !== 'string' || event.isComposing) return;
      if (event.key.toLowerCase() !== 'p' || event.repeat || event.ctrlKey || event.altKey || event.metaKey
        || ['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName) || event.target?.isContentEditable || this.ui['setup-dialog'].open
        || document.getElementById('play-view')?.hidden
        || document.getElementById('game-menu-dialog')?.open || document.getElementById('bag-dialog')?.open || document.getElementById('options-dialog')?.open
        || document.getElementById('battle-dialog')?.open || document.getElementById('challenge-panel')?.open) return;
      if (!this.profile?.setup.complete) return;
      event.preventDefault();
      this.onMenu?.();
      if (this.ui['team-dialog'].open) this.ui['team-dialog'].close(); else this.openTeam();
    });
  }

  updatePause() { this.onPause(this.ui['setup-dialog'].open || this.ui['team-dialog'].open); }

  clear() {
    this.version++;
    this.token=null; this.profile=null; this.skinId=null; this.speciesId=null; this.saving=false;
    for (const id of ['setup-dialog','team-dialog']) if(this.ui[id].open)this.ui[id].close();
    this.ui['team-button'].disabled=true;this.ui['skin-button'].disabled=true;
    this.ui['team-slots'].replaceChildren();
  }

  async setProfile(profile,token) {
    const changed = this.token !== token;
    this.token=token; this.profile=profile;
    if (changed) { this.version++; this.skinId=profile.setup.exclusiveSkinId; this.speciesId=null; }
    this.ui['team-button'].disabled=!profile.setup.complete;this.ui['skin-button'].disabled=!profile.setup.complete;
    if(profile.setup.complete) {
      if(this.ui['setup-dialog'].open)this.ui['setup-dialog'].close();
      this.renderTeam(profile);
    } else {
      this.mode='setup';
      if(!this.ui['setup-dialog'].open)this.ui['setup-dialog'].showModal();
      this.updatePause();
      await this.prepareSetup();
    }
  }

  step(number) {
    if(this.saving)return;
    this.ui['skin-cancel'].hidden=this.mode!=='skin';
    this.ui['setup-confirm'].textContent=this.mode==='skin'?'Guardar personaje':'Confirmar y entrar a Jiménez';
    this.ui['setup-description'].textContent=this.mode==='skin'?'Puedes cambiar tu personaje cuando quieras. Tu equipo y posición se conservan.':'El Pokémon inicial se elige una sola vez. Puedes cambiar tu personaje cuando quieras.';
    if(this.mode==='skin') {
      this.ui['character-step'].hidden=false;this.ui['starter-step'].hidden=true;
      this.ui['setup-next'].hidden=true;this.ui['setup-back'].hidden=true;this.ui['setup-confirm'].hidden=false;
      this.ui['setup-title'].textContent='Cambia tu personaje';this.ui['setup-step'].textContent='Personajes disponibles para tu cuenta';return;
    }
    this.ui['character-step'].hidden=number!==1;
    this.ui['starter-step'].hidden=number!==2;
    this.ui['setup-next'].hidden=number!==1;
    this.ui['setup-back'].hidden=number!==2;
    this.ui['setup-confirm'].hidden=number!==2;
    this.ui['setup-title'].textContent=number===1?'Elige tu personaje':'Elige tu primer Pokémon';
    this.ui['setup-step'].textContent=`Paso ${number} de 2`;
  }

  async prepareSetup() {
    const token=this.token, version=this.version;
    this.ui['setup-message'].textContent='Cargando personajes y Pokémon iniciales…';
    this.ui['setup-retry'].hidden=true;
    this.ui['setup-next'].disabled=true;
    this.ui['setup-confirm'].disabled=true;
    try {
      const [catalog,characters]=await Promise.all([this.getApi().setupCatalog(token),loadCharacters()]);
      if(this.version!==version||this.token!==token)return;
      this.catalog=catalog;
      this.characters=new Map(characters.map(character=>[character.id,character]));
      this.renderCharacters(); this.renderStarters(); this.step(1);
      this.ui['setup-message'].textContent=this.mode==='skin'?'Selecciona un personaje y guarda el cambio.':'Tus elecciones se guardarán al confirmar el paso 2.';
      this.ui['setup-next'].disabled=!this.skinId;
      this.ui['setup-confirm'].disabled=this.mode==='skin'?!this.skinId:!this.speciesId;
    } catch(error) {
      if(this.version!==version||this.token!==token)return;
      this.ui['setup-message'].textContent=error.message;
      this.ui['setup-retry'].hidden=false;
      if(error.status===401)this.onUnauthorized(token);
    }
  }

  renderCharacters() {
    const container=this.ui['character-options']; container.replaceChildren();
    this.ui['character-search'].hidden=false;
    document.querySelector('label[for="character-search"]').hidden=false;
    this.ui['character-search'].value='';
    for(const allowed of this.catalog.characters) {
      const character=this.characters.get(allowed.id); if(!character&&allowed.id!=='jarodski')continue;
      const button=node('button',allowed.name,'character-option');button.type='button';button.dataset.name=allowed.name.toLowerCase();
      button.setAttribute('aria-pressed',String(this.skinId===allowed.id));
      const canvas=node('canvas');canvas.width=canvas.height=16;button.prepend(canvas);
      const image=new Image();
      if(character) {
        const frame=characterFrame(character,false,0);image.src=characterUrl(frame.file);
        image.decode().then(()=>canvas.getContext('2d').drawImage(image,frame.sx,frame.sy,16,16,0,0,16,16)).catch(()=>{});
      } else {
        image.src=new URL('../assets/img/custom/jarodski.png',import.meta.url).href;
        image.decode().then(()=>{const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,Math.round(image.width/4),Math.round(image.height/4),0,0,16,16);}).catch(()=>{});
      }
      button.addEventListener('click',()=>{
        if(this.saving)return;
        this.skinId=allowed.id;
        for(const child of container.children)child.setAttribute('aria-pressed',String(child===button));
        this.ui['character-selection'].textContent=`Personaje: ${allowed.name}`;
        this.ui['setup-next'].disabled=false;
        if(this.mode==='skin')this.ui['setup-confirm'].disabled=false;
      });
      container.append(button);
    }
    this.ui['character-selection'].textContent=this.skinId?`Personaje: ${this.skinId==='jarodski'?'Jarodski · exclusivo':this.characters.get(this.skinId)?.name}`:'Selecciona un personaje para continuar.';
  }

  renderStarters() {
    const container=this.ui['starter-options'];container.replaceChildren();
    for(const starter of this.catalog.starters) {
      const button=node('button',undefined,'starter-option');button.type='button';button.setAttribute('aria-pressed',String(this.speciesId===starter.speciesId));
      const image=node('img');image.src=spriteUrl(starter.speciesId);image.alt='';image.width=image.height=64;
      button.append(image,node('span',starter.name),node('span',`Nivel ${this.catalog.starterLevel} · ${starter.types.map(type=>TYPE_NAMES[type]||type).join(' / ')}`,'small-copy'),node('span',starter.ability.name,'small-copy'));
      button.addEventListener('click',()=>{
        if(this.saving)return;
        this.speciesId=starter.speciesId;
        for(const child of container.children)child.setAttribute('aria-pressed',String(child===button));
        const name=this.skinId==='jarodski'?'Jarodski':this.characters.get(this.skinId)?.name;
        this.ui['starter-selection'].textContent=`Personaje: ${name} · Inicial: ${starter.name}. La elección del inicial es permanente.`;
        this.ui['setup-confirm'].disabled=false;
      });
      container.append(button);
    }
    this.ui['starter-selection'].textContent='Selecciona el Pokémon que acompañará tu aventura.';
  }

  async confirm() {
    if(this.saving||!this.skinId||(this.mode!=='skin'&&!this.speciesId)||!this.token)return;
    const token=this.token, version=this.version, mode=this.mode;
    this.saving=true;
    for(const id of ['setup-confirm','setup-back','setup-logout','skin-cancel'])this.ui[id].disabled=true;
    this.ui['setup-message'].textContent=mode==='skin'?'Guardando tu personaje…':'Guardando tu personaje y Pokémon inicial…';
    try {
      const profile=mode==='skin'?await this.getApi().changeSkin(token,this.skinId):await this.getApi().completeSetup(token,this.skinId,this.speciesId);
      if(this.version!==version||this.token!==token)return;
      await this.setProfile(profile,token);
      if(mode==='skin')this.onSkinChanged?.(profile,token);else await this.onReady(profile,token);
    } catch(error) {
      if(this.version!==version||this.token!==token)return;
      this.ui['setup-message'].textContent=error.message;
      if(error.status===401)this.onUnauthorized(token);
      // Another tab can complete setup while this tab is choosing.
      if(error.code==='setup_locked') {
        try {
          const profile=await this.getApi().me(token);
          if(this.version!==version||this.token!==token)return;
          await this.setProfile(profile,token);await this.onReady(profile,token);
        } catch { /* Keep the original error visible and allow a retry. */ }
      }
    } finally {
      if(this.version===version) {
        this.saving=false;
        for(const id of ['setup-confirm','setup-back','setup-logout','skin-cancel'])this.ui[id].disabled=false;
      }
    }
  }

  async openSkin() {
    if(!this.profile?.setup.complete||this.saving)return;
    const token=this.token,version=this.version;
    try {
      const profile=await this.getApi().me(token);
      if(this.token!==token||this.version!==version)return;
      this.profile=profile;this.skinId=profile.player.skinId==='default'?null:profile.player.skinId;this.mode='skin';
      if(this.ui['team-dialog'].open)this.ui['team-dialog'].close();
      if(!this.ui['setup-dialog'].open)this.ui['setup-dialog'].showModal();
      this.updatePause();await this.prepareSetup();
    } catch(error) {if(this.token===token&&this.version===version){document.getElementById('account-message').textContent=error.message;if(error.status===401)this.onUnauthorized(token);}}
  }

  renderTeam(profile) {
    const container=this.ui['team-slots'];container.replaceChildren();
    this.ui['team-message'].textContent=`${profile.team.length} / ${profile.teamLimit} Pokémon · Menú de consulta`;
    for(const pokemon of profile.team) {
      const card=node('article',undefined,'pokemon-card');
      const heading=node('div',undefined,'pokemon-heading'),image=node('img');image.src=spriteUrl(pokemon.speciesId);image.alt=pokemon.name;
      const title=node('div');title.append(node('h3',pokemon.name),node('p',`Nivel ${pokemon.level} · ${pokemon.types.map(type=>TYPE_NAMES[type]||type).join(' / ')}`,'small-copy'));
      heading.append(image,title);card.append(heading);
      const hp=node('progress');hp.max=pokemon.stats.hp;hp.value=pokemon.hp;hp.setAttribute('aria-label',`PS de ${pokemon.name}`);
      const xp=node('progress',undefined,'xp-bar');xp.max=Math.max(1,pokemon.xp.required);xp.value=pokemon.xp.current;xp.setAttribute('aria-label',`Experiencia de ${pokemon.name}`);
      card.append(node('span',`PS ${pokemon.hp} / ${pokemon.stats.hp}`),hp,node('span',`XP ${pokemon.xp.current} / ${pokemon.xp.required} para el siguiente nivel`),xp,
        node('p',`Habilidad: ${pokemon.ability.name}`,'small-copy'),node('p',`Naturaleza: ${pokemon.nature.name} (neutra)`,'small-copy'));
      const stats=node('dl',undefined,'stat-list');for(const [key,label] of Object.entries(STATS))stats.append(node('dt',label),node('dd',String(pokemon.stats[key])));
      card.append(stats,node('h4','Movimientos'));
      const list=node('ul',undefined,'move-list');for(const move of pokemon.moves)list.append(node('li',`${move.name} · ${TYPE_NAMES[move.type]||move.type} · PP ${move.pp}/${move.maxPp}`));
      card.append(list);container.append(card);
    }
    for(let i=profile.team.length;i<profile.teamLimit;i++)container.append(node('div',`Espacio ${i+1} · Vacío`,'empty-slot'));
  }

  async openTeam() {
    if(!this.profile?.setup.complete||this.ui['team-dialog'].open)return;
    const token=this.token, version=this.version;
    this.renderTeam(this.profile);this.ui['team-dialog'].showModal();this.updatePause();
    try {
      const profile=await this.getApi().me(token);
      if(this.version!==version||this.token!==token)return;
      this.profile=profile;this.renderTeam(profile);
    } catch(error) {
      if(this.version!==version||this.token!==token)return;
      this.ui['team-message'].textContent=error.message;
      if(error.status===401)this.onUnauthorized(token);
    }
  }
}
