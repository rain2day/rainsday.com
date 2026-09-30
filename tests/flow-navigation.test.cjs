// Dependency-free regression tests for the camera/DOM timeline adapter.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('journey.js', 'utf8');
function fn(name) {
  const start = source.indexOf(`  function ${name}(`);
  let level = 0, end = source.indexOf('{', start);
  const begin = end;
  do { const c = source[end++]; if (c === '{') level++; if (c === '}') level--; } while (level && end < source.length);
  return source.slice(start, end);
}
function setup(heights, viewport=900) {
  const spans = [120,160,810,140,160,140], total=spans.reduce((a,b)=>a+b);
  let physical=0, logical=0;
  const tops=heights.map(h=>{const t=physical; physical+=h;return t;});
  const ACTS=spans.map((span,index)=>{const start=logical/total;logical+=span;return {index,order:index,start,end:logical/total};});
  const ctx={innerHeight:viewport,scrollY:0,document:{documentElement:{scrollHeight:physical}},ACTS};
  ctx.clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  ctx.inverseLerp=(a,b,v)=>ctx.clamp((v-a)/Math.max(.000001,b-a),0,1);
  ctx.actLocalP=(i,t)=>ACTS[i].start+(ACTS[i].end-ACTS[i].start)*t;
  ctx.actElements=tops.map(top=>({getBoundingClientRect:()=>({top:top-ctx.scrollY})}));
  vm.createContext(ctx);vm.runInContext(fn('chapterStops')+'\n'+fn('progressAtScroll'),ctx);
  return ctx;
}
test('every chapter boundary follows DOM geometry after variable-height work',()=>{
  for(const workHeight of [2800,5400,8300]) {
    const c=setup([1080,1440,workHeight,1260,1440,1260]);
    const stops=c.chapterStops();
    for(let i=0;i<6;i++) {c.scrollY=stops[i];assert.ok(Math.abs(c.progressAtScroll()-c.ACTS[i].start)<1e-9);}
    c.scrollY=stops[6];assert.equal(c.progressAtScroll(),1);
  }
});
test('scroll mapping is monotonic and bounded in desktop and reading layouts',()=>{
 for(const sizes of [[1080,1440,6000,1260,1440,1260],[844,650,5500,700,800,650]]){
  const c=setup(sizes);let previous=-1;
  for(let y=0;y<=c.document.documentElement.scrollHeight-c.innerHeight;y+=17){c.scrollY=y;const p=c.progressAtScroll();assert.ok(p>=previous&&p>=0&&p<=1);previous=p;}
 }
});
test('project anchors and button targets are unique and complete',()=>{
 const html=fs.readFileSync('index.html','utf8');
 for(let i=1;i<=9;i++){const id=`project-${String(i).padStart(2,'0')}`;assert.equal(html.split(`id="${id}"`).length-1,1);assert.ok(html.includes(`aria-controls="${id}"`));}
 assert.equal((html.match(/data-orbit-card data-side/g)||[]).length,9);
});
test('work cards never use the previous fade/inert envelope',()=>{
 assert.equal(source.includes('function orbitEnvelope'),false);
 assert.ok(fn('updateActContent').includes('act.index === 2'));
 assert.ok(fn('scrollToProject').includes('scrollIntoView'));
 assert.ok(source.includes('matchMedia("(max-width: 760px),'));
});
test('neighboring chapters hand off continuously in both scroll directions',()=>{
 const c=setup([1080,1440,6000,1260,1440,1260]);
 let rect={top:2000,bottom:8000};
 const styles=Array.from({length:6},()=>({}));
 c.body={classList:{contains:()=>false}};
 c.actNodes=c.ACTS.map((act,i)=>({...act,el:{getBoundingClientRect:()=>rect,classList:{toggle(){}},inert:false},copy:{style:{setProperty:(k,v)=>styles[i][k]=Number.parseFloat(v)}}}));
 c.smoothstep=(a,b,v)=>{const t=c.inverseLerp(a,b,v);return t*t*(3-2*t);};
 c.updateFieldRules=()=>{};
 vm.runInContext(fn('updateActContent'),c);
 const sample=(act,edge,fractions)=>fractions.map(v=>{rect[edge]=v*c.innerHeight;c.updateActContent(c.actLocalP(act,.72));return styles[act]['--act-alpha'];});
 const entering=sample(1,'top',[.96,.85,.75,.65,.54]);
 assert.equal(entering[0],1);assert.equal(entering.at(-1),0);
 assert.ok(entering.slice(1,-1).every(v=>v>0&&v<1));
 assert.deepEqual(sample(1,'top',[.54,.65,.75,.85,.96]),[...entering].reverse());
 const leaving=sample(3,'bottom',[.46,.35,.25,.15,.04]);
 assert.equal(leaving[0],0);assert.equal(leaving.at(-1),1);
 assert.ok(leaving.slice(1,-1).every(v=>v>0&&v<1));
 assert.deepEqual(sample(3,'bottom',[.04,.15,.25,.35,.46]),[...leaving].reverse());
});
test('desktop to mobile resize preserves project 05 instead of the collection start',()=>{
 const c=setup([1080,1440,6000,1260,1440,1260]);let scrolled=-1;
 c.state={targetP:c.actLocalP(2,.5)};
 c.body={classList:{contains:()=>false}};c.compactViewport={matches:true};
 c.currentProjectIndex=4;
 c.getActiveAct=()=>c.ACTS[2];
 c.actNodes=c.ACTS.map((a,i)=>({el:{getBoundingClientRect:()=>({top:i===2?-2000:0,bottom:3000}),scrollIntoView:()=>{scrolled='section';}}}));
 c.orbitCards=Array.from({length:9},(_,i)=>({getBoundingClientRect:()=>({top:(i-4)*500+100}),scrollIntoView:()=>{scrolled=i;}}));
 c.document.querySelector=()=>null;c.setReadingLayout=()=>{};c.applyRenderSize=()=>{};
 c.window={innerHeight:c.innerHeight};
 vm.runInContext(fn('onResize'),c);c.onResize();assert.equal(scrolled,4);
});
test('mobile to desktop resize preserves the tracked project across reflow',()=>{
 const c=setup([844,650,5500,700,800,650]);let scrolled=-1;
 c.state={targetP:c.actLocalP(2,.5)};c.body={classList:{contains:()=>true}};c.compactViewport={matches:false};c.currentProjectIndex=4;
 c.getActiveAct=()=>c.ACTS[2];
 c.actNodes=c.ACTS.map((a,i)=>({el:{getBoundingClientRect:()=>({top:i===2?-2000:0,bottom:3000})}}));
 c.actElements=c.ACTS.map((a,i)=>({getBoundingClientRect:()=>({top:i<=2?-2000:5000})}));
 c.orbitCards=Array.from({length:9},(_,i)=>({getBoundingClientRect:()=>({top:(i-6)*500+100})}));
 c.setReadingLayout=()=>{};c.applyRenderSize=()=>{};c.window={innerHeight:c.innerHeight};c.scrollToProject=i=>{scrolled=i;};
 vm.runInContext(fn('onResize'),c);c.onResize();assert.equal(scrolled,4);
});
test('renderer fallback preserves project05 when preceding chapters reflow',()=>{
 const c=setup([1080,1440,6000,1260,1440,1260]);let scrolled=-1,reading=false;
 c.body={classList:{contains:()=>false,add(){}}};c.currentProjectIndex=4;c.canvas={hidden:false};
 c.actNodes=c.ACTS.map(()=>({el:{getBoundingClientRect:()=>({top:-2000,bottom:3000})}}));
 c.orbitCards=Array.from({length:9},(_,i)=>({scrollIntoView:()=>{scrolled=i;}}));
 c.setReadingLayout=v=>{reading=v;};c.updateOrbitCard=()=>{};c.document.querySelector=()=>null;
 vm.runInContext(fn('activateStatic'),c);c.activateStatic();
 assert.equal(scrolled,4);assert.equal(reading,true);assert.equal(c.canvas.hidden,true);
});
