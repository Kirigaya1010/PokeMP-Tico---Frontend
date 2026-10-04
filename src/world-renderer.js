import { MapEffects } from './map-effects.js';
import { loadCharacters, characterFrame, characterUrl } from './characters.js';
const SOURCES = {
  field:'TilesetField.png', house:'TilesetHouse.png', nature:'TilesetNature.png',
  water:'TilesetWater.png', player:'player.png',insideFloor:'TilesetInteriorFloor.png',insideWall:'TilesetWallSimple.png',bed:'tileset_bed.png',
};
/** The online map and its overview use exactly the same terrain and sprite renderer. */
export class WorldRenderer {
  constructor() {
    this.assets = {};this.effects=new MapEffects();
    this.characterAssets = new Map();
    this.loaded = Promise.all(Object.entries(SOURCES).map(async ([name,file]) => {
      const image = new Image();
      image.src = new URL(`../assets/img/ninja-adventure/${file}`, import.meta.url).href;
      await image.decode();this.assets[name]=image;
    }));
    this.loaded = Promise.all([this.loaded, this.loadCustomSkin(), loadCharacters().then(characters => {
      this.characters = new Map(characters.map(character => [character.id, character]));
    })]);
  }

  async loadCustomSkin() {
    const image = new Image();
    image.src = new URL('../assets/img/custom/jarodski.png', import.meta.url).href;
    try { await image.decode(); this.assets.jarodski = image; }
    catch { /* Keep the default sprite available if the custom asset cannot load. */ }
  }

  drawPlayer(ctx, player, now) {
    const pos = player.visual;
    const moving = !this.effects.motion.matches && now - player.movedAt < 180;
    const custom = player.skinId === 'jarodski' && this.assets.jarodski;
    const character = this.characters?.get(player.skinId);
    if (character) {
      const frame = characterFrame(character, moving, player.position.running?now*1.6:now, player.position.facing);
      let image = this.characterAssets.get(frame.file);
      if (image === undefined) {
        this.characterAssets.set(frame.file, null);
        const loadingImage = new Image(); loadingImage.src = characterUrl(frame.file);
        loadingImage.decode().then(() => this.characterAssets.set(frame.file, loadingImage)).catch(() => {});
        image = null;
      }
      if (image) {
        ctx.drawImage(image, frame.sx, frame.sy, 16, 16, Math.round(pos.x)-8, Math.round(pos.y)-12, 16, 16);
        return;
      }
    }
    if (custom) {
      const row = { down:0, left:1, right:2, up:3 }[player.position.facing] ?? 0;
      const col = moving ? Math.floor(now / (player.position.running?90:140)) % 4 : 0;
      // This supplied sheet is 1254 square: round cell edges independently.
      const sx = Math.round(col * custom.width / 4), sy = Math.round(row * custom.height / 4);
      const sw = Math.round((col + 1) * custom.width / 4) - sx;
      const sh = Math.round((row + 1) * custom.height / 4) - sy;
      ctx.drawImage(custom, sx, sy, sw, sh, Math.round(pos.x)-8, Math.round(pos.y)-12, 16, 16);
    } else {
      const col = { down:0, up:1, left:2, right:3 }[player.position.facing] ?? 0;
      const row = moving ? 1 + Math.floor(now / (player.position.running?90:140)) % 2 : 0;
      ctx.drawImage(this.assets.player, col*16, row*16, 16, 16, Math.round(pos.x)-8, Math.round(pos.y)-12, 16, 16);
    }
  }

