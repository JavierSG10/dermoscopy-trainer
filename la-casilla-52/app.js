'use strict';
const N=13,TARGET=52,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const RAW=window.WORDS_RAW||'';
const WORDS=RAW.split('\n').map(x=>x.split('|')).filter(x=>x[0]&&x[1]);
const THEMES=['Ingenio y cultura','Dobles sentidos','Definiciones indirectas','Cultura general avanzada'];
let S={grid:null,entries:[],selected:null,active:null,dir:'A',values:{},bad:new Set(),secs:0,done:false,timer:null,date:''};
const key=(r,c)=>r+'-'+c;
const day=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function hash(s){let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let x=seed||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}
function shuffle(a,r){a=[...a];for(let i=a.length-1;i;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const blank=()=>Array.from({length:N},()=>Array(N).fill(null));
function canPlace(g,w,r,c,d,allowLoose=false){
  const dr=d==='D'?1:0,dc=d==='A'?1:0;
  if(r<0||c<0||r+dr*(w.length-1)>=N||c+dc*(w.length-1)>=N)return null;
  const br=r-dr,bc=c-dc,ar=r+dr*w.length,ac=c+dc*w.length;
  if(g[br]?.[bc]||g[ar]?.[ac])return null;
  let cross=0,fresh=0;
  for(let i=0;i<w.length;i++){
    const rr=r+dr*i,cc=c+dc*i,cell=g[rr][cc];
    if(cell){
      if(cell.ch!==w[i]||cell.dirs.has(d))return null;
      cross++;
    }else{
      if(d==='A'&&(g[rr-1]?.[cc]||g[rr+1]?.[cc]))return null;
      if(d==='D'&&(g[rr]?.[cc-1]||g[rr]?.[cc+1]))return null;
      fresh++;
    }
  }
  if(!fresh||(!allowLoose&&!cross))return null;
  return{cross,fresh};
}
function put(g,item,r,c,d,entries){const e={id:'e'+entries.length,answer:item[0],clue:item[1],r,c,d,cells:[]};for(let i=0;i<item[0].length;i++){const rr=r+(d==='D'?i:0),cc=c+(d==='A'?i:0);g[rr][cc]??={ch:item[0][i],entries:[],dirs:new Set()};g[rr][cc].entries.push(e.id);g[rr][cc].dirs.add(d);e.cells.push(key(rr,cc))}entries.push(e)}
function numberPuzzle(g,entries){const starts={};for(const e of entries)starts[key(e.r,e.c)]=1;let n=0;for(let rr=0;rr<N;rr++)for(let cc=0;cc<N;cc++)if(starts[key(rr,cc)])starts[key(rr,cc)]=++n;for(const e of entries)e.num=starts[key(e.r,e.c)];entries.sort((a,b)=>a.num-b.num||(a.d>b.d?1:-1));return{g,entries}}
function validSeparation(g,entries){
  for(const e of entries){
    const dr=e.d==='D'?1:0,dc=e.d==='A'?1:0;
    if(g[e.r-dr]?.[e.c-dc]||g[e.r+dr*e.answer.length]?.[e.c+dc*e.answer.length])return false;
  }
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(g[r][c]){
    const ids=g[r][c].entries.map(id=>entries.find(e=>e.id===id)).filter(Boolean);
    if(ids.filter(e=>e.d==='A').length>1||ids.filter(e=>e.d==='D').length>1)return false;
  }
  return true;
}
function generate(date){
  let best=null;
  const clean=WORDS.filter((x,i,a)=>x[0]&&x[1]&&x[0].length<=N&&a.findIndex(y=>y[0]===x[0])===i);
  for(let attempt=0;attempt<140;attempt++){
    const r=rng(hash('la-casilla-v6:'+date)+attempt*104729),g=blank(),pool=shuffle(clean,r),entries=[],used=new Set();
    const first=pool.find(x=>x[0].length>=6)||pool[0];
    put(g,first,Math.floor(N/2),Math.floor((N-first[0].length)/2),'A',entries);used.add(first[0]);
    const tryPlace=(item,loose=false)=>{
      if(used.has(item[0]))return false;
      const opts=[],counts={A:entries.filter(e=>e.d==='A').length,D:entries.filter(e=>e.d==='D').length};
      for(const d of ['A','D'])for(let sr=0;sr<N;sr++)for(let sc=0;sc<N;sc++){
        const fit=canPlace(g,item[0],sr,sc,d,loose);if(!fit)continue;
        const centre=Math.abs(sr+(d==='D'?item[0].length/2:0)-N/2)+Math.abs(sc+(d==='A'?item[0].length/2:0)-N/2);
        const balance=(counts[d==='A'?'D':'A']-counts[d])*12;
        const compact=fit.cross?fit.cross*95:-18;
        opts.push({sr,sc,d,score:compact-fit.fresh*1.5-centre+balance+r()*5});
      }
      if(!opts.length)return false;
      opts.sort((a,b)=>b.score-a.score);
      const pick=opts[Math.floor(r()*Math.min(loose?6:3,opts.length))];
      put(g,item,pick.sr,pick.sc,pick.d,entries);used.add(item[0]);return true;
    };
    for(let pass=0;pass<6&&entries.length<TARGET;pass++)for(const item of shuffle(pool,r)){if(entries.length>=TARGET)break;tryPlace(item,false)}
    if(entries.length<TARGET){
      const shortFirst=[...pool].sort((a,b)=>a[0].length-b[0].length||r()-.5);
      for(let pass=0;pass<6&&entries.length<TARGET;pass++)for(const item of shortFirst){if(entries.length>=TARGET)break;tryPlace(item,true)}
    }
    if(validSeparation(g,entries)&&(!best||entries.length>best.entries.length))best={g,entries};
    if(entries.length>=TARGET&&validSeparation(g,entries))return numberPuzzle(g,entries);
  }
  return numberPuzzle(best.g,best.entries);
}
function answer(k){const[r,c]=k.split('-').map(Number);return S.grid[r][c]?.ch||''}
function storeKey(){return 'laCasilla:v6:'+S.date}
function save(){localStorage.setItem(storeKey(),JSON.stringify({v:S.values,s:S.secs,d:S.done}))}
function load(){try{const x=JSON.parse(localStorage.getItem(storeKey())||'{}');S.values=x.v||{};S.secs=x.s||0;S.done=!!x.d}catch{}}
function render(){const b=$('#board');b.innerHTML='';for(let r=0;r<N;r++)for(let c=0;c<N;c++){const data=S.grid[r][c],el=document.createElement('div');el.className='cell'+(data?'':' block');el.dataset.k=key(r,c);if(data){const starts=S.entries.filter(e=>e.r===r&&e.c===c);if(starts.length){const n=document.createElement('span');n.className='n';n.textContent=starts[0].num;el.append(n)}const input=document.createElement('input');input.maxLength=1;input.value=S.values[key(r,c)]||'';input.readOnly=true;input.onclick=()=>pick(r,c);input.onkeydown=keys;input.setAttribute('aria-label',`Fila ${r+1}, columna ${c+1}`);el.append(input)}b.append(el)}for(const id of ['across','down'])$('#'+id).innerHTML='';for(const e of S.entries){const li=document.createElement('li');li.dataset.e=e.id;li.innerHTML='<span class="num">'+e.num+'</span><span>'+e.clue+'</span>';li.onclick=()=>selectEntry(e.id);$('#'+(e.d==='A'?'across':'down')).append(li)}const kb=$('#kbd');kb.innerHTML='';for(const l of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'){const bt=document.createElement('button');bt.textContent=l;bt.onclick=()=>type(l);kb.append(bt)}const del=document.createElement('button');del.textContent='⌫';del.className='wide';del.onclick=erase;kb.append(del)}
function entry(id){return S.entries.find(e=>e.id===id)}
function pick(r,c){const k=key(r,c),es=S.grid[r][c].entries.map(entry);if(S.selected===k&&es.length>1)S.dir=S.dir==='A'?'D':'A';S.selected=k;const e=es.find(x=>x.d===S.dir)||es[0];S.active=e.id;S.dir=e.d;refresh()}
function selectEntry(id){const e=entry(id);S.active=id;S.dir=e.d;S.selected=e.cells.find(k=>!S.values[k])||e.cells[0];refresh();focus()}
function refresh(){const e=entry(S.active);$$('.cell').forEach(x=>{x.classList.remove('sel','word','bad');if(e?.cells.includes(x.dataset.k))x.classList.add('word');if(x.dataset.k===S.selected)x.classList.add('sel');if(S.bad.has(x.dataset.k))x.classList.add('bad')});$$('.clues li').forEach(li=>li.classList.toggle('on',li.dataset.e===S.active));if(e)$('#active').innerHTML='<b>'+e.num+(e.d==='A'?'H':'V')+'&nbsp;</b> '+e.clue;for(const x of S.entries){const done=x.cells.every(k=>S.values[k]===answer(k));document.querySelector('[data-e="'+x.id+'"]').classList.toggle('done',done)}}
function focus(){document.querySelector('.cell[data-k="'+S.selected+'"] input')?.focus({preventScroll:true})}
function type(ch){if(S.done||!S.selected)return;ch=ch.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z]/g,'');if(!ch)return;S.values[S.selected]=ch.slice(-1);document.querySelector('.cell[data-k="'+S.selected+'"] input').value=S.values[S.selected];S.bad.delete(S.selected);move(1);save();solved()}
function erase(){if(S.done||!S.selected)return;if(S.values[S.selected]){delete S.values[S.selected];document.querySelector('.cell[data-k="'+S.selected+'"] input').value=''}else{move(-1);delete S.values[S.selected];document.querySelector('.cell[data-k="'+S.selected+'"] input').value=''}save();refresh()}
function move(step){const e=entry(S.active),i=e.cells.indexOf(S.selected),k=e.cells[i+step];if(k)S.selected=k;else{const list=S.entries.filter(x=>x.d===S.dir),j=list.findIndex(x=>x.id===e.id),n=list[(j+(step>0?1:list.length-1))%list.length];S.active=n.id;S.selected=n.cells.find(k=>!S.values[k])||n.cells[0]}refresh();focus()}
function spatial(dr,dc){let[r,c]=S.selected.split('-').map(Number);do{r+=dr;c+=dc;if(r<0||c<0||r>=N||c>=N)return}while(!S.grid[r][c]);S.dir=dc?'A':'D';pick(r,c);focus()}
function keys(e){if(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ]$/.test(e.key)){e.preventDefault();type(e.key)}else if(['Backspace','Delete'].includes(e.key)){e.preventDefault();erase()}else if(e.key==='ArrowLeft'){e.preventDefault();spatial(0,-1)}else if(e.key==='ArrowRight'){e.preventDefault();spatial(0,1)}else if(e.key==='ArrowUp'){e.preventDefault();spatial(-1,0)}else if(e.key==='ArrowDown'){e.preventDefault();spatial(1,0)}else if(e.key==='Tab'||e.key===' '){e.preventDefault();pick(...S.selected.split('-').map(Number))}}
function check(){S.bad.clear();for(const[k,v]of Object.entries(S.values))if(v!==answer(k))S.bad.add(k);$('#msg').textContent=S.bad.size?S.bad.size+' casilla(s) incorrecta(s).':'No hay errores en las casillas rellenadas.';refresh()}
function reveal(){const e=entry(S.active);if(!e)return;for(const k of e.cells){S.values[k]=answer(k);document.querySelector('.cell[data-k="'+k+'"] input').value=answer(k)}S.bad.clear();save();refresh();solved()}
function reset(){if(!confirm('¿Borrar todo el progreso de hoy?'))return;S.values={};S.bad.clear();$$('.cell input').forEach(i=>i.value='');save();refresh()}
function all(){const a=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(S.grid[r][c])a.push(key(r,c));return a}
function solved(){if(!all().every(k=>S.values[k]===answer(k)))return;S.done=true;clearInterval(S.timer);save();const txt='La Casilla · '+S.date+'\n'+fmt(S.secs)+' · '+S.entries.length+' palabras · 13×13\n⬛⬛⬛⬛⬛';$('#winText').textContent='Tiempo: '+fmt(S.secs);$('#result').textContent=txt;$('#win').showModal()}
function fmt(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
async function share(){const text='La Casilla · '+S.date+'\n'+fmt(S.secs)+' · '+S.entries.length+' palabras · 13×13';try{if(navigator.share)await navigator.share({title:'La Casilla',text,url:location.href});else{await navigator.clipboard.writeText(text+'\n'+location.href);$('#msg').textContent='Resultado copiado.'}}catch{}}
function init(){S.date=day();const p=generate(S.date);S.grid=p.g;S.entries=p.entries;load();render();$('#date').textContent=new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date()).toUpperCase();$('#theme').textContent=THEMES[hash(S.date)%THEMES.length];$('#count').textContent=S.entries.length+' palabras';$('#clock').textContent=fmt(S.secs);const first=S.entries.find(e=>e.d==='A')||S.entries[0];selectEntry(first.id);if(!S.done)S.timer=setInterval(()=>{S.secs++;$('#clock').textContent=fmt(S.secs);if(S.secs%5===0)save();if(day()!==S.date)location.reload()},1000);$('#check').onclick=check;$('#reveal').onclick=reveal;$('#reset').onclick=reset;$('#shareTop').onclick=share;$('#shareWin').onclick=share}
document.addEventListener('DOMContentLoaded',init);
