(function(){
var RAW={};
var DEFS={brand:'PuncakGoVillas',tagline:'Pilih tanggal, jumlah orang, dan budget kamu. Kami tampilkan villa yang masih kosong.',wa:'',priceMode:'total',showOver:true,overPct:20};
var D=null,REV=0;
var BASE=null;
function setData(raw){raw=raw||{};REV=raw.rev||0;BASE=JSON.parse(JSON.stringify(raw));var extra={};Object.keys(raw).forEach(function(k){if(['rev','savedAt','settings','villas','booked','highSeason','synced','syncInfo'].indexOf(k)<0)extra[k]=raw[k]});
  D=Object.assign(extra,{settings:Object.assign({},DEFS,raw.settings||{}),villas:raw.villas||[],booked:raw.booked||{},highSeason:raw.highSeason||[],synced:raw.synced||{},syncInfo:raw.syncInfo||null})}
var TOK='',USER=null;try{TOK=localStorage.getItem('pgvTok')||'';localStorage.removeItem('pgvKey')}catch(e){}
function setTok(t){TOK=t||'';try{if(TOK)localStorage.setItem('pgvTok',TOK);else localStorage.removeItem('pgvTok')}catch(e){}}
function isOwner(){return USER&&USER.role==='owner'}
function canOwner(){return !!(USER&&(USER.role==='owner'||USER.canSeeOwner||USER.role==='mitra'))}
var PRIV={},PRIV_DIRTY={};
function loadPriv(){if(!canOwner()){PRIV={};return Promise.resolve()}return api('GET','/api/private').then(function(r){PRIV=r.villas||{}}).catch(function(){PRIV={}})}
function waOwner(ph){var n=String(ph||'').replace(/\D/g,'');if(n.charAt(0)==='0')n='62'+n.slice(1);else if(n.charAt(0)==='8')n='62'+n;return 'https://wa.me/'+n}
function isMitra(){return USER&&USER.role==='mitra'}
function myVillas(){return isMitra()?D.villas.filter(function(v){return v.ownerAcc===USER.id}):D.villas}
var ACCS=[];
function loadAccs(){if(!isOwner()){ACCS=[];return Promise.resolve()}return api('GET','/api/admins').then(function(r){ACCS=r.admins||[]}).catch(function(){ACCS=[]})}
function accName(id){var a=ACCS.find(function(x){return x.id===id});return a?a.name:''}
var DUPS={};
function loadDups(){if(!isMitra()){DUPS={};return Promise.resolve()}return api('GET','/api/dupes').then(function(r){DUPS={};(r.villas||[]).forEach(function(x){DUPS[x.id]=x})}).catch(function(){})}
function pendingCount(){return D.villas.filter(function(v){return v.status==='pending'}).length}
function statusBadge(v){if(v.status==='pending'){var d=DUPS[v.id];return '<span class="badge pend">Menunggu verifikasi</span>'+(isMitra()&&d&&d.possibleDup?'<span class="badge rej">Kemungkinan sudah terdaftar</span>':'')}if(v.status==='rejected')return '<span class="badge rej">Ditolak</span>';return ''}
function startAdmin(u){USER=u;PRIV_DIRTY={};if(isMitra()&&['villa','cal'].indexOf(A.tab)<0)A.tab='villa';Promise.all([loadPriv(),loadAccs(),loadDups()]).then(renderAdmin)}
function api(method,url,body,isFile){var h={};if(TOK)h['authorization']='Bearer '+TOK;if(body&&!isFile)h['content-type']='application/json';if(isFile)h['content-type']=body.type||'image/jpeg';
  return fetch(url,{method:method,headers:h,body:body?(isFile?body:JSON.stringify(body)):undefined,cache:'no-store'}).then(function(r){return r.json().catch(function(){return{}}).then(function(j){if(!r.ok){var e=new Error(j.error||('HTTP '+r.status));e.status=r.status;e.body=j;throw e}return j})})}
var dirty=false;
var app=document.getElementById('app');
function imgSrc(p){return (typeof p==='string'&&(p.charAt(0)==='/'||/^https?:/.test(p)))?p:''}
function goodPhotos(v){return (v.photos||[]).filter(function(p){return !!imgSrc(p)})}
var LOGO='/img/logo.png',BG='/img/bg-villa.jpg',OFFICE='/img/kantor.jpg';
function uploadBlob(blob){return api('POST','/api/photo',blob,true).then(function(r){return r.url})}
var FAC=['Kolam renang','Karaoke','Billiard','Ping pong','BBQ','Wi-Fi','Air panas','Dapur lengkap','Parkir luas','View gunung','Taman','Smart TV','Gazebo','Api unggun'];

function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function rp(n){return 'Rp '+Math.round(n||0).toLocaleString('id-ID')}
function num(s){return parseInt(String(s==null?'':s).replace(/\D/g,''),10)||0}
function uid(){return Math.random().toString(36).slice(2,9)}
function toUTC(ds){var a=ds.split('-').map(Number);return Date.UTC(a[0],a[1]-1,a[2])}
function toDS(t){return new Date(t).toISOString().slice(0,10)}
function addDays(ds,n){return toDS(toUTC(ds)+n*864e5)}
function todayDS(){var n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0')}
function dow(ds){return new Date(toUTC(ds)).getUTCDay()}
function fmtD(ds,o){return new Date(toUTC(ds)).toLocaleDateString('id-ID',Object.assign({day:'numeric',month:'short',year:'numeric',timeZone:'UTC'},o||{}))}
function nights(ci,co){var a=[],d=ci,g=0;while(d<co&&g<400){a.push(d);d=addDays(d,1);g++}return a}
function isHigh(ds){return D.highSeason.some(function(r){return ds>=r.start&&ds<=r.end})}
function isWeekend(ds){var w=dow(ds);return w===5||w===6}
function rate(v,ds){
  if(isHigh(ds)&&v.priceHigh)return{p:v.priceHigh,t:'high'};
  if(isWeekend(ds)&&v.priceWeekend)return{p:v.priceWeekend,t:'weekend'};
  return{p:v.priceWeekday||v.priceWeekend||0,t:'weekday'};
}
function quote(v,ns){var t=0,c={weekday:0,weekend:0,high:0};ns.forEach(function(d){var r=rate(v,d);t+=r.p;c[r.t]++});return{total:t,c:c,avg:ns.length?t/ns.length:0}}
function minRate(v){var a=[v.priceWeekday,v.priceWeekend,v.priceHigh].filter(function(x){return x>0});return a.length?Math.min.apply(null,a):0}
function isFree(v,ns){var s={};(D.booked[v.id]||[]).forEach(function(d){s[d]=1});return ns.every(function(d){return !s[d]})}
function waNum(){var n=(D.settings.wa||'').replace(/\D/g,'');if(n.charAt(0)==='0')n='62'+n.slice(1);else if(n.charAt(0)==='8')n='62'+n;return n}
function waLink(text){return 'https://wa.me/'+waNum()+'?text='+encodeURIComponent(text)}
function toast(m,ms){var t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(function(){t.remove()},ms||2600)}
function fmtTime(iso){if(!iso)return '';var d=new Date(iso);return d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})+' '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}
function capOf(v){return v.capMax||v.capStd||0}

/* ================= GUEST ================= */
var G={ci:'',co:'',g:'',bmin:'',bmax:'',bmode:'night',searched:false};
function renderGuest(){
  var s=D.settings,t=todayDS();
  app.innerHTML=
   (dirty?'<div class="draftbar">Ini preview. Perubahan belum disimpan. <a href="/admin">Balik ke admin</a></div>':'')+
   '<header class="hero" style="background-image:linear-gradient(180deg,rgba(12,34,22,.78) 0%,rgba(12,34,22,.55) 45%,rgba(16,44,28,.75) 100%),url(&quot;'+BG+'&quot;)"><div class="wrap"><div class="logo"><img src="'+LOGO+'" alt="'+esc(s.brand)+'"></div><h1>Cari villa yang kosong<br>di tanggal kamu</h1><p>'+esc(s.tagline)+'</p></div></header>'+
   '<main class="wrap"><form id="sf" class="search" novalidate>'+
     '<label>Check-in<input type="date" name="ci" min="'+t+'" value="'+esc(G.ci)+'"></label>'+
     '<label>Check-out<input type="date" name="co" min="'+(G.ci?addDays(G.ci,1):addDays(t,1))+'" value="'+esc(G.co)+'"></label>'+
     '<label>Jumlah orang<div class="stepper"><button type="button" data-step="-1" aria-label="Kurangi">−</button><input name="g" inputmode="numeric" placeholder="0" value="'+esc(G.g)+'"><button type="button" data-step="1" aria-label="Tambah">+</button></div></label>'+
     '<label class="budget"><span>Range budget <span class="opt">(opsional, boleh isi salah satu)</span></span><div class="bud"><span>Rp</span><input name="bmin" inputmode="numeric" placeholder="2.000.000" aria-label="Budget dari" value="'+esc(G.bmin)+'"><em class="dash">–</em><input name="bmax" inputmode="numeric" placeholder="5.000.000" aria-label="Budget sampai" value="'+esc(G.bmax)+'"><select name="bmode"><option value="night"'+(G.bmode==='night'?' selected':'')+'>per malam</option><option value="total"'+(G.bmode==='total'?' selected':'')+'>total</option></select></div></label>'+
     '<button class="btn primary big" type="submit">Cari Villa</button>'+
   '</form><section id="res"></section></main>'+
   '<section class="wrap office"><div class="oc"><img src="'+OFFICE+'" alt="Kantor PuncakGoVillas" loading="lazy"><div class="ot"><span class="k">Kantor kami</span><h2>Bukan cuma online</h2><p>PuncakGoVillas punya kantor sendiri di Puncak, Komplek Bukit Danau Villa Brajamusti. Selain sewa villa, kami juga bisa bantu kebutuhan liburan kamu.</p><div class="chips"><span>Sewa villa</span><span>Catering</span><span>Sewa extra bed</span><span>Obat kolam</span><span>Travel agent</span><span>Travel umroh</span><span>Sewa mobil</span><span>Organ tunggal</span><span>Private DJ</span><span>Balon floaties</span><span>Kambing guling</span></div><a class="btn sm" href="https://maps.app.goo.gl/KjFYkLuF5RmEm21w7" target="_blank" rel="noopener">Lihat di Google Maps</a></div></div></section>'+'<footer class="wrap foot">Harga di atas estimasi. Ketersediaan dan harga final dikonfirmasi lewat WhatsApp.'+(s.wa?' <a href="'+waLink('Halo '+s.brand+', saya mau tanya villa')+'" target="_blank" rel="noopener">Chat admin</a>':'')+'</footer>';
  var f=$('#sf');
  f.ci.addEventListener('change',function(){G.ci=f.ci.value;if(G.ci){f.co.min=addDays(G.ci,1);if(!G.co||G.co<=G.ci){G.co=addDays(G.ci,1);f.co.value=G.co}}});
  f.co.addEventListener('change',function(){G.co=f.co.value});
  f.g.addEventListener('input',function(){f.g.value=f.g.value.replace(/\D/g,'').slice(0,3);G.g=f.g.value});
  $$('[data-step]',f).forEach(function(b){b.addEventListener('click',function(){var v=Math.max(1,num(f.g.value)+Number(b.dataset.step));f.g.value=v;G.g=String(v)})});
  ['bmin','bmax'].forEach(function(k){f[k].addEventListener('input',function(){var v=num(f[k].value);f[k].value=v?v.toLocaleString('id-ID'):'';G[k]=f[k].value})});
  f.bmode.addEventListener('change',function(){G.bmode=f.bmode.value});
  f.addEventListener('submit',function(e){e.preventDefault();G.searched=true;search();var r=$('#res');if(r&&r.scrollIntoView)r.scrollIntoView({behavior:'smooth',block:'start'})});
  if(G.searched)search();
}
function msgBox(title,body,waText){
  var s=D.settings;
  return '<div class="empty"><b>'+title+'</b>'+body+(s.wa&&waText?'<div><a class="btn wa" target="_blank" rel="noopener" href="'+waLink(waText)+'">Tanya admin via WhatsApp</a></div>':'')+'</div>';
}
function search(){
  var res=$('#res'),s=D.settings,ci=G.ci,co=G.co,g=num(G.g),lo=num(G.bmin),hi=num(G.bmax);if(lo&&hi&&lo>hi){var tmp=lo;lo=hi;hi=tmp}var b=lo||hi,unit=G.bmode==='night'?' per malam':' total',bl=lo&&hi?rp(lo)+' – '+rp(hi):hi?'maks '+rp(hi):lo?'mulai '+rp(lo):'';
  if(!ci||!co||co<=ci){res.innerHTML=msgBox('Pilih tanggal dulu ya','Isi tanggal check-in dan check-out.');return}
  if(!g){res.innerHTML=msgBox('Isi jumlah orang dulu ya','Biar kami carikan villa yang muat.');return}
  var ns=nights(ci,co);
  var dt=fmtD(ci,{weekday:'short'})+' – '+fmtD(co,{weekday:'short'});
  var askTxt='Halo '+s.brand+', saya cari villa\nCheck-in: '+fmtD(ci,{weekday:'long'})+'\nCheck-out: '+fmtD(co,{weekday:'long'})+' ('+ns.length+' malam)\nJumlah tamu: '+g+' orang'+(b?'\nBudget: '+bl+unit:'')+'\nAda yang available?';
  var act=D.villas.filter(function(v){return v.active!==false&&!v.status});
  if(!act.length){res.innerHTML=msgBox('Daftar villa lagi disiapkan','Langsung tanya admin aja ya.',askTxt);return}
  var fit=act.filter(function(v){return g<=capOf(v)});
  if(!fit.length){res.innerHTML=msgBox('Belum ada 1 villa yang muat '+g+' orang','Rombongan besar bisa pakai 2 villa sekaligus. Chat admin buat dicarikan kombinasinya.',askTxt);return}
  var items=fit.filter(function(v){return isFree(v,ns)}).map(function(v){var q=quote(v,ns);return{v:v,q:q,cmp:G.bmode==='night'?q.avg:q.total}});
  var inB=items,over=[],under=[];
  if(b){
    inB=items.filter(function(i){return (!lo||i.cmp>=lo)&&(!hi||i.cmp<=hi)});
    if(lo)under=items.filter(function(i){return i.cmp<lo});
    if(hi&&s.showOver){var lim=hi*(1+(Number(s.overPct)||0)/100);over=items.filter(function(i){return i.cmp>hi&&i.cmp<=lim})}
    inB.sort(function(x,y){return y.cmp-x.cmp});
  }else inB.sort(function(x,y){return x.cmp-y.cmp});
  over.sort(function(x,y){return x.cmp-y.cmp});
  under.sort(function(x,y){return y.cmp-x.cmp});
  var h='<p class="sum"><b>'+dt+'</b> · '+ns.length+' malam · '+g+' orang'+(b?' · budget '+bl+unit:'')+'</p>';
  if(!items.length){res.innerHTML=h+msgBox('Villa yang muat udah penuh di tanggal ini','Coba geser tanggalnya, atau chat admin. Kadang ada villa mitra yang belum masuk daftar.',askTxt);return}
  if(inB.length){h+='<div class="sec">'+inB.length+' villa tersedia'+(b?' sesuai budget':'')+'</div><div class="grid">'+inB.map(function(i){return card(i,ns,g,false)}).join('')+'</div>'}
  else if(b){var alt=over.length||under.length;h+=msgBox('Belum ada yang pas di range budget ini',alt?'Tapi ada opsi lain di bawah, cek dulu ya.':'Coba lebarin range budgetnya, atau chat admin buat opsi lain.',alt?null:askTxt)}
  if(under.length){h+='<div class="sec">Lebih hemat dari budget <span class="tag">di bawah '+rp(lo)+'</span></div><div class="grid">'+under.map(function(i){return card(i,ns,g,false)}).join('')+'</div>'}
  if(over.length){h+='<div class="sec">Sedikit di atas budget <span class="tag">maks +'+(Number(s.overPct)||0)+'%</span></div><div class="grid">'+over.map(function(i){return card(i,ns,g,true)}).join('')+'</div>'}
  res.innerHTML=h;
  bindPhotos(res);
}
function bindPhotos(root){
  $$('.vc',root).forEach(function(c){var ph=$('.ph',c),idx=$('.phi',c);if(!ph||!idx)return;
    function upd(){var i=Math.round(ph.scrollLeft/Math.max(1,ph.clientWidth)),n=ph.children.length;idx.textContent=i+1;var pv=$('.phb.prev',c),nx=$('.phb.next',c);if(pv)pv.disabled=i<=0;if(nx)nx.disabled=i>=n-1}
    ph.addEventListener('scroll',function(){clearTimeout(ph._t);ph._t=setTimeout(upd,60)},{passive:true});upd();
    $$('.phb',c).forEach(function(b){b.addEventListener('click',function(e){e.preventDefault();var i=Math.round(ph.scrollLeft/Math.max(1,ph.clientWidth))+Number(b.dataset.ph);i=Math.max(0,Math.min(ph.children.length-1,i));ph.scrollTo({left:i*ph.clientWidth,behavior:'smooth'})})});
    // geser pakai drag mouse di komputer
    var down=false,sx=0,sl=0,moved=false;
    ph.addEventListener('mousedown',function(e){down=true;moved=false;sx=e.pageX;sl=ph.scrollLeft;ph.classList.add('drag');e.preventDefault()});
    window.addEventListener('mousemove',function(e){if(!down)return;var dx=e.pageX-sx;if(Math.abs(dx)>3)moved=true;ph.scrollLeft=sl-dx});
    window.addEventListener('mouseup',function(e){if(!down)return;down=false;ph.classList.remove('drag');var dx=e.pageX-sx,i=Math.round(sl/Math.max(1,ph.clientWidth));if(dx<-40)i++;else if(dx>40)i--;i=Math.max(0,Math.min(ph.children.length-1,i));ph.scrollTo({left:i*ph.clientWidth,behavior:'smooth'})});
  });
}
function card(i,ns,g,isOver){
  var v=i.v,q=i.q,s=D.settings,ph=goodPhotos(v);
  var photos=ph.length?'<div class="phw"><div class="ph">'+ph.map(function(p,k){return '<img src="'+imgSrc(p)+'" alt="'+esc(v.name)+' foto '+(k+1)+'" loading="lazy">'}).join('')+'</div>'+(ph.length>1?'<button type="button" class="phb prev" data-ph="-1" aria-label="Foto sebelumnya">‹</button><button type="button" class="phb next" data-ph="1" aria-label="Foto berikutnya">›</button><div class="phn"><span class="phi">1</span>/'+ph.length+' foto</div>':'')+'</div>':'<div class="ph none">'+esc((v.name||'V').charAt(0))+'</div>';
  var parts=[];if(q.c.weekday)parts.push(q.c.weekday+' weekday');if(q.c.weekend)parts.push(q.c.weekend+' weekend');if(q.c.high)parts.push(q.c.high+' high season');
  var price=s.priceMode==='from'
    ?'<div class="price"><small>mulai dari</small><b>'+rp(minRate(v))+'</b><small>per malam</small></div>'
    :'<div class="price"><small>Estimasi '+ns.length+' malam</small><b>'+rp(q.total)+'</b><small>'+parts.join(' · ')+'</small></div>';
  var extra=(v.capStd&&g>v.capStd)?'<div class="note">Lebih dari '+v.capStd+' orang, mungkin ada biaya extra bed.</div>':'';
  var meta=[v.location,v.bedrooms?v.bedrooms+' kamar':'',v.bathrooms?v.bathrooms+' kamar mandi':'','maks '+capOf(v)+' orang'].filter(Boolean).map(esc).join(' · ');
  var txt='Halo '+s.brand+', saya mau booking *'+v.name+'*\nCheck-in: '+fmtD(ns[0],{weekday:'long'})+'\nCheck-out: '+fmtD(addDays(ns[ns.length-1],1),{weekday:'long'})+' ('+ns.length+' malam)\nJumlah tamu: '+g+' orang\nMasih available?';
  return '<article class="vc'+(isOver?' over':'')+'">'+photos+'<div class="vb"><h3>'+esc(v.name)+'</h3><div class="meta">'+meta+'</div>'+
    ((v.facilities||[]).length?'<div class="chips">'+v.facilities.map(function(f){return '<span>'+esc(f)+'</span>'}).join('')+'</div>':'')+
    (v.desc?'<p class="desc">'+esc(v.desc)+'</p>':'')+extra+
    '<div class="vf">'+price+(s.wa?'<a class="btn wa" target="_blank" rel="noopener" href="'+waLink(txt)+'">Booking via WhatsApp</a>':'')+'</div></div></article>';
}

/* ================= ADMIN ================= */
var A={tab:'villa',month:todayDS().slice(0,7),q:''};
function matchQ(v){var q=A.q.trim().toLowerCase();return !q||String(v.name||'').toLowerCase().indexOf(q)>=0||String(v.location||'').toLowerCase().indexOf(q)>=0}
function markDirty(){dirty=true;var st=$('#st');if(st){st.className='st d';st.textContent='Ada perubahan yang belum disimpan'}}
function renderAdmin(){
  app.innerHTML='<div class="abar"><div class="wrap"><span class="t">Admin · '+esc(D.settings.brand)+'</span><span class="who">👤 '+esc(USER?USER.name:'')+(isOwner()?' (Pemilik)':isMitra()?' (Mitra)':' (Admin)')+'</span><span id="st" class="st'+(dirty?' d':'')+'">'+(dirty?'Ada perubahan yang belum disimpan':'Semua tersimpan')+'</span><a href="/" target="_blank">Lihat halaman tamu</a><a href="#" id="logout">Keluar</a><button class="btn primary" id="saveBtn">Simpan &amp; Publikasikan</button></div></div>'+
   '<div class="wrap"><div class="tabs">'+(isMitra()?[['villa','Villa Saya'],['cal','Jadwal']]:[['villa','Villa'],['dup','Verifikasi'+(pendingCount()?' ('+pendingCount()+')':'')],['cal','Tanggal Terisi'],['hs','High Season'],['set','Pengaturan']]).concat(isOwner()?[['log','Riwayat']]:[]).map(function(t){return '<button data-tab="'+t[0]+'" class="'+(A.tab===t[0]?'on':'')+'">'+t[1]+'</button>'}).join('')+'</div><div id="pane"></div></div>';
  $$('[data-tab]').forEach(function(b){b.addEventListener('click',function(){A.tab=b.dataset.tab;renderAdmin()})});
  $('#saveBtn').addEventListener('click',save);
  $('#logout').onclick=function(e){e.preventDefault();if(dirty&&!window.confirm('Ada perubahan belum disimpan. Tetap keluar?'))return;setTok('');USER=null;PRIV={};PRIV_DIRTY={};dirty=false;renderLogin()};
  var p=$('#pane');
  if(A.tab==='villa')paneVilla(p);else if(A.tab==='cal')paneCal(p);else if(A.tab==='hs'&&!isMitra())paneHS(p);else if(A.tab==='dup'&&!isMitra())paneDup(p);else if(A.tab==='log'&&isOwner())paneLog(p);else if(!isMitra())paneSet(p);else paneVilla(p);
}

function paneVilla(p){
  function rows(){return myVillas().filter(matchQ).map(function(v){
    var gp=goodPhotos(v),th=gp[0]?'<img src="'+gp[0]+'" alt="" loading="lazy">':'<div class="th">'+esc((v.name||'V').charAt(0))+'</div>';
    return '<div class="vi">'+th+'<div class="inf"><b>'+esc(v.name)+(v.status?'':'<span class="badge'+(v.active!==false?' on':'')+'">'+(v.active!==false?'Tampil':'Disembunyikan')+'</span>')+statusBadge(v)+(!isMitra()&&v.ownerAcc?'<span class="badge mit">Mitra'+(accName(v.ownerAcc)?': '+esc(accName(v.ownerAcc)):(isOwner()?': akun dihapus':''))+'</span>':'')+'</b><span>'+(v.bedrooms||'-')+' kamar · '+(v.capStd||'-')+'–'+capOf(v)+' orang · WD '+rp(v.priceWeekday)+' · WE '+rp(v.priceWeekend)+(v.priceHigh?' · HS '+rp(v.priceHigh):'')+'</span>'+(canOwner()&&PRIV[v.id]&&(PRIV[v.id].ownerName||PRIV[v.id].ownerPhone)?'<span class="own">🔒 Pemilik: <b>'+esc(PRIV[v.id].ownerName||'-')+'</b>'+(PRIV[v.id].ownerPhone?' · <a href="'+waOwner(PRIV[v.id].ownerPhone)+'" target="_blank" rel="noopener">'+esc(PRIV[v.id].ownerPhone)+'</a>':'')+'</span>':'')+(v.status==='pending'&&isMitra()?'<span class="upd">'+(DUPS[v.id]&&DUPS[v.id].possibleDup?'⚠️ Villa ini kemungkinan sudah terdaftar. Admin PuncakGoVillas lagi ngecek dulu.':'Belum tampil ke tamu sampai disetujui admin.')+'</span>':'')+(v.status==='pending'&&!isMitra()?'<span class="upd"><a href="#" data-gover>⏳ Belum tampil ke tamu · cek di tab Verifikasi</a></span>':'')+(v.status==='rejected'?'<span class="upd">Ditolak'+(v.rejectNote?': '+esc(v.rejectNote):'')+'</span>'+(v.photosCleaned?'<span class="upd">🗑️ Fotonya udah dihapus otomatis '+fmtTime(v.photosCleaned)+'</span>':(v.rejectedAt&&(v.photos||[]).length?'<span class="upd">🗑️ Foto dihapus otomatis mulai '+fmtD(toDS(Date.parse(v.rejectedAt)+30*864e5))+'</span>':'')):'')+(v.updatedBy?'<span class="upd">Terakhir diubah <b>'+esc(v.updatedBy)+'</b> · '+fmtTime(v.updatedAt)+'</span>':'')+'</div><div class="act"><button class="btn sm" data-edit="'+v.id+'">Edit</button>'+(v.status==='rejected'&&!isMitra()?'<button class="btn sm danger" data-purge="'+v.id+'">Hapus permanen</button>':'<button class="btn sm danger" data-del="'+v.id+'">Hapus</button>')+'</div></div>';
  }).join('')}
  p.innerHTML='<div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><div><h2>'+(isMitra()?'Villa Saya':'Daftar Villa')+' ('+myVillas().length+')</h2><p class="hint" style="margin:0">Data villa yang tampil ke tamu.</p></div><div class="row">'+(isMitra()?'':'<button class="btn" id="impV">Import Excel</button>')+'<button class="btn primary" id="addV">+ Tambah Villa</button></div></div>'+'<div class="srch" style="margin-top:14px"><input id="vq" type="search" placeholder="🔍 Cari nama villa atau lokasi…" value="'+esc(A.q)+'" autocomplete="off"></div>'+'<div class="vl" id="vl" style="margin-top:14px"></div></div>';
  function fill(){var h=rows();$('#vl',p).innerHTML=h||(myVillas().length?'<p class="hint">Nggak ada villa yang cocok.</p>':'<div class="empty"><b>Belum ada villa</b>Klik "Tambah Villa" buat mulai'+(isMitra()?' upload villa kamu.':' (atau "Import Excel").')+'</div>');bind()}
  var vq=$('#vq',p);if(vq)vq.addEventListener('input',function(){A.q=vq.value;fill()});
  $('#addV').addEventListener('click',function(){editVilla(null)});
  if($('#impV'))$('#impV').addEventListener('click',importExcel);
  fill();
  function bind(){
  $$('[data-edit]',p).forEach(function(b){b.addEventListener('click',function(){editVilla(b.dataset.edit)})});
  $$('[data-purge]',p).forEach(function(b){b.addEventListener('click',function(){
    var v=D.villas.find(function(x){return x.id===b.dataset.purge});if(!v)return;
    confirmBox('Hapus permanen '+v.name+'?','Villa, jadwal, dan '+((v.photos||[]).length?(v.photos.length+' fotonya'):'datanya')+' dihapus beneran dari penyimpanan. Nggak bisa dibalikin.','Hapus permanen').then(function(ok){if(!ok)return;
      var others={};D.villas.forEach(function(x){if(x.id!==v.id)(x.photos||[]).forEach(function(ph){others[ph]=1})});
      (v.photos||[]).forEach(function(ph){if(!others[ph]&&PHOTO_DEL.indexOf(ph)<0)PHOTO_DEL.push(ph)});
      D.villas=D.villas.filter(function(x){return x.id!==v.id});delete D.booked[v.id];markDirty();save()})
  })});
  $$('[data-gover]',p).forEach(function(b){b.addEventListener('click',function(e){e.preventDefault();A.tab='dup';renderAdmin()})});
  $$('[data-del]',p).forEach(function(b){b.addEventListener('click',function(){
    var v=D.villas.find(function(x){return x.id===b.dataset.del});
    confirmBox('Hapus '+v.name+'?','Villa dan tanggal terisinya bakal dihapus dari halaman ini.','Hapus').then(function(ok){if(!ok)return;D.villas=D.villas.filter(function(x){return x.id!==v.id});delete D.booked[v.id];markDirty();renderAdmin()})
  })});
  }
}

/* ===== import excel ===== */
/* ===== verifikasi villa baru dari broker/mitra + cek dobel ===== */
function paneDup(p){
  p.innerHTML='<div class="panel"><h2>Verifikasi villa baru</h2><p class="hint" style="margin:0">Villa baru yang diinput akun mitra/broker masuk sini dulu dan <b>belum tampil ke tamu</b> sampai disetujui. Sistem ngecek otomatis villa lain yang kemungkinan sama (no. HP pemilik, nama, lokasi & kamar). Aturan komisi: <b>yang input duluan yang dapet</b>.</p><div id="dl" style="margin-top:14px"><p class="hint">Memuat…</p></div></div>';
  if(dirty){$('#dl',p).innerHTML='<div class="note">Ada perubahan yang belum disimpan. Klik <b>Simpan &amp; Publikasikan</b> dulu biar pengecekan dobelnya pakai data terbaru.</div>';return}
  function when(x){return x.createdAt?fmtTime(x.createdAt):'data lama'}
  function who(x){return x.by||(x.ownerAcc?accName(x.ownerAcc):'')||'tim'}
  function info(x){return '<span>'+esc(x.location||'-')+' · '+(x.bedrooms||'-')+' kamar · WD '+rp(x.priceWeekday)+' · WE '+rp(x.priceWeekend)+'</span>'+(x.ownerPhone!=null?'<span class="own">🔒 Pemilik: '+esc(x.ownerName||'-')+(x.ownerPhone?' · '+esc(x.ownerPhone):' · <b>no. HP kosong</b>')+'</span>':'')+'<span class="upd">Diinput <b>'+esc(who(x))+'</b> · '+esc(when(x))+'</span>'}
  function th(x){return imgSrc(x.photo)?'<img src="'+imgSrc(x.photo)+'" alt="" loading="lazy">':'<div class="th">'+esc((x.name||'V').charAt(0))+'</div>'}
  api('GET','/api/dupes').then(function(r){
    var list=(r.villas||[]).filter(function(x){return D.villas.some(function(v){return v.id===x.id&&v.status==='pending'})});
    if(!list.length){$('#dl',p).innerHTML='<div class="empty"><b>Nggak ada yang perlu dicek</b>Semua villa dari mitra udah diverifikasi.</div>';return}
    $('#dl',p).innerHTML=list.map(function(x){
      var older=x.matches.filter(function(mm){return !mm.createdAt||mm.createdAt<x.createdAt});
      return '<div class="dupc'+(x.matches.length?' warn':'')+'"><div class="vi">'+th(x)+'<div class="inf"><b>'+esc(x.name)+'<span class="badge pend">Baru</span></b>'+info(x)+(x.noPhone?'<span class="err" style="margin:0">⚠️ No. HP pemilik belum diisi, susah dicek dobelnya.</span>':'')+'</div></div>'+
        (x.matches.length?'<div class="dupm"><div class="dh">⚠️ Kemungkinan sama dengan:</div>'+x.matches.map(function(mm){return '<div class="vi">'+th(mm)+'<div class="inf"><b>'+esc(mm.name)+(mm.status==='pending'?'<span class="badge pend">Juga baru</span>':'')+((!mm.createdAt||mm.createdAt<x.createdAt)?'<span class="badge on">Input duluan</span>':'')+'</b><span class="why">'+mm.reasons.map(esc).join(' · ')+'</span>'+info(mm)+'</div><div class="act"><button class="btn sm danger" data-rej="'+x.id+'" data-of="'+mm.id+'">Tolak, ini dobel</button></div></div>'}).join('')+'</div>':'<p class="hint" style="margin:8px 0 0">✅ Nggak ketemu villa lain yang mirip.</p>')+
        '<div class="row" style="margin-top:10px;justify-content:flex-end"><button class="btn sm" data-edit="'+x.id+'">Lihat / edit</button><button class="btn sm danger" data-rej="'+x.id+'">Tolak</button><button class="btn sm primary" data-ok="'+x.id+'" data-m="'+x.matches.map(function(mm){return mm.id}).join(',')+'">'+(x.matches.length?'Bukan dobel, setujui':'Setujui')+'</button></div>'+
        (older.length?'<p class="hint" style="margin:6px 0 0;text-align:right">Kalau ini beneran villa yang sama, komisi buat <b>'+esc(who(older[0]))+'</b> (input duluan).</p>':'')+'</div>'}).join('');
    function V(id){return D.villas.find(function(v){return v.id===id})}
    $$('[data-edit]',p).forEach(function(b){b.onclick=function(){editVilla(b.dataset.edit)}});
    $$('[data-ok]',p).forEach(function(b){b.onclick=function(){var v=V(b.dataset.ok);if(!v)return;delete v.status;delete v.rejectNote;var ids=(b.dataset.m||'').split(',').filter(Boolean);if(ids.length)v.notDup=(v.notDup||[]).concat(ids.filter(function(i){return (v.notDup||[]).indexOf(i)<0}));markDirty();toast('Disetujui: '+v.name);save()}});
    $$('[data-rej]',p).forEach(function(b){b.onclick=function(){var v=V(b.dataset.rej);if(!v)return;var of=b.dataset.of?V(b.dataset.of):null;
      confirmBox('Tolak '+v.name+'?',of?'Villa ini ditandai dobel dengan '+of.name+'. Villanya nggak dihapus, cuma ditandai "Ditolak" dan nggak tampil ke tamu. Broker yang input bakal lihat keterangan "sudah terdaftar sebelumnya".':'Villanya nggak dihapus, cuma ditandai "Ditolak" dan nggak tampil ke tamu.','Tolak').then(function(ok){if(!ok)return;v.status='rejected';v.rejectedAt=new Date().toISOString();v.rejectNote=of?'Villa ini sudah terdaftar sebelumnya oleh pihak lain.':'Belum bisa ditampilkan, hubungi admin PuncakGoVillas.';markDirty();save()})}});
  }).catch(function(e){$('#dl',p).innerHTML='<p class="err">Gagal memuat: '+esc(e.message)+'</p>'});
}
var XLSX_P=null;
function loadXLSX(){if(window.XLSX)return Promise.resolve(window.XLSX);if(!XLSX_P)XLSX_P=new Promise(function(res,rej){var sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';sc.onload=function(){window.XLSX?res(window.XLSX):rej()};sc.onerror=function(){XLSX_P=null;rej()};document.head.appendChild(sc)});return XLSX_P}
var PCOLS={ownerName:['namapemilik','pemilik','pemilikvilla'],ownerPhone:['nohppemilik','nopemilik','hppemilik','nomorpemilik','wapemilik','nowapemilik','telppemilik'],ownerNote:['catatanpemilik']};
var COLS={name:['nama','namavilla','villa'],location:['lokasi','alamat','area'],bedrooms:['kamar','jumlahkamar','kamartidur'],bathrooms:['kamarmandi','km'],capStd:['kapasitasnormal','kapasitas','kapasitasstandar'],capMax:['kapasitasmaks','kapasitasmaksimal','kapasitasmax','maks'],priceWeekday:['hargaweekday','weekday'],priceWeekend:['hargaweekend','weekend'],priceHigh:['hargahighseason','highseason','hargahs'],facilities:['fasilitas'],desc:['deskripsi','keterangan'],active:['tampil','aktif']};
function normKey(k){return String(k).toLowerCase().replace(/[^a-z0-9]/g,'')}
function cellNum(x){return typeof x==='number'?Math.round(x):num(x)}
function parseRows(rows){
  var out=[];rows.forEach(function(r){var o={},m={};Object.keys(r).forEach(function(k){m[normKey(k)]=r[k]});
    Object.keys(COLS).forEach(function(f){for(var i=0;i<COLS[f].length;i++){if(m.hasOwnProperty(COLS[f][i])&&String(m[COLS[f][i]]).trim()!==''){o[f]=m[COLS[f][i]];break}}});
    if(!o.name||!String(o.name).trim())return;
    var v={name:String(o.name).trim()};
    if(o.location!=null)v.location=String(o.location).trim();
    ['bedrooms','bathrooms','capStd','capMax','priceWeekday','priceWeekend','priceHigh'].forEach(function(f){if(o[f]!=null)v[f]=cellNum(o[f])});
    if(o.facilities!=null)v.facilities=String(o.facilities).split(/[,;\/\n]+/).map(function(x){return x.trim()}).filter(Boolean);
    if(o.desc!=null)v.desc=String(o.desc).trim();
    var pr={};Object.keys(PCOLS).forEach(function(f){for(var i=0;i<PCOLS[f].length;i++){var c=PCOLS[f][i];if(m.hasOwnProperty(c)&&String(m[c]).trim()!==''){pr[f]=String(m[c]).trim();break}}});
    if(Object.keys(pr).length)v._priv=pr;
    if(o.active!=null)v.active=!/^(tidak|no|n|0|false|sembunyi|hide)/i.test(String(o.active).trim());
    out.push(v)});
  return out;
}
function importExcel(){
  var m=modal('<h2>Import villa dari Excel</h2><p class="hint">Baris pertama harus judul kolom. Kolom yang dibaca: <b>Nama</b>, Lokasi, Kamar, Kamar Mandi, Kapasitas Normal, Kapasitas Maks, Harga Weekday, Harga Weekend, Harga High Season, Fasilitas (pisah pakai koma), Deskripsi, Tampil (Ya/Tidak).</p><p class="hint">Villa yang namanya sudah ada akan <b>diupdate</b> (foto & tanggal terisi tetap aman). Nama baru akan <b>ditambahkan</b>. Villa yang nggak ada di file <b>nggak dihapus</b>.</p><input type="file" id="xf" accept=".xlsx,.xls,.csv"><div id="xr" style="margin-top:12px"></div><div class="mf"><button class="btn" data-x>Batal</button><button class="btn primary" data-ok disabled>Import</button></div>');
  var parsed=null;
  $('[data-x]',m).onclick=function(){m.remove()};
  $('#xf',m).onchange=function(e){var f=e.target.files[0];if(!f)return;$('#xr',m).innerHTML='<p class="hint">Membaca file…</p>';
    loadXLSX().then(function(X){return f.arrayBuffer().then(function(buf){var wb=X.read(buf,{type:'array'});var ws=wb.Sheets[wb.SheetNames[0]];return X.utils.sheet_to_json(ws,{defval:''})})})
    .then(function(rows){parsed=parseRows(rows);var idx={};D.villas.forEach(function(v){idx[v.name.trim().toLowerCase()]=1});var nw=parsed.filter(function(v){return !idx[v.name.toLowerCase()]}).length,up=parsed.length-nw;
      $('#xr',m).innerHTML=parsed.length?'<div class="note" style="background:var(--soft);color:var(--green)">Ketemu <b>'+parsed.length+'</b> villa: <b>'+nw+'</b> baru, <b>'+up+'</b> diupdate.</div><div class="rl" style="max-height:220px;overflow:auto;margin-top:8px">'+parsed.slice(0,200).map(function(v){return '<div class="it"><span>'+esc(v.name)+'</span><span class="hint" style="margin:0">'+(idx[v.name.toLowerCase()]?'update':'baru')+'</span></div>'}).join('')+'</div>':'<p class="err">Nggak ada baris yang kebaca. Pastikan ada kolom "Nama".</p>';
      $('[data-ok]',m).disabled=!parsed.length})
    .catch(function(){$('#xr',m).innerHTML='<p class="err">File nggak bisa dibaca. Coba simpan ulang sebagai .xlsx atau .csv.</p>'})};
  $('[data-ok]',m).onclick=function(){if(!parsed)return;var idx={};D.villas.forEach(function(v){idx[v.name.trim().toLowerCase()]=v});
    parsed.forEach(function(r){var pr=r._priv;delete r._priv;var ex=idx[r.name.toLowerCase()];if(ex){Object.keys(r).forEach(function(k){ex[k]=r[k]})}else{var v=Object.assign({id:uid(),name:'',location:'',bedrooms:0,bathrooms:0,capStd:0,capMax:0,priceWeekday:0,priceWeekend:0,priceHigh:0,facilities:[],desc:'',photos:[],active:true},r);D.villas.push(v);idx[r.name.toLowerCase()]=v}
      if(pr&&canOwner()){var tv=idx[r.name.toLowerCase()],op=PRIV[tv.id]||{},np=Object.assign({ownerName:op.ownerName||'',ownerPhone:op.ownerPhone||'',ownerNote:op.ownerNote||''},pr);PRIV_DIRTY[tv.id]=np;PRIV[tv.id]=Object.assign({},op,np)}});
    D.villas.forEach(function(v){if(v.capMax&&v.capStd&&v.capMax<v.capStd)v.capMax=v.capStd});
    m.remove();markDirty();renderAdmin();toast('Import beres. Jangan lupa klik "Simpan & Publikasikan".',4000)};
}

function modal(html){var bg=document.createElement('div');bg.className='modal-bg';bg.innerHTML='<div class="modal">'+html+'</div>';document.body.appendChild(bg);return bg}
function confirmBox(title,body,okLabel){return new Promise(function(res){var m=modal('<h2>'+esc(title)+'</h2><p style="margin:0;color:var(--muted)">'+esc(body)+'</p><div class="mf"><button class="btn" data-x>Batal</button><button class="btn primary" data-ok>'+esc(okLabel||'OK')+'</button></div>');$('[data-x]',m).onclick=function(){m.remove();res(false)};$('[data-ok]',m).onclick=function(){m.remove();res(true)}})}

function compressBlob(file){return new Promise(function(res,rej){var url=URL.createObjectURL(file),img=new Image();img.onload=function(){var max=1280,s=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);c.toBlob(function(b){b?res(b):rej()},'image/jpeg',0.75)};img.onerror=function(){URL.revokeObjectURL(url);rej()};img.src=url})}
function compress(file){return new Promise(function(res,rej){var url=URL.createObjectURL(file),img=new Image();img.onload=function(){var max=1100,s=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);res(c.toDataURL('image/jpeg',0.72))};img.onerror=function(){URL.revokeObjectURL(url);rej()};img.src=url})}

function editVilla(id){
  var orig=id?D.villas.find(function(v){return v.id===id}):null;
  var v=orig?JSON.parse(JSON.stringify(orig)):{id:uid(),name:'',location:'',bedrooms:'',bathrooms:'',capStd:'',capMax:'',priceWeekday:'',priceWeekend:'',priceHigh:'',facilities:[],desc:'',photos:[],active:true};
  if(!orig&&isMitra()){v.ownerAcc=USER.id;v.status='pending'}
  var pv=Object.assign({},PRIV[v.id]||{});
  var mitras=ACCS.filter(function(a){return a.type==='mitra'});
  function money(n,k,l,hint){return '<label><span>'+l+(hint?' <span class="opt">'+hint+'</span>':'')+'</span><input data-m="'+k+'" inputmode="numeric" value="'+(n?Number(n).toLocaleString('id-ID'):'')+'" placeholder="0"></label>'}
  var m=modal('<h2>'+(orig?'Edit villa':'Tambah villa')+'</h2><div class="fg">'+
    '<label class="full">Nama villa<input data-k="name" value="'+esc(v.name)+'" placeholder="Villa Arisela"></label>'+
    '<label class="full"><span>Lokasi <span class="opt">(opsional)</span></span><input data-k="location" value="'+esc(v.location)+'" placeholder="Cisarua, Puncak"></label>'+
    '<label>Jumlah kamar<input data-n="bedrooms" inputmode="numeric" value="'+esc(v.bedrooms)+'"></label>'+
    '<label>Kamar mandi<input data-n="bathrooms" inputmode="numeric" value="'+esc(v.bathrooms)+'"></label>'+
    '<label>Kapasitas normal<input data-n="capStd" inputmode="numeric" value="'+esc(v.capStd)+'" placeholder="orang"></label>'+
    '<label>Kapasitas maksimal<input data-n="capMax" inputmode="numeric" value="'+esc(v.capMax)+'" placeholder="dgn extra bed"></label>'+
    money(v.priceWeekday,'priceWeekday','Harga weekday','/malam')+money(v.priceWeekend,'priceWeekend','Harga weekend','Jum & Sab malam')+
    money(v.priceHigh,'priceHigh','Harga high season','opsional')+'<div></div>'+
    '<div class="full"><label style="margin-bottom:6px">Fasilitas</label><div class="pick" id="fac"></div><div class="row" style="margin-top:8px"><label style="flex:1"><input id="facIn" placeholder="Tambah fasilitas lain, lalu Enter"></label><button class="btn sm" id="facAdd" type="button">Tambah</button></div></div>'+
    '<label class="full"><span>Deskripsi singkat <span class="opt">(opsional)</span></span><textarea data-k="desc" rows="3" placeholder="Villa luas dengan kolam renang dan view gunung...">'+esc(v.desc)+'</textarea></label>'+
    '<div class="full"><label style="margin-bottom:6px"><span>Foto <span class="opt">(maks 6, foto pertama jadi cover)</span></span></label><div class="pg" id="pg"></div><input type="file" id="pf" accept="image/*" multiple hidden></div>'+
    (canOwner()?'<div class="full privbox"><div class="privh">🔒 Kontak pemilik villa <span class="opt">(rahasia, nggak tampil di website'+(isMitra()?'. Cuma kamu & tim PuncakGoVillas yang bisa lihat':', cuma kelihatan di admin')+')</span></div><div class="fg"><label>Nama pemilik<input id="oN" value="'+esc(pv.ownerName||'')+'" placeholder="Pak Budi"></label><label>No. HP / WA pemilik'+(isMitra()?' <span class="opt">(wajib)</span>':'')+'<input id="oP" inputmode="tel" value="'+esc(pv.ownerPhone||'')+'" placeholder="08xxxxxxxxxx"></label><label class="full">Catatan <span class="opt">(opsional)</span><input id="oC" value="'+esc(pv.ownerNote||'')+'" placeholder="misal: rekening, jam bisa dihubungi"></label></div></div>':'')+
    (isOwner()&&mitras.length?'<label class="full">Dikelola akun mitra <span class="opt">(mitra cuma bisa lihat & atur villa yang ditugasin ke dia)</span><select id="oAcc"><option value="">— Nggak ada (dikelola tim) —</option>'+mitras.map(function(a){return '<option value="'+esc(a.id)+'"'+(v.ownerAcc===a.id?' selected':'')+'>'+esc(a.name)+'</option>'}).join('')+'</select></label>':'')+
    '<label class="chk full"><input type="checkbox" id="act"'+(v.active!==false?' checked':'')+'> Tampilkan villa ini ke tamu</label>'+
    '</div><div id="er" class="err"></div><div class="mf"><button class="btn" data-x>Batal</button><button class="btn primary" data-ok>Simpan villa</button></div>');
  v.photos=goodPhotos(v);if(!Array.isArray(v.facilities))v.facilities=[];
  function facR(){var all=FAC.concat((v.facilities||[]).filter(function(f){return FAC.indexOf(f)<0}));$('#fac',m).innerHTML=all.map(function(f){return '<button type="button" class="'+(v.facilities.indexOf(f)>=0?'on':'')+'" data-f="'+esc(f)+'">'+esc(f)+'</button>'}).join('');$$('[data-f]',m).forEach(function(b){b.onclick=function(){var f=b.dataset.f,i=v.facilities.indexOf(f);if(i>=0)v.facilities.splice(i,1);else v.facilities.push(f);facR()}})}
  function addFac(){var x=$('#facIn',m).value.trim();if(x&&v.facilities.indexOf(x)<0)v.facilities.push(x);$('#facIn',m).value='';facR()}
  $('#facAdd',m).onclick=addFac;$('#facIn',m).onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();addFac()}};
  function pgR(){$('#pg',m).innerHTML=v.photos.map(function(p,i){return '<div class="p"><img src="'+imgSrc(p)+'" alt="">'+(i===0?'<span class="cv">Cover</span>':'')+'<div class="pa">'+(i>0?'<button type="button" data-cv="'+i+'">Jadikan cover</button>':'')+'<button type="button" data-rm="'+i+'">Hapus</button></div></div>'}).join('')+(v.photos.length<6?'<div class="add" id="padd">+ Tambah foto</div>':'');
    $$('[data-rm]',m).forEach(function(b){b.onclick=function(){v.photos.splice(+b.dataset.rm,1);pgR()}});
    $$('[data-cv]',m).forEach(function(b){b.onclick=function(){var x=v.photos.splice(+b.dataset.cv,1)[0];v.photos.unshift(x);pgR()}});
    var a=$('#padd',m);if(a)a.onclick=function(){$('#pf',m).click()}}
  var upBusy=0;
  $('#pf',m).onchange=function(e){var fs=Array.prototype.slice.call(e.target.files).slice(0,6-v.photos.length);e.target.value='';var a=$('#padd',m);if(a)a.textContent='Mengupload…';upBusy++;var fell=false;
    fs.reduce(function(pr,f){return pr.then(function(){return compressBlob(f).then(uploadBlob).then(function(x){if(x)v.photos.push(x)}).catch(function(e){fell=e})})},Promise.resolve())
    .then(function(){upBusy--;pgR();if(fell)toast('Ada foto yang gagal diupload: '+(fell.message||'coba lagi'),4500)})};
  facR();pgR();
  $$('[data-m]',m).forEach(function(i){i.addEventListener('input',function(){var n=num(i.value);i.value=n?n.toLocaleString('id-ID'):''})});
  $$('[data-n]',m).forEach(function(i){i.addEventListener('input',function(){i.value=i.value.replace(/\D/g,'').slice(0,3)})});
  $('[data-x]',m).onclick=function(){m.remove()};
  $('[data-ok]',m).onclick=function(){
    if(upBusy){$('#er',m).textContent='Tunggu upload foto selesai dulu ya.';return}
    $$('[data-k]',m).forEach(function(i){v[i.dataset.k]=i.value.trim()});
    $$('[data-n]',m).forEach(function(i){v[i.dataset.n]=num(i.value)});
    $$('[data-m]',m).forEach(function(i){v[i.dataset.m]=num(i.value)});
    v.active=$('#act',m).checked;
    if($('#oAcc',m)){var oa=$('#oAcc',m).value;if(oa)v.ownerAcc=oa;else delete v.ownerAcc}
    if(v.capMax&&v.capStd&&v.capMax<v.capStd)v.capMax=v.capStd;
    var er=[];if(!v.name)er.push('nama villa');if(isMitra()&&(!orig||v.status==='pending')&&$('#oP',m)&&$('#oP',m).value.replace(/\D/g,'').length<9)er.push('no. HP pemilik villa');if(!v.capStd&&!v.capMax)er.push('kapasitas');if(!v.priceWeekday&&!v.priceWeekend)er.push('harga');
    if(er.length){$('#er',m).textContent='Isi dulu: '+er.join(', ')+'.';return}
    if(canOwner()&&$('#oN',m)){var np={ownerName:$('#oN',m).value.trim(),ownerPhone:$('#oP',m).value.trim(),ownerNote:$('#oC',m).value.trim()},op=PRIV[v.id]||{};
      if(np.ownerName!==(op.ownerName||'')||np.ownerPhone!==(op.ownerPhone||'')||np.ownerNote!==(op.ownerNote||'')){PRIV_DIRTY[v.id]=np;PRIV[v.id]=Object.assign({},op,np)}}
    if(orig){D.villas[D.villas.indexOf(orig)]=v}else D.villas.push(v);
    m.remove();markDirty();renderAdmin();toast('Villa disimpan. Jangan lupa klik "Simpan & Publikasikan".');
  };
}