  setZone(zone) {
    if (!zone || this.zone === zone) return;
    this.zone=zone;this.effects.setZone(zone);
    const t=zone.tileSize;
    this.ground=document.createElement('canvas');
    this.ground.width=zone.width*t;this.ground.height=zone.height*t;
    const ctx=this.ground.getContext('2d');ctx.imageSmoothingEnabled=false;
    const value=(x,y)=>x>=0&&x<zone.width&&y>=0&&y<zone.height ? zone.terrain[y*zone.width+x] : -1;
    for(let y=0;y<zone.height;y++) for(let x=0;x<zone.width;x++) {
      if(zone.kind){
        ctx.drawImage(this.assets.insideFloor,192,16,16,16,x*t,y*t,t,t);
        if(value(x,y)===6){const sx=x===0?0:x===zone.width-1?64:32,sy=y===0?0:y===zone.height-1?64:32;ctx.drawImage(this.assets.insideWall,sx,sy,16,16,x*t,y*t,t,t);}
        continue;
      }
      // Fully opaque grass interior. Other field pieces contain transparency or borders.
      ctx.drawImage(this.assets.field,16,112,16,16,x*t,y*t,t,t);
      const tile=value(x,y);
      if(tile===4){this.transition(ctx,this.assets.field,0,96,x,y,(a,b)=>value(a,b)===4);ctx.drawImage(this.assets.nature,64,160,16,16,x*t,y*t,t,t);}
      if(tile===1) this.transition(ctx,this.assets.field,0,0,x,y,(a,b)=>value(a,b)===1||value(a,b)===3);
      else if(tile===2||tile===3) {
        this.transition(ctx,this.assets.water,0,96,x,y,(a,b)=>value(a,b)===2||value(a,b)===3);
        if(tile===3) ctx.drawImage(this.assets.water,16,208,16,16,x*t,y*t,t,t);
      }
    }
    for(const o of zone.objects.filter(o=>o.layer==='ground')) this.drawObject(ctx,o);
    this.sortedObjects=zone.objects.filter(o=>o.layer!=='ground'&&o.layer!=='foreground')
      .map(object=>({object,y:(object.sortY??(object.collision ? object.collision.y+object.collision.h : object.y+object.h))*t}));
  }

  transition(ctx,atlas,ox,oy,x,y,member) {
    const t=this.zone.tileSize;
    for(let qy=0;qy<2;qy++) for(let qx=0;qx<2;qx++) {
      const dx=qx?1:-1,dy=qy?1:-1;
      const h=member(x+dx,y),v=member(x,y+dy),d=member(x+dx,y+dy);
      ctx.drawImage(atlas,ox+(h?16+qx*8:qx?40:0),oy+(v?16+qy*8:qy?40:0),
        8,8,x*t+qx*8,y*t+qy*8,8,8);
      if(h&&v&&!d) {
        ctx.save();ctx.beginPath();const px=x*t+(qx?16:0),py=y*t+(qy?16:0);
        ctx.moveTo(px,py);ctx.lineTo(px-dx*3,py);ctx.lineTo(px-dx*2,py-dy);
        ctx.lineTo(px-dx,py-dy*2);ctx.lineTo(px,py-dy*3);ctx.closePath();ctx.clip();
        ctx.drawImage(this.assets.field,16,112,16,16,x*t,y*t,t,t);ctx.restore();
      }
    }
  }

  draw(ctx,camera,players=[],now=performance.now(),ownId=null,labels=true,npcSnapshot=null) {
    const z=this.zone;if(!z||!this.ground)return;
    const t=z.tileSize;
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(this.ground,0,0);this.effects.water(ctx,camera,now);
    const npcs=(npcSnapshot||z.npcs||[]).map(n=>({id:n.id,username:n.name,skinId:n.skinId,position:{x:n.x,y:n.y,facing:n.facing},visual:{x:n.x,y:n.y},movedAt:n.moving?now:0,npc:true}));
    const entries=[...this.sortedObjects,...npcs.map(player=>({player,y:player.visual.y+3})),...players.map(player=>({player,y:player.visual.y+3}))];
    entries.sort((a,b)=>a.y-b.y);
    for(const entry of entries) {
      const o=entry.object;
      if(o) {
        if(o.x*t>camera.x+camera.w||o.y*t>camera.y+camera.h||(o.x+o.w)*t<camera.x||(o.y+o.h)*t<camera.y)continue;
        this.drawObject(ctx,o);
      } else {
        const p=entry.player,pos=p.visual;
        this.drawPlayer(ctx,p,now);
        this.label(ctx,`${p.username}${p.id===ownId?' (tú)':''}`,pos.x,pos.y-17);
      }
    }
    for(const o of z.objects.filter(o=>o.layer==='foreground')) this.drawObject(ctx,o);
    this.effects.foreground(ctx,camera,players,now);
    if(labels) {
      for(const o of z.objects.filter(o=>o.label)) this.label(ctx,o.label,(o.x+o.w/2)*t,(o.y+o.h)*t+7);
      for(const d of z.doors||[])this.label(ctx,z.kind?'Salida · E':'Puerta · E',d.x,d.y+8);
      for(const s of z.signs) this.label(ctx,s.label,s.x*t,s.y*t);
    }
  }

