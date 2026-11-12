(function(){
const C=window.MODIS_COLS,idx={};C.forEach((c,i)=>idx[c]=i);
const DAY=86400000,Y0=Date.UTC(2002,0,1);
const doy=s=>Math.round((Date.parse(s)-Y0)/DAY)+1;
const dateOf=d=>new Date(Y0+(d-1)*DAY);
const fmtD=d=>dateOf(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});
const ALL=window.MODIS_ROWS.map(r=>({lat:r[0],lon:r[1],br:r[2],date:r[3],doy:doy(r[3]),hr:(Math.floor(r[4]/100)+5)%24,sat:r[5],conf:r[6],t31:r[7],frp:r[8],dn:r[9]}));
const $=id=>document.getElementById(id);
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const S={from:1,to:365,conf:0,terra:true,aqua:true,dn:'',win:14,reg:true};
const charts={};
let data=[];

// ---------- stats helpers
const sum=a=>a.reduce((x,y)=>x+y,0),mean=a=>a.length?sum(a)/a.length:NaN;
const q=(a,p)=>{if(!a.length)return NaN;const s=[...a].sort((x,y)=>x-y),i=(s.length-1)*p,l=Math.floor(i);return s[l]+(s[Math.min(l+1,s.length-1)]-s[l])*(i-l)};
const sd=a=>{if(a.length<2)return NaN;const m=mean(a);return Math.sqrt(sum(a.map(x=>(x-m)**2))/(a.length-1))};
const corr=(x,y)=>{const mx=mean(x),my=mean(y);let n=0,a=0,b=0;for(let i=0;i<x.length;i++){n+=(x[i]-mx)*(y[i]-my);a+=(x[i]-mx)**2;b+=(y[i]-my)**2}return n/Math.sqrt(a*b)};
const fx=(v,d=1)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d}):'–';
const fi=v=>v.toLocaleString('en-US');

function filter(){
  data=ALL.filter(r=>r.doy>=S.from&&r.doy<=S.to&&r.conf>=S.conf&&((r.sat==='Terra'&&S.terra)||(r.sat==='Aqua'&&S.aqua))&&(!S.dn||r.dn===S.dn));
}
function opts(extra={}){
  const ink=css('--mut'),grid=css('--grid');
  const o={responsive:true,maintainAspectRatio:false,animation:{duration:250},
    plugins:{legend:{labels:{color:ink,boxWidth:12}}},
    scales:{x:{ticks:{color:ink},grid:{color:grid}},y:{ticks:{color:ink},grid:{color:grid},beginAtZero:true}}};
  return merge(o,extra);
}
function merge(a,b){for(const k in b){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])){a[k]=merge(a[k]&&typeof a[k]==='object'?a[k]:{},b[k])}else a[k]=b[k]}return a}
function draw(id,cfg){
  if(charts[id]){const c=charts[id];c.data=cfg.data;c.options=cfg.options;c.update();return c}
  return charts[id]=new Chart($(id),cfg);
}
const pal=()=>[css('--a'),css('--b'),css('--c'),css('--d')];