function ranges(arr){var a=(arr||[]).slice().sort(),out=[],s=null,prev=null;a.forEach(function(d){if(s&&addDays(prev,1)===d){prev=d}else{if(s)out.push([s,prev]);s=d;prev=d}});if(s)out.push([s,prev]);return out}
function setNights(id,ns,on){var set={};(D.booked[id]||[]).forEach(function(d){set[d]=1});ns.forEach(function(d){if(on)set[d]=1;else delete set[d]});D.booked[id]=Object.keys(set).sort();if(!D.booked[id].length)delete D.booked[id]}

/* ===== sinkron dari aplikasi Pembukuan ===== */
function normName(s){return String(s==null?'':s).toLowerCase().replace(/\s+/g,' ').trim()}
function syncPanel(){
  var i=D.syncInfo,info=i?'<p class="hint" style="margin:10px 0 0">Terakhir sinkron: <b>'+esc(fmtD(i.at))+'</b> · '+i.villas+' villa · '+i.nights+' malam terisi dari pembukuan.</p>':'';
  return '<div class="panel"><h2>Ambil jadwal dari aplikasi Pembukuan</h2><p class="hint">Di aplikasi Pembukuan buka tab Pengaturan lalu klik "Salin kode jadwal". Tempel kodenya di sini. Semua booking di pembukuan otomatis jadi tanggal terisi buat tamu. Tanggal yang kamu tandai manual tetap aman. Nama villa harus sama dengan nama di daftar Villa ini.</p><textarea id="syc" rows="3" placeholder="Tempel kode jadwal di sini"></textarea><div class="row" style="margin-top:10px"><button class="btn primary" id="syb">Terapkan &amp; Publikasikan</button></div><div id="syr" class="hint" style="margin-top:10px"></div>'+info+'</div>';
}
function applySync(txt){
  var obj;try{obj=JSON.parse(String(txt).trim())}catch(e){return{err:'Kodenya nggak valid. Salin ulang dari aplikasi Pembukuan.'}}
  if(!obj||obj.pgv!=='jadwal'||!obj.villa||typeof obj.villa!=='object')return{err:'Ini bukan kode jadwal dari aplikasi Pembukuan.'}
  var t=todayDS(),idx={},matched={},unmatched=[],total=0;
  D.villas.forEach(function(v){idx[normName(v.name)]=v});
  D.synced=D.synced||{};
  Object.keys(obj.villa).forEach(function(name){
    var v=idx[normName(name)],rs=obj.villa[name];
    if(!v){unmatched.push(name);return}
    var set={};
    (Array.isArray(rs)?rs:[]).forEach(function(r){
      if(!Array.isArray(r)||!/^\d{4}-\d\d-\d\d$/.test(r[0])||!/^\d{4}-\d\d-\d\d$/.test(r[1])||r[1]<=r[0])return;
      nights(r[0],r[1]).forEach(function(d){if(d>=t)set[d]=1})});
    matched[v.id]=Object.keys(set).sort();
  });
  Object.keys(D.synced).forEach(function(id){if(!matched[id]&&D.villas.some(function(v){return v.id===id}))matched[id]=[]});
  Object.keys(matched).forEach(function(id){
    var ns=matched[id],prev={};(D.synced[id]||[]).forEach(function(d){prev[d]=1});
    var all={};(D.booked[id]||[]).forEach(function(d){if(!prev[d])all[d]=1});
    ns.forEach(function(d){all[d]=1});
    var m=Object.keys(all).sort();
    if(m.length)D.booked[id]=m;else delete D.booked[id];
    if(ns.length)D.synced[id]=ns;else delete D.synced[id];
    total+=ns.length;
  });
  var vc=Object.keys(D.synced).length;
  D.syncInfo={at:t,villas:vc,nights:total};
  return{villas:vc,nights:total,unmatched:unmatched};
}
function bindSync(p){
  var b=$('#syb',p);if(!b)return;
  b.onclick=function(){
    var r=applySync($('#syc',p).value),out=$('#syr',p);
    if(r.err){out.innerHTML='<span class="err">'+esc(r.err)+'</span>';return}
    markDirty();
    out.innerHTML='<b>'+r.villas+' villa</b> dan <b>'+r.nights+' malam terisi</b> diterapkan.'+(r.unmatched.length?'<br><span class="err">Nama ini ada di pembukuan tapi nggak ketemu di daftar Villa: '+r.unmatched.map(esc).join(', ')+'. Samakan namanya, lalu sinkron lagi.</span>':'');
    save();
  };
}