  drawObject(ctx,o) {
    const t=this.zone.tileSize,x=Math.round(o.x*t),y=Math.round(o.y*t),w=o.w*t,h=o.h*t;
    if(o.sprite) {
      const s=o.sprite;
      ctx.drawImage(this.assets[s.atlas],s.sx,s.sy,s.sw,s.sh,x,y,w,h);return;
    }
    if(o.kind==='sports-field') {
      ctx.fillStyle='#80a84d';ctx.fillRect(x,y,w,h);
      for(let i=0;i<6;i++){ctx.fillStyle=i%2?'#84ad50':'#80a84d';ctx.fillRect(x,y+Math.floor(h*i/6),w,Math.ceil(h/6));}
      ctx.strokeStyle='#dce5b3';ctx.lineWidth=1;
      ctx.strokeRect(x+3,y+3,w-6,h-6);ctx.beginPath();ctx.moveTo(x+3,y+h/2+.5);ctx.lineTo(x+w-3,y+h/2+.5);
      ctx.stroke();ctx.beginPath();ctx.arc(x+w/2,y+h/2,13,0,Math.PI*2);ctx.stroke();
      ctx.strokeRect(x+w/2-18,y+3,36,16);ctx.strokeRect(x+w/2-18,y+h-19,36,16);
      ctx.fillStyle='#c4cbb5';ctx.fillRect(x+w/2-10,y-1,20,3);ctx.fillRect(x+w/2-10,y+h-2,20,3);
    } else if(o.kind==='cemetery') {
      ctx.fillStyle='#739854';ctx.fillRect(x,y,w,h);
      // Low exterior fence with a gap in the southeast corner for access.
      ctx.fillStyle='#c2bd9c';
      for(let px=0;px<w;px+=8){ctx.fillRect(x+px,y,2,7);if(px<w-24)ctx.fillRect(x+px,y+h-7,2,7);}
      ctx.fillRect(x,y+3,w,2);ctx.fillRect(x,y+h-4,w-24,2);
      for(let py=0;py<h;py+=8){ctx.fillRect(x,y+py,7,2);ctx.fillRect(x+w-7,y+py,7,2);}
    } else if(o.kind==='flowerbed') {
      ctx.fillStyle='#a38456';ctx.fillRect(x,y,w,h);
      ctx.drawImage(this.assets.nature,0,160,16,16,x,y,16,16);
      ctx.drawImage(this.assets.nature,0,160,16,16,x+16,y,16,16);
    } else if(o.kind==='grave') {
      ctx.fillStyle='#47614a';ctx.fillRect(x+2,y+13,12,2);
      ctx.fillStyle='#9daba0';ctx.fillRect(x+4,y+6,8,8);ctx.fillRect(x+5,y+4,6,3);
      ctx.fillStyle='#c7d0b6';ctx.fillRect(x+6,y+7,4,1);ctx.fillRect(x+3,y+13,10,2);
    } else if(o.kind==='service-sign') {
      ctx.fillStyle='#edf0da';ctx.fillRect(x+2,y+2,12,9);ctx.fillStyle='#493e30';ctx.fillRect(x+1,y+11,14,2);
      if(o.service==='medical'){ctx.fillStyle='#c55555';ctx.fillRect(x+7,y+3,2,7);ctx.fillRect(x+4,y+5,8,2);}
      else {ctx.fillStyle='#387982';ctx.fillRect(x+4,y+4,8,5);ctx.fillStyle='#edf0da';ctx.fillRect(x+5,y+6,6,1);}
    } else if(o.kind==='church-sign') {
      ctx.fillStyle='#e8d6a2';ctx.fillRect(x+7,y+1,2,12);ctx.fillRect(x+4,y+5,8,2);
    }
  }

  label(ctx,text,x,y) {
    ctx.font='5px monospace';ctx.textAlign='center';
    const w=ctx.measureText(text).width+4;
    ctx.fillStyle='#10261ee6';ctx.fillRect(Math.round(x-w/2),Math.round(y-6),w,8);
    ctx.fillStyle='#eff7df';ctx.fillText(text,Math.round(x),Math.round(y));
  }
}
