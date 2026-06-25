// @ts-nocheck
// Eerste port: JS 1-op-1 overgezet vanuit de oude index.html.
// Types verfijnen we later, als we dit opsplitsen in losse modules.
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- custom cursor ---------- */
const cur=document.getElementById('cursor');
let cx=innerWidth/2,cy=innerHeight/2,tx=cx,ty=cy;
addEventListener('pointermove',e=>{ tx=e.clientX; ty=e.clientY; });
(function curLoop(){ cx+=(tx-cx)*.2; cy+=(ty-cy)*.2;
  cur.style.transform=`translate(${cx}px,${cy}px) translate(-50%,-50%)`; requestAnimationFrame(curLoop); })();
document.querySelectorAll('a,.card').forEach(el=>{
  el.addEventListener('mouseenter',()=>cur.classList.add('big'));
  el.addEventListener('mouseleave',()=>cur.classList.remove('big'));
});

/* ---------- scroll-reactive marquee ---------- */
const track=document.getElementById('track');
let pos=0,lastScroll=window.scrollY,vel=0;
addEventListener('scroll',()=>{ vel=window.scrollY-lastScroll; lastScroll=window.scrollY; },{passive:true});
/* ---------- ASCII title effect (aino-style) ---------- */
/* Renders the real heading as flickering ASCII characters that scramble
   near the cursor, then resolve into the crisp type. Re-scrambles on hover. */
