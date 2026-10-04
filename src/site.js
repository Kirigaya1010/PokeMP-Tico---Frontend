/** Separate public and game views while the authenticated session stays in memory. */
export class SiteView {
  constructor({hasSession,onViewChange}) {
    this.hasSession=hasSession;this.onViewChange=onViewChange;
    this.landing=document.getElementById('landing-view');this.play=document.getElementById('play-view');
    this.dialog=document.getElementById('auth-dialog');this.busy=false;
    for(const button of document.querySelectorAll('[data-play]'))button.addEventListener('click',()=>hasSession()?this.enter():this.openAccess());
    document.getElementById('auth-close').addEventListener('click',()=>{if(!this.busy)this.dialog.close();});
    this.dialog.addEventListener('cancel',event=>{if(this.busy)event.preventDefault();});
    document.getElementById('login-tab').addEventListener('click',()=>this.mode('login'));
    document.getElementById('register-tab').addEventListener('click',()=>this.mode('register'));
    window.addEventListener('hashchange',()=>this.render());
    this.mode('login');this.render();
  }
  mode(mode){
    if(this.busy)return;
    const register=mode==='register';
    document.getElementById('login-tab').setAttribute('aria-pressed',String(!register));
    document.getElementById('register-tab').setAttribute('aria-pressed',String(register));
    const submit=document.getElementById('auth-submit');submit.value=mode;submit.replaceChildren(document.createTextNode(register?'Crear mi cuenta →':'Iniciar sesión →'));
    document.getElementById('password').autocomplete=register?'new-password':'current-password';
    document.getElementById('account-title').textContent=register?'Empieza tu aventura':'Entra a Tiquicia';
  }
  openAccess(){if(!this.dialog.open)this.dialog.showModal();}
  setBusy(value){this.busy=value;for(const id of ['login-tab','register-tab','auth-close'])document.getElementById(id).disabled=value;}
  enter(){
    if(!this.hasSession())return this.openAccess();
    this.dialog.close();if(location.hash!=='#jugar')location.hash='jugar';this.render();window.scrollTo({top:0});
  }
  leave(){history.replaceState(null,'',`${location.pathname}${location.search}`);this.render();window.scrollTo({top:0});}
  render(){
    const playing=location.hash==='#jugar'&&this.hasSession();
    this.landing.hidden=playing;this.play.hidden=!playing;document.body.classList.toggle('playing',playing);
    document.title=playing?'Pueblo Jiménez · PokéMMO Tiquicia Edition':'PokéMMO · Tiquicia Edition';
    this.onViewChange?.(playing);
    if(location.hash==='#jugar'&&!this.hasSession())this.openAccess();
  }
}