// ---------- renderers
function kpis(){
  const f=data.map(r=>r.frp),days=new Set(data.map(r=>r.doy)).size;
  const per={};data.forEach(r=>per[r.doy]=(per[r.doy]||0)+1);
  let pk=null;for(const d in per)if(!pk||per[d]>per[pk])pk=d;
  const hi=data.filter(r=>r.conf>=80).length;
  const items=[['Detections',fi(data.length)],['Active days',fi(days)],['Mean FRP',fx(mean(f))+' MW'],['Max FRP',fx(Math.max(...f,0))+' MW'],
    ['Peak day',pk?fmtD(+pk)+' ('+per[pk]+')':'–'],['High confidence (≥80%)',data.length?fx(hi/data.length*100,0)+'%':'–']];
  $('kpis').innerHTML=items.map(i=>`<div class="kpi"><div class="v">${i[1]}</div><div class="l">${i[0]}</div></div>`).join('');
}
function daily(){
  const n=S.to-S.from+1,cnt=new Array(n).fill(0);
  data.forEach(r=>cnt[r.doy-S.from]++);
  const w=S.win,ma=cnt.map((_,i)=>{const h=Math.floor(w/2),a=Math.max(0,i-h),b=Math.min(n-1,i+(w-1-h));return mean(cnt.slice(a,b+1))});
  const x=cnt.map((_,i)=>i),mx=mean(x),my=mean(cnt);
  let sl=0,den=0;x.forEach((v,i)=>{sl+=(v-mx)*(cnt[i]-my);den+=(v-mx)**2});sl=den?sl/den:0;const ic=my-sl*mx;
  const labels=cnt.map((_,i)=>fmtD(S.from+i)),[a,b,c]=pal();
  const ds=[{type:'bar',label:'Daily detections',data:cnt,backgroundColor:a+'88',borderWidth:0,order:3},
    {type:'line',label:`${w}-day moving average`,data:ma.map(v=>+v.toFixed(2)),borderColor:b,backgroundColor:b,pointRadius:0,borderWidth:2.5,tension:.3,order:1}];
  if(S.reg&&n>2)ds.push({type:'line',label:'Linear trend',data:x.map(v=>+(ic+sl*v).toFixed(2)),borderColor:c,borderDash:[6,4],pointRadius:0,borderWidth:2,order:2});
  draw('cDaily',{data:{labels,datasets:ds},options:opts({interaction:{mode:'index',intersect:false},scales:{x:{ticks:{maxTicksLimit:12,autoSkip:true}}}})});
  $('trendNote').textContent=n>2?`trend: ${sl>=0?'+':''}${fx(sl*30,2)} detections/day per month`:'';
}
function monthly(){
  const cnt=new Array(12).fill(0),fr=new Array(12).fill(0);data.forEach(r=>{const m=dateOf(r.doy).getUTCMonth();cnt[m]++;fr[m]+=r.frp});
  const [a,b]=pal(),sel=MON.map((_,m)=>{const s=Date.UTC(2002,m,1),e=Date.UTC(2002,m+1,0);return S.from<=(e-Y0)/DAY+1&&S.to>=(s-Y0)/DAY+1});
  draw('cMonth',{type:'bar',data:{labels:MON,datasets:[{label:'Detections',data:cnt,backgroundColor:sel.map(s=>s?a:a+'44')}]},
    options:opts({plugins:{legend:{display:false}},onClick:(e,els)=>{if(!els.length)return;const m=els[0].index;S.from=(Date.UTC(2002,m,1)-Y0)/DAY+1;S.to=(Date.UTC(2002,m+1,0)-Y0)/DAY+1;syncUI();update()}})});
  draw('cFrpMonth',{type:'line',data:{labels:MON,datasets:[{label:'Mean FRP',data:fr.map((v,i)=>cnt[i]?+(v/cnt[i]).toFixed(2):null),borderColor:b,backgroundColor:b+'44',fill:true,tension:.3,pointRadius:4}]},options:opts({plugins:{legend:{display:false}}})});
}
function donuts(){
  const p=pal(),leg={position:'bottom',labels:{color:css('--mut'),boxWidth:12}};
  const d=['D','N'].map(k=>data.filter(r=>r.dn===k).length),s=['Terra','Aqua'].map(k=>data.filter(r=>r.sat===k).length);
  draw('cDN',{type:'doughnut',data:{labels:['Day','Night'],datasets:[{data:d,backgroundColor:[p[0],p[1]],borderColor:css('--card')}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:leg}}});
  draw('cSat',{type:'doughnut',data:{labels:['Terra','Aqua'],datasets:[{data:s,backgroundColor:[p[2],p[3]],borderColor:css('--card')}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:leg}}});
}
function hist(vals,edges){const c=new Array(edges.length-1).fill(0);vals.forEach(v=>{for(let i=0;i<c.length;i++)if(v>=edges[i]&&(v<edges[i+1]||i===c.length-1)){c[i]++;break}});return c}
function hists(){
  const [a,b,c]=pal();
  const ce=[0,10,20,30,40,50,60,70,80,90,101];
  draw('cConf',{type:'bar',data:{labels:ce.slice(0,-1).map(v=>v+'–'+(v+9)),datasets:[{label:'Detections',data:hist(data.map(r=>r.conf),ce),backgroundColor:b}]},options:opts({plugins:{legend:{display:false}}})});
  const fe=[0,5,10,15,20,30,50,100,200,1e9],fl=['<5','5–10','10–15','15–20','20–30','30–50','50–100','100–200','200+'];
  draw('cFrp',{type:'bar',data:{labels:fl,datasets:[{label:'Detections',data:hist(data.map(r=>r.frp),fe),backgroundColor:a}]},options:opts({plugins:{legend:{display:false}}})});
  const h=new Array(24).fill(0);data.forEach(r=>h[r.hr]++);
  draw('cHour',{type:'bar',data:{labels:h.map((_,i)=>i+':00'),datasets:[{label:'Detections',data:h,backgroundColor:c}]},options:opts({plugins:{legend:{display:false}},scales:{x:{ticks:{maxTicksLimit:12}}}})});
}
function lat(){
  const lo=23,hi=38,step=1,n=hi-lo,cnt=new Array(n).fill(0);
  data.forEach(r=>{const i=Math.floor(r.lat-lo);if(i>=0&&i<n)cnt[i]++});
  const labels=cnt.map((_,i)=>(lo+i)+'–'+(lo+i+1)+'°N');
  draw('cLat',{type:'bar',data:{labels:labels.slice().reverse(),datasets:[{label:'Detections',data:cnt.slice().reverse(),backgroundColor:pal()[2]}]},options:opts({indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true},y:{beginAtZero:false}}})});
}
function ramp(t){ // yellow -> red -> dark red
  t=Math.max(0,Math.min(1,t));const r=Math.round(255-60*t),g=Math.round(220-200*t),b=Math.round(60-30*t);return `rgba(${r},${g},${b},.75)`}
