// Read-only visual fixture. Does not connect, save preferences or modify accounts.
import {TownUI} from '../src/town-ui.js';
const itemData=[['poke-ball','Poké Ball',200,'ball',null,'Atrapa Pokémon salvajes.'],['potion','Poción',300,'potion',20,'Recupera 20 PS de un Pokémon consciente.'],['super-potion','Superpoción',700,'potion',50,'Recupera 50 PS.'],['hyper-potion','Hiperpoción',1200,'potion',200,'Recupera 200 PS.'],['talue-go','Talue-go',500,'return',null,'Vuelve al último pueblo visitado sin curar.']].map(([id,name,price,kind,heal,description])=>({id,name,price,kind,heal,description,count:2}));
const ui=new TownUI({send:()=>false,onPause:()=>{}});ui.setConnection(true,true);
ui.event({type:'player.progress',money:3000,inventory:itemData,team:[]});
ui.event({type:'dialog.snapshot',dialog:{id:'layout-only',name:'Don Luis · Tienda',pages:['¡Buenas! Tenemos provisiones para el camino.'],role:'shop'}});
for(const element of document.querySelectorAll('button,input,select'))element.disabled=true;
