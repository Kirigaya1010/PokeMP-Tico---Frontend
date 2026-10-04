import { TrainerUI } from '../src/trainer-ui.js';
const data = await fetch('./trainer-preview.json').then(response=>response.json());
const initial = {player:{id:'design-preview',username:'Vista de diseño'},setup:{complete:false,exclusiveSkinId:null},team:[],teamLimit:6};
const ui = new TrainerUI({
  getApi:()=>({setupCatalog:async()=>data.catalog,me:async()=>ui.profile,
    changeSkin:async(token,skinId)=>({...ui.profile,player:{...ui.profile.player,skinId}}),
    completeSetup:async(token,skinId,speciesId)=>({...initial,player:{...initial.player,skinId},setup:{complete:true,exclusiveSkinId:null},team:[data.examples.find(p=>p.speciesId===speciesId)]})}),
  onPause:()=>{},onUnauthorized:()=>{},onLogout:()=>ui.clear(),
  onReady:()=>ui.openTeam(),
});
const screen = new URL(location.href).searchParams.get('screen');
if (screen === 'skin') {
  data.catalog.characters.push({id:'jarodski',name:'Jarodski · exclusivo'});
  await ui.setProfile({...initial,player:{id:'design-preview',username:'Jarodski',skinId:'jarodski'},setup:{complete:true,exclusiveSkinId:'jarodski'},team:[data.examples[0]]},'design-preview');
  await ui.openSkin();
} else if (screen === 'team') {
  await ui.setProfile({...initial,setup:{complete:true,exclusiveSkinId:null},team:[data.examples[0]]},'design-preview');
  ui.ui['team-dialog'].showModal();
} else {
  await ui.setProfile(initial,'design-preview');
  if (screen === 'starter') { ui.skinId='ninja-boy';ui.step(2); }
}