function paneCal(p){
  if(!myVillas().length){p.innerHTML='<div class="panel"><div class="empty"><b>Tambah villa dulu</b>Baru habis itu bisa tandai tanggal terisi.</div></div>';return}
  var t=todayDS(),ym=A.month.split('-').map(Number),dim=new Date(Date.UTC(ym[0],ym[1],0)).getUTCDate(),days=[];
  for(var d=1;d<=dim;d++)days.push(A.month+'-'+String(d).padStart(2,'0'));
  var mName=new Date(Date.UTC(ym[0],ym[1]-1,1)).toLocaleDateString('id-ID',{month:'long',year:'numeric',timeZone:'UTC'});
  var wd=['M','S','S','R','K','J','S'];
  var VSo=myVillas().filter(matchQ);var opts=(VSo.length?VSo:myVillas()).map(function(v){return '<option value="'+v.id+'">'+esc(v.name)+'</option>'}).join('');
  var VS=myVillas();
  var table='<table><thead><tr><th class="vn">Villa</th>'+days.map(function(ds){var w=dow(ds);return '<th class="'+(w===5||w===6?'we':'')+'">'+wd[w]+'<br>'+Number(ds.slice(8))+'</th>'}).join('')+'</tr></thead><tbody>'+
    VS.map(function(v){var set={};(D.booked[v.id]||[]).forEach(function(x){set[x]=1});return '<tr data-n="'+esc(String(v.name||'').toLowerCase()+' '+String(v.location||'').toLowerCase())+'"><td class="vn" title="'+esc(v.name)+'">'+esc(v.name)+'</td>'+days.map(function(ds){var c='c';if(ds<t)c+=' past';else if(set[ds])c+=' bk';else if(isHigh(ds))c+=' hs';else if(isWeekend(ds))c+=' we';return '<td class="'+c+'" data-v="'+v.id+'" data-d="'+ds+'" title="'+esc(v.name)+' · malam '+fmtD(ds,{weekday:'short'})+'"></td>'}).join('')+'</tr>'}).join('')+'</tbody></table>';
  var rl=myVillas().map(function(v){var rs=ranges((D.booked[v.id]||[]).filter(function(x){return x>=t}));if(!rs.length)return '';return '<div class="rg" data-n="'+esc(String(v.name||'').toLowerCase()+' '+String(v.location||'').toLowerCase())+'"><h4>'+esc(v.name)+'</h4>'+rs.map(function(r){var n=nights(r[0],addDays(r[1],1)).length;return '<div class="it"><span>'+fmtD(r[0],{weekday:'short'})+' → check-out '+fmtD(addDays(r[1],1),{weekday:'short'})+' · '+n+' malam</span><button class="btn sm danger" data-rr="'+v.id+'|'+r[0]+'|'+r[1]+'">Kosongkan</button></div>'}).join('')+'</div>'}).join('');
  p.innerHTML='<div class="srch" style="margin-bottom:18px"><input id="cq" type="search" placeholder="🔍 Cari villa (nama atau lokasi)…" value="'+esc(A.q)+'" autocomplete="off"><p class="hint" id="cqn" style="margin:6px 2px 0"></p></div>'+(isMitra()?'':syncPanel())+'<div class="panel"><h2>Tandai tanggal terisi</h2><p class="hint">Masukin tanggal check-in dan check-out tamu. Malam-malam di antaranya otomatis ketutup buat tamu lain.</p><div class="row"><label>Villa<select id="bv">'+opts+'</select></label><label>Check-in<input type="date" id="bci" min="'+t+'"></label><label>Check-out<input type="date" id="bco" min="'+addDays(t,1)+'"></label><button class="btn primary" id="bOn">Tandai terisi</button><button class="btn" id="bOff">Tandai kosong</button></div><div id="ber" class="err"></div></div>'+
   '<div class="panel"><h2>Kalender</h2><p class="hint">Tiap kotak = 1 malam. Klik kotak buat ganti terisi/kosong.</p><div class="calnav"><button class="btn sm" id="pm">‹</button><b>'+mName+'</b><button class="btn sm" id="nm">›</button></div><div class="cal">'+table+'</div><div class="legend"><span><i style="background:var(--red)"></i>Terisi</span><span><i style="background:#fcf6ec;border:1px solid #eee"></i>Weekend</span><span><i style="background:#fbeee0;border:1px solid #eee"></i>High season</span><span><i style="background:#f3f3f3;border:1px solid #eee"></i>Sudah lewat</span></div></div>'+
   '<div class="panel"><h2>Jadwal terisi ke depan</h2><div class="rl">'+(rl||'<p class="hint" style="margin:0">Belum ada tanggal terisi.</p>')+'</div></div>';
  bindSync(p);
  $('#bci',p).onchange=function(){var a=$('#bci',p).value,b=$('#bco',p);if(a){b.min=addDays(a,1);if(!b.value||b.value<=a)b.value=addDays(a,1)}};
  function apply(on){var ci=$('#bci',p).value,co=$('#bco',p).value;if(!ci||!co||co<=ci){$('#ber',p).textContent='Isi check-in & check-out dengan benar.';return}setNights($('#bv',p).value,nights(ci,co),on);markDirty();A.month=ci.slice(0,7);var keep=$('#bv',p).value;renderAdmin();var s=$('#bv');if(s)s.value=keep;toast(on?'Ditandai terisi':'Ditandai kosong')}
  $('#bOn',p).onclick=function(){apply(true)};$('#bOff',p).onclick=function(){apply(false)};
  function shift(n){var y=ym[0],mo=ym[1]+n;if(mo<1){mo=12;y--}if(mo>12){mo=1;y++}A.month=y+'-'+String(mo).padStart(2,'0');renderAdmin()}
  var cq=$('#cq',p);
  function applyQ(){var q=A.q.trim().toLowerCase(),n=0;
    $$('tr[data-n]',p).forEach(function(tr){var ok=!q||tr.dataset.n.indexOf(q)>=0;tr.style.display=ok?'':'none';if(ok)n++});
    $$('.rg[data-n]',p).forEach(function(g){g.style.display=(!q||g.dataset.n.indexOf(q)>=0)?'':'none'});
    var sel=$('#bv',p),keep=sel.value,list=myVillas().filter(matchQ);if(!list.length)list=myVillas();
    sel.innerHTML=list.map(function(v){return '<option value="'+v.id+'">'+esc(v.name)+'</option>'}).join('');if(list.some(function(v){return v.id===keep}))sel.value=keep;
    $('#cqn',p).textContent=q?(n?n+' villa cocok':'Nggak ada villa yang cocok'):''}
  cq.addEventListener('input',function(){A.q=cq.value;applyQ()});applyQ();
  $('#pm',p).onclick=function(){shift(-1)};$('#nm',p).onclick=function(){shift(1)};
  $$('td.c',p).forEach(function(td){if(td.classList.contains('past'))return;td.onclick=function(){var id=td.dataset.v,ds=td.dataset.d,on=!td.classList.contains('bk');setNights(id,[ds],on);markDirty();td.classList.toggle('bk',on)}});
  $$('[data-rr]',p).forEach(function(b){b.onclick=function(){var x=b.dataset.rr.split('|');setNights(x[0],nights(x[1],addDays(x[2],1)),false);markDirty();renderAdmin()}});
}

