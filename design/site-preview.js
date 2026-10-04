// Read-only design view: no accounts, WebSocket, audio or persistence.
import { WorldRenderer } from '../src/world-renderer.js';
const screen=new URL(location.href).searchParams.get('screen');
if(screen==='game'){
 document.getElementById('landing-view').hidden=true;document.getElementById('play-view').hidden=false;document.body.classList.add('playing');
 document.getElementById('account-details').hidden=false;document.getElementById('player-name').textContent='Vista de entrenador';
 document.getElementById('progress-status').textContent='Vista de diseño sin conexión.';document.getElementById('network-label').textContent='Sin conexión';
 document.getElementById('presence-status').textContent='Vista de diseño sin jugadores conectados.';document.getElementById('game-status').textContent='Pueblo Jiménez · Vista de diseño';
 const canvas=document.getElementById('game-canvas'),ctx=canvas.getContext('2d'),renderer=new WorldRenderer();
 const zone=await fetch('./jimenez-integrado.json').then(r=>r.json());await renderer.loaded;renderer.setZone(zone);
 const camera={x:zone.spawn.x-128,y:zone.spawn.y-72,w:256,h:144};ctx.imageSmoothingEnabled=false;ctx.setTransform(3,0,0,3,-camera.x*3,-camera.y*3);const draw=now=>{ctx.clearRect(camera.x,camera.y,camera.w,camera.h);renderer.draw(ctx,camera,[],now);requestAnimationFrame(draw);};requestAnimationFrame(draw);
}else if(screen==='access')document.getElementById('auth-dialog').showModal();
else if(screen==='options')document.getElementById('options-dialog').showModal();
for(const button of document.querySelectorAll('[data-theme-toggle]')){const dark=document.documentElement.dataset.theme==='dark';button.textContent=dark?'Tema: Oscuro':'Tema: Claro';button.setAttribute('aria-pressed',String(dark));}
for(const button of document.querySelectorAll('button'))button.disabled=true;
for(const input of document.querySelectorAll('input'))input.disabled=true;