class AsciiTitle{
  constructor(host,{color='10,10,10',cw=11,chh=16,resolveDelay=500,resolveSpan=1700}={}){
    this.host=host; this.color=color; this.cw=cw; this.chh=chh;
    this.resolveDelay=resolveDelay; this.resolveSpan=resolveSpan;
    this.pool='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@?!<>+=/\\:;·';
    this.ramp=' ··::!?/23NQ@@';
    this.cv=document.createElement('canvas');
    host.appendChild(this.cv);
    this.ctx=this.cv.getContext('2d');
    this.mx=-9e3; this.my=-9e3;
    this.state='idle';
    addEventListener('pointermove',e=>{
      const r=this.host.getBoundingClientRect();
      this.mx=e.clientX-r.left; this.my=e.clientY-r.top;
    });
    host.addEventListener('mouseenter',()=>{ if(this.state==='done') this.scramble(900); });
    host.addEventListener('click',()=>{ if(this.state==='done') this.scramble(900); });
    let rT; addEventListener('resize',()=>{ clearTimeout(rT); rT=setTimeout(()=>this.measure(),200); });
  }
  measure(){
    const host=this.host, r=host.getBoundingClientRect();
    this.W=this.cv.width=Math.max(2,Math.round(r.width));
    this.H=this.cv.height=Math.max(2,Math.round(r.height));
    // draw the real lines into an offscreen canvas at their exact positions
    const off=document.createElement('canvas'); off.width=this.W; off.height=this.H;
    const o=off.getContext('2d'); o.fillStyle='#000'; o.textBaseline='alphabetic';
    host.querySelectorAll('.aline').forEach(el=>{
      const er=el.getBoundingClientRect(), cs=getComputedStyle(el);
      o.font=`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      if('letterSpacing' in o) o.letterSpacing=cs.letterSpacing==='normal'?'0px':cs.letterSpacing;
      const x=er.left-r.left+parseFloat(cs.paddingLeft||0);
      const fs=parseFloat(cs.fontSize);
      const y=er.top-r.top+(er.height+fs*0.72)/2; // optical baseline
      o.fillText(el.textContent,x,y);
    });
    // sample coverage per cell
    const img=o.getImageData(0,0,this.W,this.H).data;
    this.cols=Math.ceil(this.W/this.cw); this.rows=Math.ceil(this.H/this.chh);
    this.cells=[];
    for(let gy=0;gy<this.rows;gy++)for(let gx=0;gx<this.cols;gx++){
      let hit=0,n=0;
      for(let sy=1;sy<this.chh;sy+=3)for(let sx=1;sx<this.cw;sx+=3){
        const px=gx*this.cw+sx, py=gy*this.chh+sy;
        if(px<this.W&&py<this.H){ n++; if(img[(py*this.W+px)*4+3]>40) hit++; }
      }
      const cov=n?hit/n:0;
      if(cov>0.07) this.cells.push({
        x:gx*this.cw, y:gy*this.chh, cov,
        ch:this.pool[Math.random()*this.pool.length|0],
        flip:0, lockAt:0
      });
    }
  }
  start(){
    this.measure();
    this.host.classList.add('masked');
    this.cv.style.opacity=1;
    this.scramble(this.resolveSpan,this.resolveDelay);
    if(!this.raf) this.loop();
  }
  scramble(span=900,delay=0){
    const t=performance.now();
    this.state='ascii';
    this.host.classList.add('masked');
    this.cv.style.transition='none'; this.cv.style.opacity=1;
    for(const c of this.cells) c.lockAt=t+delay+Math.random()*span;
    this.fadeAt=t+delay+span+250;
  }
  loop(){
    this.raf=requestAnimationFrame(()=>this.loop());
    if(this.state!=='ascii') return;
    const t=performance.now(), ctx=this.ctx;
    ctx.clearRect(0,0,this.W,this.H);
    ctx.font=`700 ${Math.round(this.chh*0.82)}px "Space Mono",monospace`;
    ctx.textBaseline='top';
    let allLocked=true;
    for(const c of this.cells){
      const dx=c.x-this.mx, dy=c.y-this.my;
      const near=(dx*dx+dy*dy)<120*120;
      const locked=t>c.lockAt&&!near;
      if(!locked){
        allLocked=false;
        if(t>c.flip){ c.ch=this.pool[Math.random()*this.pool.length|0];
          c.flip=t+(near?40:90)+Math.random()*90; }
        ctx.fillStyle=`rgba(${this.color},${0.55+c.cov*0.45})`;
        ctx.fillText(c.ch,c.x,c.y);
      }else{
        const rc=this.ramp[Math.min(this.ramp.length-1,Math.round(c.cov*(this.ramp.length-1)))];
        ctx.fillStyle=`rgba(${this.color},${0.35+c.cov*0.65})`;
        ctx.fillText(rc,c.x,c.y);
      }
    }
    if(allLocked&&t>this.fadeAt){
      this.state='done';
      this.cv.style.transition='opacity .55s ease';
      this.cv.style.opacity=0;
      this.host.classList.remove('masked');
    }
  }
}

if(!reduce){
  const boot=()=>{
    const hero=new AsciiTitle(document.getElementById('heroHost'),
      {color:'10,10,10',cw:7,chh:10,resolveDelay:600,resolveSpan:1900});
    hero.measure();
    hero.host.classList.add('masked');
    window.__hero=hero;
    if(window.__revealStarted) hero.start();
    const cta=new AsciiTitle(document.getElementById('ctaHost'),
      {color:'57,181,74',cw:7,chh:10,resolveDelay:400,resolveSpan:1600});
    cta.measure();
    // CTA starts its scramble when it scrolls into view
    new IntersectionObserver((es,obs)=>{ es.forEach(e=>{ if(e.isIntersecting){ cta.start(); obs.disconnect(); } }); },
      {threshold:.35}).observe(document.getElementById('ctaHost'));
  };
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(boot); else addEventListener('load',boot);
}

/* ---------- inline ASCII scramble for links & work titles ---------- */
function scrambleText(el,duration=550){
  if(el._busy) return; el._busy=true;
  const orig=el.dataset.txt||(el.dataset.txt=el.textContent);
  const pool='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@?!<>+=/';
  const start=performance.now();
  (function tick(){
    const t=(performance.now()-start)/duration;
    if(t>=1||reduce){ el.textContent=orig; el._busy=false; return; }
    let out='';
    for(let i=0;i<orig.length;i++){
      const lockAt=((i+1)/orig.length)*0.85;
      const ch=orig[i];
      out+=(ch===' '||ch==='·')?ch:(t>lockAt?ch:pool[Math.random()*pool.length|0]);
    }
    el.textContent=out;
    requestAnimationFrame(tick);
  })();
}
// nav + footer links scramble on hover
document.querySelectorAll('header nav a, footer .row a').forEach(el=>{
  el.addEventListener('mouseenter',()=>scrambleText(el,450));
});
// work cards: title + roles scramble when you enter the card
document.querySelectorAll('.card').forEach(card=>{
  const ttl=card.querySelector('.ttl'), roles=card.querySelector('.roles');
  card.addEventListener('mouseenter',()=>{ scrambleText(ttl,650); if(roles) scrambleText(roles,650); });
});
/* ============================================================
   SOUND ENGINE — synthesized placeholders.
   Swap any of these for your own samples later: load a buffer
   with fetch+decodeAudioData and play it inside the same gates.
   ============================================================ */
const Snd={
  ctx:null,master:null,muted:true,_noise:null,
  init(){
    if(this.ctx){ this.ctx.resume(); return; }
    this.ctx=new (window.AudioContext||window.webkitAudioContext)();
    this.master=this.ctx.createGain();
    this.master.gain.value=0;
    this.master.connect(this.ctx.destination);
    // shared noise buffer (1s white noise)
    const b=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate);
    const d=b.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    this._noise=b;
    this.ctx.resume();
  },
  setMuted(m){
    this.muted=m;
    if(this.ctx) this.master.gain.linearRampToValueAtTime(m?0:0.9,this.ctx.currentTime+0.15);
    const t=document.getElementById('sndToggle');
    t.classList.toggle('off',m);
    document.getElementById('sndLbl').textContent=m?'Sound off':'Sound on';
  },
  // tiny percussive tick (hover / ratchet / column drops)
  tick(f=1800,g=0.05,dur=0.05){
    if(!this.ctx||this.muted) return;
    const t=this.ctx.currentTime, o=this.ctx.createOscillator(), gn=this.ctx.createGain();
    o.type='triangle'; o.frequency.setValueAtTime(f,t);
    o.frequency.exponentialRampToValueAtTime(Math.max(80,f*0.6),t+dur);
    gn.gain.setValueAtTime(g,t); gn.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(gn); gn.connect(this.master); o.start(t); o.stop(t+dur+0.02);
  },
  // soft low blip (clicks)
  blip(f=300,g=0.1,dur=0.16){
    if(!this.ctx||this.muted) return;
    const t=this.ctx.currentTime, o=this.ctx.createOscillator(), gn=this.ctx.createGain();
    o.type='sine'; o.frequency.setValueAtTime(f,t);
    o.frequency.exponentialRampToValueAtTime(f*0.5,t+dur);
    gn.gain.setValueAtTime(0.0001,t); gn.gain.exponentialRampToValueAtTime(g,t+0.012);
    gn.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(gn); gn.connect(this.master); o.start(t); o.stop(t+dur+0.02);
  },
  // rising filtered-noise sweep (intro riser)
  sweep(dur=2.4){
    if(!this.ctx||this.muted) return;
    const t=this.ctx.currentTime, s=this.ctx.createBufferSource(),
          f=this.ctx.createBiquadFilter(), gn=this.ctx.createGain();
    s.buffer=this._noise; s.loop=true;
    f.type='bandpass'; f.Q.value=1.1;
    f.frequency.setValueAtTime(180,t);
    f.frequency.exponentialRampToValueAtTime(5200,t+dur);
    gn.gain.setValueAtTime(0.0001,t);
    gn.gain.exponentialRampToValueAtTime(0.14,t+dur*0.7);
    gn.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    s.connect(f); f.connect(gn); gn.connect(this.master);
    s.start(t); s.stop(t+dur+0.05);
  }
};

/* sound toggle (bottom-left) */
const sndToggle=document.getElementById('sndToggle');
sndToggle.addEventListener('click',()=>{ Snd.init(); Snd.setMuted(!Snd.muted); });

/* ============================================================
   INTRO — matrix ASCII rain, then columns slide down to reveal
   ============================================================ */
(function(){
  const intro=document.getElementById('intro'),
        entry=document.getElementById('entry'),
        rcv=document.getElementById('rain'),
        rx=rcv.getContext('2d'),
        POOL='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@?!<>+=/\\:;·*';
  const CW=14, CH=17;
  let W,H,cols=[],phase='idle',raf;

  function size(){
    W=rcv.width=innerWidth; H=rcv.height=innerHeight;
    const n=Math.ceil(W/CW);
    cols=[];
    for(let i=0;i<n;i++) cols.push({
      x:i*CW,
      head:Math.random()*H,
      sp:2.6+Math.random()*4.4,
      delay:0, p:0, ticked:false
    });
  }
  size(); addEventListener('resize',()=>{ if(phase!=='done') size(); });

  function easeIn(t){ return t*t*t; }

  let revealT0=0;
  function frame(){
    raf=requestAnimationFrame(frame);
    rx.font=`700 ${CH-3}px "Space Mono",monospace`;
    rx.textBaseline='top';

    if(phase==='idle'||phase==='arming'){
      // classic rain: translucent black wash leaves trails
      rx.fillStyle='rgba(10,10,10,0.16)'; rx.fillRect(0,0,W,H);
      for(const c of cols){
        rx.fillStyle = Math.random()<0.12 ? '#F9FAFB' : 'rgba(249,250,251,0.55)';
        rx.fillText(POOL[Math.random()*POOL.length|0], c.x, c.head);
        c.head+=c.sp*(phase==='arming'?2.2:1);
        if(c.head>H){ c.head=-CH; c.sp=2.6+Math.random()*4.4; }
      }
    }
    else if(phase==='reveal'){
      const t=(performance.now()-revealT0)/1000;
      rx.clearRect(0,0,W,H);
      let done=true;
      for(const c of cols){
        const lt=Math.max(0,t-c.delay);
        c.p=Math.min(1,lt/0.85);
        if(c.p<1) done=false;
        if(c.p>0&&!c.ticked){ c.ticked=true;
          if((c.x/CW)%3===0) Snd.tick(500+Math.random()*900,0.035,0.06); }
        const oy=easeIn(c.p)*H;             // cover slides down
        if(oy<H){
          rx.fillStyle='#0A0A0A';
          rx.fillRect(c.x,oy,CW,H-oy);
          // raining chars inside the falling cover
          rx.fillStyle = Math.random()<0.1 ? '#F9FAFB' : 'rgba(249,250,251,0.5)';
          const hy=oy+((c.head+performance.now()*0.001*c.sp*60)%(H-oy||1));
          rx.fillText(POOL[Math.random()*POOL.length|0], c.x, hy);
        }
      }
      if(done){
        phase='done';
        cancelAnimationFrame(raf);
        intro.classList.add('gone');
        sndToggle.classList.add('show');
        document.querySelectorAll('header .logo, .work .h span, .work .h b').forEach((el,i)=>{
          setTimeout(()=>scrambleText(el,600),120+i*150);
        });
      }
    }
  }
  frame();

  function begin(withSound){
    Snd.init();
    Snd.setMuted(!withSound);
    if(withSound){ Snd.blip(420,0.09); Snd.sweep(2.2); }
    entry.classList.add('hide');
    phase='arming';                          // rain speeds up briefly
    const arm = reduce ? 0 : 900;
    setTimeout(()=>{
      // stagger: wave across the screen + jitter
      cols.forEach(c=>{ c.delay=(c.x/W)*0.45+Math.random()*0.3; c.ticked=false; });
      revealT0=performance.now();
      phase='reveal';
      window.__revealStarted=true;
      if(window.__hero) window.__hero.start();
    }, arm);
  }
  document.getElementById('enterSnd').addEventListener('click',()=>begin(true));
  document.getElementById('enterMute').addEventListener('click',()=>begin(false));
})();

/* ============================================================
   UI SOUNDS — hover ticks, click blips, mouse-move ratchet
   ============================================================ */
// hover ticks on links, buttons and work cards
document.querySelectorAll('a, button, .card').forEach(el=>{
  el.addEventListener('mouseenter',()=>Snd.tick(2100+Math.random()*500,0.04,0.04));
});
// click blip
addEventListener('pointerdown',()=>Snd.blip(260,0.08,0.14));
// ratchet: a tick every N px of cursor travel, rate-limited
(function(){
  let lx=null,ly=null,acc=0,last=0;
  addEventListener('pointermove',e=>{
    if(lx!==null){ acc+=Math.hypot(e.clientX-lx,e.clientY-ly); }
    lx=e.clientX; ly=e.clientY;
    const now=performance.now();
    if(acc>26&&now-last>30){
      acc=0; last=now;
      Snd.tick(1300+Math.random()*800,0.016,0.03);
    }
  });
})();