function paneHS(p){
  var list=D.highSeason.slice().sort(function(a,b){return a.start<b.start?-1:1}).map(function(r){return '<div class="it"><span><b>'+esc(r.label||'High season')+'</b> · malam '+fmtD(r.start)+' s.d. '+fmtD(r.end)+'</span><button class="btn sm danger" data-hd="'+r.id+'">Hapus</button></div>'}).join('');
  p.innerHTML='<div class="panel"><h2>High season</h2><p class="hint">Malam yang masuk rentang ini pakai harga high season (kalau villanya punya). Contoh: libur Natal & Tahun Baru, Lebaran, long weekend.</p><div class="row"><label>Nama<input id="hl" placeholder="Natal & Tahun Baru"></label><label>Malam pertama<input type="date" id="hs"></label><label>Malam terakhir<input type="date" id="he"></label><button class="btn primary" id="ha">Tambah</button></div><div id="her" class="err"></div><div class="rl" style="margin-top:14px">'+(list||'<p class="hint" style="margin:0">Belum ada high season.</p>')+'</div></div>';
  $('#ha',p).onclick=function(){var s=$('#hs',p).value,e=$('#he',p).value;if(!s||!e||e<s){$('#her',p).textContent='Isi tanggal dengan benar.';return}D.highSeason.push({id:uid(),label:$('#hl',p).value.trim(),start:s,end:e});markDirty();renderAdmin()};
  $$('[data-hd]',p).forEach(function(b){b.onclick=function(){D.highSeason=D.highSeason.filter(function(r){return r.id!==b.dataset.hd});markDirty();renderAdmin()}});
}