function map(){
  const pts=data.map(r=>({x:r.lon,y:r.lat,frp:r.frp,d:fmtD(r.doy),s:r.sat}));
  const cols=data.map(r=>ramp(Math.log10(Math.max(r.frp,1))/2));
  draw('cMap',{type:'scatter',data:{datasets:[{label:'Fire detection',data:pts,pointBackgroundColor:cols,pointBorderWidth:0,pointRadius:3,pointHoverRadius:6}]},
    options:opts({plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.raw.d} · ${c.raw.s} · FRP ${c.raw.frp} MW · (${c.raw.y.toFixed(2)}°N, ${c.raw.x.toFixed(2)}°E)`}}},
      scales:{x:{min:60,max:78,beginAtZero:false,title:{display:true,text:'Longitude °E',color:css('--mut')}},y:{min:23,max:38,beginAtZero:false,title:{display:true,text:'Latitude °N',color:css('--mut')}}}})});
}
function bf(){
  const r=corr(data.map(d=>d.br),data.map(d=>d.frp));
  $('corrNote').textContent=data.length>2?`Pearson r = ${fx(r,3)}`:'';
  draw('cBF',{type:'scatter',data:{datasets:[{label:'Detection',data:data.map(d=>({x:d.br,y:d.frp})),backgroundColor:pal()[3]+'99',pointRadius:2.5}]},
    options:opts({plugins:{legend:{display:false}},scales:{x:{beginAtZero:false,title:{display:true,text:'Brightness (K)',color:css('--mut')}},y:{type:'logarithmic',beginAtZero:false,title:{display:true,text:'FRP (MW, log scale)',color:css('--mut')}}}})});
}
function table(){
  const cols=[['Brightness (K)','br'],['T31 (K)','t31'],['FRP (MW)','frp'],['Confidence (%)','conf']];
  const rows=[['Mean',a=>mean(a)],['Median',a=>q(a,.5)],['Std dev',sd],['Min',a=>Math.min(...a)],['Q1',a=>q(a,.25)],['Q3',a=>q(a,.75)],['Max',a=>Math.max(...a)]];
  let h='<tr><th></th>'+cols.map(c=>`<th>${c[0]}</th>`).join('')+'</tr>';
  rows.forEach(r=>h+=`<tr><td>${r[0]}</td>`+cols.map(c=>{const a=data.map(d=>d[c[1]]);return `<td>${a.length?fx(r[1](a),1):'–'}</td>`}).join('')+'</tr>');
  $('stats').innerHTML=h;
}
function update(){filter();$('confLabel').textContent=S.conf;
  $('rangeLabel').textContent=`${fmtD(S.from)} – ${fmtD(S.to)}`;$('winLabel').textContent=S.win+(S.win===1?' day (raw)':' days');
  kpis();daily();monthly();donuts();hists();lat();map();bf();table();}
function syncUI(){$('dFrom').value=S.from;$('dTo').value=S.to}

// ---------- wiring
$('dFrom').oninput=e=>{S.from=Math.min(+e.target.value,S.to);syncUI();update()};
$('dTo').oninput=e=>{S.to=Math.max(+e.target.value,S.from);syncUI();update()};
$('conf').oninput=e=>{S.conf=+e.target.value;update()};
$('sTerra').onchange=e=>{S.terra=e.target.checked;update()};
$('sAqua').onchange=e=>{S.aqua=e.target.checked;update()};
$('dn').onchange=e=>{S.dn=e.target.value;update()};
$('win').oninput=e=>{S.win=+e.target.value;$('winLabel').textContent=S.win+' days';filter();daily()};
$('reg').onchange=e=>{S.reg=e.target.checked;filter();daily()};
$('reset').onclick=()=>{Object.assign(S,{from:1,to:365,conf:0,terra:true,aqua:true,dn:'',win:14,reg:true});
  $('conf').value=0;$('sTerra').checked=$('sAqua').checked=$('reg').checked=true;$('dn').value='';$('win').value=14;syncUI();update()};
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{Object.keys(charts).forEach(k=>{charts[k].destroy();delete charts[k]});update()});
update();
})();