function paneSet(p){
  var s=D.settings,size=new Blob([JSON.stringify(D)]).size/1048576;
  p.innerHTML='<div class="panel"><h2>Pengaturan</h2><p class="hint">Tampilan halaman tamu.</p><div class="fg">'+
   '<label>Nama brand<input data-s="brand" value="'+esc(s.brand)+'"></label>'+
   '<label>Nomor WhatsApp<input data-s="wa" inputmode="tel" value="'+esc(s.wa)+'" placeholder="08xxxxxxxxxx"></label>'+
   '<label class="full">Kalimat di bawah judul<input data-s="tagline" value="'+esc(s.tagline)+'"></label>'+
   '<label>Tampilan harga<select data-s="priceMode"><option value="total"'+(s.priceMode==='total'?' selected':'')+'>Estimasi total sesuai tanggal</option><option value="from"'+(s.priceMode==='from'?' selected':'')+'>"Mulai dari" per malam</option></select></label>'+
   '<label>Toleransi di atas budget (%)<input data-s="overPct" inputmode="numeric" value="'+esc(s.overPct)+'"></label>'+
   '<label class="chk full"><input type="checkbox" id="so"'+(s.showOver?' checked':'')+'> Tampilkan villa yang sedikit di atas budget</label>'+
   '</div></div><div class="panel"><h2>Penyimpanan foto</h2><p class="hint" id="usage">Mengecek…</p><button class="btn" id="clean">Bersihin foto yang nggak dipakai</button></div>'+
   (isOwner()?'<div class="panel"><h2>Akun admin</h2><p class="hint">Bikin akun buat tiap orang, biar ketahuan siapa yang upload foto dan ngubah jadwal (lihat tab <b>Riwayat</b>). <b>Admin</b> bisa ngurus semua villa. <b>Mitra</b> cuma bisa lihat & atur villa miliknya sendiri (villa yang dia tambahin, atau yang kamu tugasin lewat Edit villa). Kamu sendiri masuk pakai password pemilik (ADMIN_PASSWORD di Cloudflare).</p><div id="adl" class="rl"><p class="hint">Memuat…</p></div><div class="row" style="margin-top:12px"><label>Jenis akun<select id="at"><option value="">— Pilih jenis akun —</option><option value="mitra">Mitra / pemilik villa (cuma villanya sendiri)</option><option value="staff">Admin (semua villa)</option></select></label><label>Nama<input id="an" placeholder="misal: Rina" autocomplete="off"></label><label>Password<input id="ap" type="text" placeholder="min. 6 karakter" autocomplete="off"></label><button class="btn primary" id="aa">Tambah / ganti password</button></div><label class="chk" style="margin-top:10px"><input type="checkbox" id="ac"> Boleh lihat kontak pemilik villa</label><div id="ae" class="err"></div></div>':'')+
   '<p class="hint" style="margin:0 2px 18px">Data otomatis dicadangkan tiap kali disimpan.</p>';
  $$('[data-s]',p).forEach(function(i){i.addEventListener('input',function(){var k=i.dataset.s;s[k]=k==='overPct'?num(i.value):i.value;markDirty()});i.addEventListener('change',function(){var k=i.dataset.s;s[k]=k==='overPct'?num(i.value):i.value;markDirty()})});
  $('#so',p).onchange=function(e){s.showOver=e.target.checked;markDirty()};
  if(isOwner())loadAdmins(p);
  function usedSet(){var used={};D.villas.forEach(function(v){(v.photos||[]).forEach(function(x){used[x]=1})});return used}
  api('GET','/api/photo').then(function(r){var u=$('#usage',p);if(!u)return;var tot=r.photos.reduce(function(a,x){return a+x.size},0),used=usedSet(),idle=r.photos.filter(function(x){return !used[x.url]}).length;u.textContent=r.photos.length+' foto · '+(tot/1048576).toFixed(1)+' MB dari 10.240 MB gratis'+(idle?' · '+idle+' foto nganggur':'')}).catch(function(){var u=$('#usage',p);if(u)u.textContent='Nggak bisa ngecek penyimpanan sekarang.'});
  $('#clean',p).onclick=function(){if(dirty){toast('Simpan perubahan dulu, baru bersihin.',4000);return}
    api('GET','/api/photo').then(function(r){var used=usedSet();var junk=r.photos.filter(function(x){return !used[x.url]});if(!junk.length){toast('Nggak ada foto nganggur.');return}
      confirmBox('Hapus '+junk.length+' foto nganggur?','Ini foto yang udah nggak dipakai villa mana pun (misalnya foto yang dulu dihapus dari villa). Nggak bisa dibalikin.','Hapus').then(function(ok){if(!ok)return;junk.reduce(function(pr,x){return pr.then(function(){return api('DELETE','/api/photo?url='+encodeURIComponent(x.url)).catch(function(){})})},Promise.resolve()).then(function(){toast(junk.length+' foto nganggur dihapus.');renderAdmin()})})}).catch(function(e){toast('Gagal: '+e.message)})};
}

/* ================= SAVE ================= */
var saving=false,PHOTO_DEL=[];
function flushPhotoDel(){var q=PHOTO_DEL.splice(0);q.reduce(function(pr,u){return pr.then(function(){return api('DELETE','/api/photo?url='+encodeURIComponent(u)).catch(function(){})})},Promise.resolve())}
function merge3(base,mine,latest){
  var J=function(x){return JSON.stringify(x===undefined?null:x)};
  var out=JSON.parse(JSON.stringify(latest));
  ['settings','highSeason','syncInfo'].forEach(function(k){if(J(mine[k])!==J(base[k]))out[k]=mine[k]});
  ['booked','synced'].forEach(function(k){var b=base[k]||{},m=mine[k]||{},o=out[k]=out[k]||{};
    Object.keys(Object.assign({},b,m)).forEach(function(id){if(J(m[id])!==J(b[id])){if(m[id]&&m[id].length)o[id]=m[id];else delete o[id]}})});
  var bm={},mm={};(base.villas||[]).forEach(function(v){bm[v.id]=v});(mine.villas||[]).forEach(function(v){mm[v.id]=v});
  var res=[];(out.villas||[]).forEach(function(v){var b=bm[v.id],m=mm[v.id];
    if(b&&!m)return;                         // gue hapus
    if(m&&J(m)!==J(b))res.push(m);else res.push(v)});
  (mine.villas||[]).forEach(function(v){if(!bm[v.id]&&!res.some(function(x){return x.id===v.id}))res.push(v)}); // villa baru gue
  out.villas=res;return out;
}
function save(){
  if(saving)return;
  var btn=$('#saveBtn');
  if(!dirty){toast('Nggak ada perubahan baru.');return}
  saving=true;if(btn){btn.disabled=true;btn.textContent='Menyimpan…'}
  var t=todayDS();Object.keys(D.booked).forEach(function(k){D.booked[k]=D.booked[k].filter(function(d){return d>=t});if(!D.booked[k].length)delete D.booked[k]});Object.keys(D.synced||{}).forEach(function(k){D.synced[k]=D.synced[k].filter(function(d){return d>=t});if(!D.synced[k].length)delete D.synced[k]});
  var pk=Object.keys(PRIV_DIRTY),names={};pk.forEach(function(id){var v=D.villas.find(function(x){return x.id===id});names[id]=v?v.name:''});
  api('PUT','/api/data',{rev:REV,data:D}).then(function(r){return (pk.length?api('PUT','/api/private',{villas:PRIV_DIRTY,names:names}).then(function(){PRIV_DIRTY={}}):Promise.resolve()).then(function(){return r})}).then(function(r){REV=r.rev;flushPhotoDel();var newP=isMitra()?D.villas.filter(function(v){return v.status==='pending'&&!DUPS[v.id]}).length:0;loadDups().then(function(){if(isAdminPath())renderAdmin();if(newP)toast('Villa tersimpan & lagi nunggu verifikasi admin. Belum tampil ke tamu sampai disetujui.',5000)});(r.villas||[]).forEach(function(x){var v=D.villas.find(function(y){return y.id===x.id});if(v){v.updatedBy=x.updatedBy;v.updatedAt=x.updatedAt}});save.retry=0;BASE=JSON.parse(JSON.stringify(Object.assign({},D,{rev:REV})));if(isAdminPath())renderAdmin();dirty=false;saving=false;toast('Tersimpan! Website udah update.');var st=$('#st');if(st){st.className='st';st.textContent='Semua tersimpan'}if(btn){btn.disabled=false;btn.innerHTML='Simpan &amp; Publikasikan'}})
  .catch(function(e){
    if(e.status!==409)save.retry=0;
    saving=false;if(btn){btn.disabled=false;btn.innerHTML='Simpan &amp; Publikasikan'}
    if(e.status===409&&!save.retry){save.retry=1;fetch('/api/data',{cache:'no-store'}).then(function(r){return r.json()}).then(function(latest){var mine=JSON.parse(JSON.stringify(D)),base=BASE||{};setData(merge3(base,mine,latest));REV=latest.rev||0;BASE=JSON.parse(JSON.stringify(latest));dirty=true;save()}).catch(function(){save.retry=0;toast('Gagal ambil data terbaru, coba simpan lagi.',4000)});return}
    if(e.status===409)confirmBox('Data udah diubah dari perangkat lain','Muat ulang data terbaru? Perubahan di layar ini yang belum disimpan akan hilang.','Muat ulang').then(function(ok){if(ok){dirty=false;load().then(renderAdmin)}});
    else if(e.status===401){toast('Sesi habis, login lagi ya. Perubahan di layar ini belum tersimpan.',5000);setTok('');renderLogin()}
    else toast('Gagal menyimpan: '+e.message,5000);
  });
}
window.addEventListener('beforeunload',function(e){if(dirty&&isAdminPath()){e.preventDefault();e.returnValue=''}});

function renderLogin(){
  var last='';try{last=localStorage.getItem('pgvName')||''}catch(_){}
  app.innerHTML='<form class="login" id="lf"><img src="'+LOGO+'" alt="" style="height:56px;width:auto;align-self:center;filter:invert(1) brightness(.3)"><h1>Masuk admin</h1><label>Nama<input id="nm" autocomplete="username" required value="'+esc(last)+'" placeholder="Nama kamu"></label><label>Password<input type="password" id="pw" autocomplete="current-password" required></label><button class="btn primary" type="submit">Masuk</button><div id="le" class="err"></div><a href="/" style="font-size:13px">← Ke halaman tamu</a></form>';
  $('#lf').onsubmit=function(e){e.preventDefault();var b=$('#lf button'),nm=$('#nm').value.trim();b.disabled=true;$('#le').textContent='';
    api('POST','/api/login',{name:nm,password:$('#pw').value}).then(function(r){setTok(r.token);try{localStorage.setItem('pgvName',nm)}catch(_){}startAdmin({id:r.id,name:r.name,role:r.role,canSeeOwner:r.canSeeOwner})}).catch(function(er){b.disabled=false;$('#le').textContent=er.status===401?'Nama atau password salah.':er.message})};
}
function loadAdmins(p){
  var box=$('#adl',p);if(!box)return;
  api('GET','/api/admins').then(function(r){
    ACCS=r.admins;box.innerHTML=r.admins.length?r.admins.map(function(a){var nv=D.villas.filter(function(v){return v.ownerAcc===a.id}).length;return '<div class="it"><span>👤 <b>'+esc(a.name)+'</b> <select class="acct" data-ty="'+esc(a.id)+'"><option value="mitra"'+(a.type==='mitra'?' selected':'')+'>Mitra · '+nv+' villa</option><option value="staff"'+(a.type!=='mitra'?' selected':'')+'>Admin (semua villa)</option></select></span>'+(a.type==='mitra'?'<span style="margin-left:auto"></span>':'<label class="chk" style="margin-left:auto;font-size:12.5px"><input type="checkbox" data-co="'+esc(a.id)+'"'+(a.canSeeOwner?' checked':'')+'> lihat kontak pemilik</label>')+'<button class="btn sm danger" data-ad="'+esc(a.id)+'" data-an="'+esc(a.name)+'">Hapus</button></div>'}).join(''):'<p class="hint" style="margin:0">Belum ada akun admin.</p>';
    $$('[data-ty]',p).forEach(function(s){s.onchange=function(){var ty=s.value,nm=(ACCS.find(function(a){return a.id===s.dataset.ty})||{}).name||'';
      confirmBox('Ubah '+nm+' jadi '+(ty==='mitra'?'Mitra':'Admin')+'?',ty==='mitra'?'Dia cuma bisa lihat & atur villa yang ditugasin ke dia. Dia harus login ulang.':'Dia bisa lihat & atur SEMUA villa. Dia harus login ulang.','Ubah').then(function(ok){if(!ok){loadAdmins(p);return}
        api('PATCH','/api/admins',{id:s.dataset.ty,type:ty}).then(function(){toast('Jenis akun '+nm+' diubah.');loadAdmins(p)}).catch(function(e){toast('Gagal: '+e.message);loadAdmins(p)})})}});
    $$('[data-co]',p).forEach(function(c){c.onchange=function(){api('PATCH','/api/admins',{id:c.dataset.co,canSeeOwner:c.checked}).then(function(){toast(c.checked?'Akses kontak pemilik dikasih.':'Akses kontak pemilik dicabut.')}).catch(function(e){c.checked=!c.checked;toast('Gagal: '+e.message)})}});
    $$('[data-ad]',p).forEach(function(b){b.onclick=function(){confirmBox('Hapus akun '+b.dataset.an+'?','Dia langsung nggak bisa masuk lagi. Villa dan riwayatnya tetap aman (villa mitra balik dikelola tim).','Hapus').then(function(ok){if(!ok)return;api('DELETE','/api/admins?id='+encodeURIComponent(b.dataset.ad)).then(function(){toast('Admin dihapus.');loadAdmins(p)}).catch(function(e){toast('Gagal: '+e.message)})})}});
  }).catch(function(e){box.innerHTML='<p class="err">'+esc(e.message)+'</p>'});
  $('#aa',p).onclick=function(){var n=$('#an',p).value.trim(),pw=$('#ap',p).value;$('#ae',p).textContent='';if(!$('#at',p).value){$('#ae',p).textContent='Pilih dulu jenis akunnya: Mitra atau Admin.';return}
    api('POST','/api/admins',{name:n,password:pw,type:$('#at',p).value,canSeeOwner:$('#at',p).value!=='mitra'&&$('#ac',p).checked}).then(function(){$('#an',p).value='';$('#ap',p).value='';toast('Akun '+n+' siap. Kasih tau nama & password-nya ke dia.',4500);loadAdmins(p)}).catch(function(e){$('#ae',p).textContent=e.message})};
}
var L={month:'',by:''};
function paneLog(p){
  var now=new Date(Date.now()+7*3600e3).toISOString().slice(0,7);if(!L.month)L.month=now;
  p.innerHTML='<div class="panel"><h2>Riwayat perubahan</h2><p class="hint">Siapa yang upload foto, ngubah data villa, dan nandain jadwal. Dicatat otomatis tiap kali ada yang klik Simpan.</p><div class="row"><label>Bulan<input type="month" id="lm" value="'+L.month+'" max="'+now+'"></label><label>Admin<select id="lb"><option value="">Semua admin</option></select></label><label>Cari villa<input id="lq" type="search" placeholder="nama villa…" autocomplete="off"></label></div></div><div id="lg"><p class="hint">Memuat…</p></div>';
  var entries=[];
  function draw(){var q=$('#lq',p).value.trim().toLowerCase(),by=L.by;
    var list=entries.filter(function(e){return !by||e.by===by}).map(function(e){var its=e.items.filter(function(i){return !q||String(i.text).toLowerCase().indexOf(q)>=0});return its.length?{e:e,its:its}:null}).filter(Boolean);
    if(!list.length){$('#lg',p).innerHTML='<div class="empty"><b>Belum ada riwayat</b>Nggak ada perubahan yang cocok di bulan ini.</div>';return}
    var day='',h='';list.forEach(function(x){var d=new Date(x.e.at),dl=d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
      if(dl!==day){if(day)h+='</div>';day=dl;h+='<h4 class="lgd">'+esc(dl)+'</h4><div class="panel lgp">'}
      h+='<div class="lgi"><div class="lgt">'+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+'</div><div><span class="badge'+(x.e.role==='owner'?'':' on')+'" style="margin:0 0 4px">'+esc(x.e.by)+'</span><ul>'+x.its.map(function(i){return '<li>'+esc(i.text)+'</li>'}).join('')+'</ul></div></div>'});
    $('#lg',p).innerHTML=h+'</div>'}
  function load(){$('#lg',p).innerHTML='<p class="hint">Memuat…</p>';api('GET','/api/log?month='+L.month).then(function(r){entries=r.entries||[];var names={};entries.forEach(function(e){names[e.by]=1});
    $('#lb',p).innerHTML='<option value="">Semua admin</option>'+Object.keys(names).sort().map(function(n){return '<option'+(n===L.by?' selected':'')+'>'+esc(n)+'</option>'}).join('');draw()}).catch(function(e){$('#lg',p).innerHTML='<p class="err">'+esc(e.message)+'</p>'})}
  $('#lm',p).onchange=function(){L.month=$('#lm',p).value||now;load()};
  $('#lb',p).onchange=function(){L.by=$('#lb',p).value;draw()};
  $('#lq',p).oninput=draw;
  load();
}
function isAdminPath(){return /^\/admin\/?$/.test(location.pathname)}
function load(){return fetch('/api/data',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(setData)}
function route(){
  if(isAdminPath()){if(!TOK){renderLogin();return}api('GET','/api/login').then(startAdmin).catch(function(){setTok('');renderLogin()})}
  else renderGuest();
}
app.innerHTML='<div class="loading">Memuat…</div>';
load().then(route).catch(function(){app.innerHTML='<div class="loading">Gagal memuat data. Coba refresh halaman ini.</div>'});
})();
