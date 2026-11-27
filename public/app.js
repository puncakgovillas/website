(function(){
var APP_VER='20261127e';
var RAW={};
var DEFS={brand:'PuncakGoVillas',tagline:'Pilih tanggal, jumlah orang, dan budget kamu. Kami tampilkan villa yang masih kosong.',wa:'',priceMode:'total',showOver:true,overPct:20};
var D=null,REV=0;
var BASE=null;
function setData(raw){raw=raw||{};REV=raw.rev||0;BASE=JSON.parse(JSON.stringify(raw));var extra={};Object.keys(raw).forEach(function(k){if(['rev','savedAt','settings','villas','booked','highSeason','holidays','synced','syncInfo'].indexOf(k)<0)extra[k]=raw[k]});
  D=Object.assign(extra,{settings:Object.assign({},DEFS,raw.settings||{}),villas:raw.villas||[],booked:raw.booked||{},highSeason:raw.highSeason||[],holidays:Array.isArray(raw.holidays)?raw.holidays:DEF_HOL.map(function(h){return Object.assign({},h)}),synced:raw.synced||{},syncInfo:raw.syncInfo||null})}
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
/* Tanggal merah (libur nasional, SKB 3 Menteri). Bisa ditambah/hapus di admin tab High Season & Tgl Merah. */
var DEF_HOL=[{date:'2026-12-25',label:'Natal'},{date:'2027-01-01',label:'Tahun Baru 2027'},{date:'2027-01-05',label:'Isra Mikraj'},{date:'2027-02-06',label:'Imlek'},{date:'2027-03-08',label:'Nyepi'},{date:'2027-03-10',label:'Idulfitri'},{date:'2027-03-11',label:'Idulfitri'},{date:'2027-03-26',label:'Wafat Yesus Kristus'},{date:'2027-03-28',label:'Paskah'},{date:'2027-05-01',label:'Hari Buruh'},{date:'2027-05-06',label:'Kenaikan Yesus Kristus'},{date:'2027-05-17',label:'Iduladha'},{date:'2027-05-20',label:'Waisak'},{date:'2027-06-01',label:'Hari Lahir Pancasila'},{date:'2027-06-06',label:'Tahun Baru Islam'},{date:'2027-08-15',label:'Maulid Nabi'},{date:'2027-08-17',label:'HUT RI'},{date:'2027-12-25',label:'Natal'},{date:'2027-12-26',label:'Isra Mikraj'}];
function isHol(ds){return (D.holidays||[]).some(function(h){return h.date===ds})}
/* Lebaran: dari H-lebB sampai H+lebA (default H-1 s/d H+5) semua malam pakai harga weekend. H = tanggal 1 Syawal */
function lebDays(){var s=D.settings||{};return {b:s.lebB>=0?+s.lebB:1,a:s.lebA>=0?+s.lebA:5,list:Array.isArray(s.lebaran)?s.lebaran:['2027-03-10']}}
function isLeb(ds){var L=lebDays();return L.list.some(function(h){return ds>=addDays(h,-L.b)&&ds<=addDays(h,L.a)})}
function isXmas(ds){var md=ds.slice(5);return md==='12-24'||md==='12-25'}
/* Jenis harga per MALAM:
   high season (rentang di admin) > Natal (malam 24 & 25 Des = weekend) > Sabtu = weekend >
   Jumat, atau malam sebelum tanggal merah (Minggu–Kamis) = semi weekend > sisanya weekday */
function dayType(ds){var w=dow(ds);
  if(isHigh(ds))return 'high';
  if(isXmas(ds)||isLeb(ds)||w===6)return 'weekend';
  if(w===5||isHol(addDays(ds,1)))return 'semi';
  return 'weekday'}
function isWeekend(ds){var t=dayType(ds);return t==='weekend'||t==='semi'}
function semiPrice(v){if(v.priceSemi)return v.priceSemi;var a=v.priceWeekday,b=v.priceWeekend;if(a&&b)return Math.round((a+b)/2/50000)*50000;return b||a||0}
/* Diskon per villa: v.disc (%) buat malam v.discFrom..v.discTo (kosong = tanpa batas). Sama dengan lib/pricing.js */
function discOn(v,ds){var pc=+v.disc||0;if(pc<=0||pc>=90)return 0;if(v.discFrom&&ds<v.discFrom)return 0;if(v.discTo&&ds>v.discTo)return 0;return pc}
function discActive(v){var pc=+v.disc||0;if(pc<=0||pc>=90)return 0;if(v.discTo&&v.discTo<todayDS())return 0;return pc}
function rate(v,ds){var r=baseRate(v,ds),pc=discOn(v,ds);if(pc&&r.p)return{p:Math.round(r.p*(100-pc)/100/10000)*10000,t:r.t,o:r.p,pc:pc};return r}
function baseRate(v,ds){var t=dayType(ds);
  if(t==='high'){if(v.priceHigh)return{p:v.priceHigh,t:'high'};t=dow(ds)===6||isXmas(ds)||isLeb(ds)?'weekend':(dow(ds)===5||isHol(addDays(ds,1))?'semi':'weekday')}
  if(t==='weekend'&&v.priceWeekend)return{p:v.priceWeekend,t:'weekend'};
  if(t==='weekend'||t==='semi'){var sp=semiPrice(v);if(sp)return{p:sp,t:'semi'}}
  return{p:v.priceWeekday||v.priceWeekend||0,t:'weekday'};
}
function quote(v,ns){var t=0,o=0,pc=0,c={weekday:0,semi:0,weekend:0,high:0};ns.forEach(function(d){var r=rate(v,d);t+=r.p;o+=r.o||r.p;if(r.pc)pc=Math.max(pc,r.pc);c[r.t]++});return{total:t,orig:o,pc:pc,c:c,avg:ns.length?t/ns.length:0}}
function minRate(v){var a=[v.priceWeekday,v.priceSemi,v.priceWeekend,v.priceHigh].filter(function(x){return x>0});return a.length?Math.min.apply(null,a):0}
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
   '<header class="hero" style="background-image:linear-gradient(180deg,rgba(12,34,22,.78) 0%,rgba(12,34,22,.55) 45%,rgba(16,44,28,.75) 100%),url(&quot;'+BG+'&quot;)"><div class="wrap"><div class="logo"><img src="'+LOGO+'" alt="'+esc(s.brand)+'"></div><h1>Cari villa yang kosong<br>di tanggal kamu</h1><p>'+esc(s.tagline)+'</p><div class="htrust"><span>🏡 <b>'+visVillas().length+'</b> villa di Puncak</span><span>🏢 Kantor sendiri di Puncak</span><span>💬 Booking via WhatsApp</span></div></div></header>'+
   promoBanner()+'<main class="wrap"><form id="sf" class="search" novalidate>'+
     '<label>Check-in<input type="date" name="ci" min="'+t+'" value="'+esc(G.ci)+'"></label>'+
     '<label>Check-out<input type="date" name="co" min="'+(G.ci?addDays(G.ci,1):addDays(t,1))+'" value="'+esc(G.co)+'"></label>'+
     '<label>Jumlah orang<div class="stepper"><button type="button" data-step="-1" aria-label="Kurangi">−</button><input name="g" inputmode="numeric" placeholder="0" value="'+esc(G.g)+'"><button type="button" data-step="1" aria-label="Tambah">+</button></div></label>'+
     '<label class="budget"><span>Range budget <span class="opt">(opsional, boleh isi salah satu)</span></span><div class="bud"><span>Rp</span><input name="bmin" inputmode="numeric" placeholder="2.000.000" aria-label="Budget dari" value="'+esc(G.bmin)+'"><em class="dash">–</em><input name="bmax" inputmode="numeric" placeholder="5.000.000" aria-label="Budget sampai" value="'+esc(G.bmax)+'"><select name="bmode"><option value="night"'+(G.bmode==='night'?' selected':'')+'>per malam</option><option value="total"'+(G.bmode==='total'?' selected':'')+'>total</option></select></div></label>'+
     '<button class="btn primary big" type="submit">🔍 Cari Villa</button>'+
     '<div class="qd"><span>Pilih cepat:</span>'+quickDates().map(function(q,i){return '<button type="button" data-qd="'+i+'">'+q[0]+'</button>'}).join('')+'</div>'+
   '</form><section id="res"></section>'+homeSections()+'</main>'+
   '<section class="wrap office"><div class="oc"><img src="'+OFFICE+'" alt="Kantor PuncakGoVillas" loading="lazy"><div class="ot"><span class="k">Kantor kami</span><h2>Bukan cuma online</h2><p>PuncakGoVillas punya kantor sendiri di Puncak, Komplek Bukit Danau Villa Brajamusti. Selain sewa villa, kami juga bisa bantu kebutuhan liburan kamu.</p><div class="chips"><span>Sewa villa</span><span>Catering</span><span>Sewa extra bed</span><span>Obat kolam</span><span>Travel agent</span><span>Travel umroh</span><span>Sewa mobil</span><span>Organ tunggal</span><span>Private DJ</span><span>Balon floaties</span><span>Kambing guling</span></div><a class="btn sm" href="https://maps.app.goo.gl/KjFYkLuF5RmEm21w7" target="_blank" rel="noopener">Lihat di Google Maps</a></div></div></section>'+'<footer class="wrap foot">Harga di atas estimasi. Ketersediaan dan harga final dikonfirmasi lewat WhatsApp.'+(s.wa?' <a href="'+waLink('Halo '+s.brand+', saya mau tanya villa')+'" target="_blank" rel="noopener">Chat admin</a>':'')+'</footer>'+(s.wa?'<a class="fwa" href="'+waLink('Halo '+s.brand+', saya mau tanya villa')+'" target="_blank" rel="noopener" aria-label="Chat WhatsApp"><svg viewBox="0 0 32 32" width="26" height="26" fill="#fff"><path d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.5.7 4.8 2 6.8L3.2 29l6.8-2.1c1.9 1 4 1.6 6.1 1.6 7 0 12.7-5.7 12.7-12.7S23 3 16 3zm0 23.2c-2 0-3.9-.6-5.5-1.6l-.4-.2-4 1.2 1.3-3.9-.3-.4a10.4 10.4 0 1 1 8.9 4.9zm5.7-7.8c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.5 8.5 0 0 1-4.2-3.7c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1.1 2.9 1.2 3.1 2.1 3.2 5.1 4.5c1.9.8 2.6.9 3.6.7.6-.1 1.8-.7 2-1.4s.3-1.3.2-1.4-.3-.2-.6-.3z"/></svg><span>Chat admin</span></a>':'');
  startPromoTimer();
  var f=$('#sf');
  f.ci.addEventListener('change',function(){G.ci=f.ci.value;if(G.ci){f.co.min=addDays(G.ci,1);if(!G.co||G.co<=G.ci){G.co=addDays(G.ci,1);f.co.value=G.co}}});
  f.co.addEventListener('change',function(){G.co=f.co.value});
  f.g.addEventListener('input',function(){f.g.value=f.g.value.replace(/\D/g,'').slice(0,3);G.g=f.g.value});
  $$('[data-step]',f).forEach(function(b){b.addEventListener('click',function(){var v=Math.max(1,num(f.g.value)+Number(b.dataset.step));f.g.value=v;G.g=String(v)})});
  ['bmin','bmax'].forEach(function(k){f[k].addEventListener('input',function(){var v=num(f[k].value);f[k].value=v?v.toLocaleString('id-ID'):'';G[k]=f[k].value})});
  f.bmode.addEventListener('change',function(){G.bmode=f.bmode.value});
  $$('[data-qd]',f).forEach(function(b){b.addEventListener('click',function(){var q=quickDates()[+b.dataset.qd];G.ci=q[1];G.co=q[2];f.ci.value=G.ci;f.co.value=G.co;f.co.min=addDays(G.ci,1);$$('[data-qd]',f).forEach(function(x){x.classList.toggle('on',x===b)});if(!num(f.g.value)){f.g.focus();toast('Tanggal udah dipilih. Isi jumlah orang, lalu Cari Villa');return}f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event('submit',{cancelable:true}))})});
  bindHomeRail();
  f.addEventListener('submit',function(e){e.preventDefault();G.searched=true;search();var r=$('#res');if(r&&r.scrollIntoView)r.scrollIntoView({behavior:'smooth',block:'start'})});
  if(G.searched)search();
}
/* Banner promo (diatur di admin > Pengaturan > Promo). Berlaku sampai akhir hari tanggal "until" (WIB) */
function promoEnd(){var p=D.settings.promo||{};return p.on&&p.title?(p.until?Date.parse(p.until+'T23:59:59+07:00'):Infinity):0}
function promoBanner(){var p=D.settings.promo||{},end=promoEnd();if(!end||end<Date.now())return '';
  return '<section class="wrap promo"><div class="pb"><div class="pt"><span class="k">PROMO</span><b>'+esc(p.title)+'</b>'+(p.text?'<p>'+esc(p.text)+'</p>':'')+(p.until?'<small>Berlaku sampai '+fmtD(p.until,{day:'numeric',month:'long',year:'numeric'})+'</small>':'')+'</div>'+(p.until?'<div class="cd" id="pcd"></div>':'')+'</div></section>'}
var PROMO_T=null;
function startPromoTimer(){clearInterval(PROMO_T);var el=$('#pcd');if(!el)return;var end=promoEnd();function tick(){var ms=end-Date.now();if(!$('#pcd')){clearInterval(PROMO_T);return}if(ms<=0){el.innerHTML='<span><b>Selesai</b></span>';clearInterval(PROMO_T);return}
  var d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5),m=Math.floor(ms%36e5/6e4),sc=Math.floor(ms%6e4/1e3);el.innerHTML=[[d,'Hari'],[h,'Jam'],[m,'Menit'],[sc,'Detik']].map(function(x){return '<span><b>'+String(x[0]).padStart(2,'0')+'</b>'+x[1]+'</span>'}).join('')}tick();PROMO_T=setInterval(tick,1000)}
function visVillas(){return D.villas.filter(function(v){return v&&v.name&&v.active!==false&&!v.status})}
function quickDates(){var t=todayDS(),w=dow(t),sat=addDays(t,(6-w+7)%7||(w===6?0:7));if(w===6)sat=t;var fri=addDays(sat,-1);
  return [['Malam ini',t,addDays(t,1)],['Besok',addDays(t,1),addDays(t,2)],['Weekend ini',w===6||w===0?t:fri,addDays(sat,1)],['Weekend depan',addDays(fri,7),addDays(sat,8)]].map(function(q){if(q[1]<t)q[1]=t;if(q[2]<=q[1])q[2]=addDays(q[1],1);return q})}
function hasF(v,re){return re.test((v.facilities||[]).join(' ')+' '+(v.desc||''))}
function homeSections(){var vs=visVillas(),s=D.settings;
  var cats=[['🏊','Kolam renang','/villa-kolam-renang-puncak',vs.filter(function(v){return hasF(v,/kolam|pool|renang/i)}).length],['👨‍👩‍👧‍👦','Rombongan 50+','/villa-rombongan-puncak',vs.filter(function(v){return capOf(v)>=50}).length],['🎤','Ada karaoke','/villa-karaoke-puncak',vs.filter(function(v){return hasF(v,/karaoke/i)}).length],['💸','Harga hemat','/villa-murah-puncak',0],['🏡','Semua villa','/villa',vs.length]];
  var pick=vs.filter(function(v){return goodPhotos(v).length}).sort(function(a,b){return (discActive(b)-discActive(a))||((b.calAt||'')>(a.calAt||'')?1:-1)}).slice(0,12);
  var mr=function(v){var m=minRate(v),pc=discActive(v);return pc?Math.round(m*(100-pc)/100/10000)*10000:m};
  return '<section class="hs"><div class="hsh"><h2>Cari sesuai kebutuhan</h2></div><div class="cats">'+cats.map(function(c){return '<a href="'+c[2]+'"><i>'+c[0]+'</i><b>'+c[1]+'</b>'+(c[3]?'<span>'+c[3]+' villa</span>':'<span>Termurah dulu</span>')+'</a>'}).join('')+'</div></section>'+
    (pick.length?'<section class="hs"><div class="hsh"><h2>Villa pilihan</h2><a href="/villa">Lihat semua →</a></div><div class="rail" id="rail">'+pick.map(function(v){var ph=goodPhotos(v)[0],pc=discActive(v),sl=villaSlug(v);return '<a class="rc" href="/villa/'+sl+'"><div class="ri"><img src="'+imgSrc(ph)+'" alt="'+esc(v.name)+'" loading="lazy">'+(pc?'<span class="offb">'+pc+'% OFF</span>':'')+'</div><div class="rt"><b>'+esc(v.name)+'</b><span>📍 '+esc(v.location||'Puncak')+'</span><span class="rs">'+(v.bedrooms?'🛏️ '+v.bedrooms+' kamar · ':'')+'👥 '+capOf(v)+' orang</span>'+(minRate(v)?'<em>'+(pc?'<s>'+rp(minRate(v))+'</s>':'')+'mulai <b>'+rp(mr(v))+'</b>/malam</em>':'')+'</div></a>'}).join('')+'</div><div class="rnav"><button type="button" data-rl="-1" aria-label="Geser kiri">‹</button><button type="button" data-rl="1" aria-label="Geser kanan">›</button></div></section>':'')+
    '<section class="hs"><div class="hsh"><h2>Booking cuma 3 langkah</h2><a href="/panduan-booking">Panduan lengkap →</a></div><div class="how"><div><i>📅</i><b>1. Isi tanggal & jumlah orang</b><span>Langsung keluar villa yang masih kosong beserta estimasi harganya.</span></div><div><i>🏡</i><b>2. Pilih villa</b><span>Lihat foto, fasilitas & kalender harga di halaman detail.</span></div><div><i>💬</i><b>3. Chat admin via WhatsApp</b><span>Pesan otomatis keisi. Admin konfirmasi & kunci tanggalnya.</span></div></div></section>'}
function bindHomeRail(){var r=$('#rail');if(!r)return;$$('[data-rl]').forEach(function(b){b.onclick=function(){r.scrollBy({left:+b.dataset.rl*r.clientWidth*0.85,behavior:'smooth'})}})}
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
/* slug halaman detail villa (/villa/<slug>), harus sama persis dengan lib/seo.js */
function slugify(x){return String(x||'').toLowerCase().replace(/\(.*?\)/g,' ').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70)||'villa'}
var SLUGS=null,SLUG_KEY='';
function villaSlug(v){var vis=D.villas.filter(function(x){return x&&x.name&&x.active!==false&&!x.status});var key=vis.map(function(x){return x.id+':'+x.name}).join('|');
  if(!SLUGS||key!==SLUG_KEY){SLUGS={};SLUG_KEY=key;var used={};vis.slice().sort(function(a,b){return a.id<b.id?-1:a.id>b.id?1:0}).forEach(function(x){var b=slugify(x.name);used[b]=(used[b]||0)+1;SLUGS[x.id]=used[b]===1?b:b+'-'+used[b]})}
  return SLUGS[v.id]}
function card(i,ns,g,isOver){
  var v=i.v,q=i.q,s=D.settings,ph=goodPhotos(v);
  var photos=ph.length?'<div class="phw"><div class="ph">'+ph.map(function(p,k){return '<img src="'+imgSrc(p)+'" alt="'+esc(v.name)+' foto '+(k+1)+'" loading="lazy">'}).join('')+'</div>'+(ph.length>1?'<button type="button" class="phb prev" data-ph="-1" aria-label="Foto sebelumnya">‹</button><button type="button" class="phb next" data-ph="1" aria-label="Foto berikutnya">›</button><div class="phn"><span class="phi">1</span>/'+ph.length+' foto</div>':'')+'</div>':'<div class="ph none">'+esc((v.name||'V').charAt(0))+'</div>';
  var parts=[];if(q.c.weekday)parts.push(q.c.weekday+' weekday');if(q.c.semi)parts.push(q.c.semi+' semi weekend');if(q.c.weekend)parts.push(q.c.weekend+' weekend');if(q.c.high)parts.push(q.c.high+' high season');
  var price=s.priceMode==='from'
    ?'<div class="price"><small>mulai dari</small>'+(discActive(v)?'<s class="old">'+rp(minRate(v))+'</s>':'')+'<b>'+rp(discActive(v)?Math.round(minRate(v)*(100-discActive(v))/100/10000)*10000:minRate(v))+'</b><small>per malam</small></div>'
    :'<div class="price"><small>Estimasi '+ns.length+' malam</small>'+(q.orig>q.total?'<s class="old">'+rp(q.orig)+'</s>':'')+'<b>'+rp(q.total)+'</b><small>'+parts.join(' · ')+'</small></div>';
  var offPc=s.priceMode==='from'?discActive(v):q.pc;
  var extra=(v.capStd&&g>v.capStd)?'<div class="note">Lebih dari '+v.capStd+' orang, mungkin ada biaya extra bed.</div>':'';
  var meta=v.location?'📍 '+esc(v.location):'';
  var spec='<div class="spec">'+(v.bedrooms?'<span>🛏️ <b>'+v.bedrooms+'</b> Kamar</span>':'')+(v.bathrooms?'<span>🛁 <b>'+v.bathrooms+'</b> Kamar Mandi</span>':'')+'<span>👥 Maks <b>'+capOf(v)+'</b> orang</span></div>';
  var txt='Halo '+s.brand+', saya mau booking *'+v.name+'*\nCheck-in: '+fmtD(ns[0],{weekday:'long'})+'\nCheck-out: '+fmtD(addDays(ns[ns.length-1],1),{weekday:'long'})+' ('+ns.length+' malam)\nJumlah tamu: '+g+' orang\nMasih available?';
  if(offPc)photos=photos.replace(/^<div class="(phw|ph none)">/,function(m0){return m0+'<span class="offb">'+offPc+'% OFF</span>'});
  return '<article class="vc'+(isOver?' over':'')+'">'+photos+'<div class="vb"><h3>'+esc(v.name)+'</h3>'+(meta?'<div class="meta">'+meta+'</div>':'')+spec+
    ((v.facilities||[]).length?'<div class="chips">'+v.facilities.map(function(f){return '<span>'+esc(f)+'</span>'}).join('')+'</div>':'')+
    (v.desc?'<p class="desc">'+esc(v.desc)+'</p>':'')+extra+
    '<div class="vf">'+price+'<div class="row" style="gap:8px">'+(villaSlug(v)?'<a class="btn" href="/villa/'+villaSlug(v)+'">Detail</a>':'')+(s.wa?'<a class="btn wa" target="_blank" rel="noopener" href="'+waLink(txt)+'">Booking via WhatsApp</a>':'')+'</div></div></div></article>';
}

/* ================= ADMIN ================= */
var A={tab:'villa',month:todayDS().slice(0,7),q:''};
function matchQ(v){var q=A.q.trim().toLowerCase();return !q||String(v.name||'').toLowerCase().indexOf(q)>=0||String(v.location||'').toLowerCase().indexOf(q)>=0}
/* Auto save: tiap ada perubahan, otomatis disimpan 2 detik setelah perubahan terakhir */
var CHG=0,AUTO_T=null,RETRY_T=null;
function setSt(cls,txt){var st=$('#st');if(st){st.className='st'+(cls?' '+cls:'');st.textContent=txt}}
function markDirty(){dirty=true;CHG++;setSt('d','Menyimpan otomatis…');scheduleSave(2000)}
function scheduleSave(ms){clearTimeout(AUTO_T);clearTimeout(RETRY_T);AUTO_T=setTimeout(function(){if(dirty&&USER)save(true)},ms)}
function busyTyping(){var a=document.activeElement;return !!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))||!!document.querySelector('.modal')}
function renderAdmin(){
  app.innerHTML='<div class="abar"><div class="wrap"><span class="t">Admin · '+esc(D.settings.brand)+'</span><span class="who">👤 '+esc(USER?USER.name:'')+(isOwner()?' (Pemilik)':isMitra()?' (Mitra)':' (Admin)')+'</span><span id="st" class="st'+(dirty?' d':'')+'">'+(dirty?'Menyimpan otomatis…':'✓ Semua tersimpan otomatis')+'</span><a href="/" target="_blank">Lihat halaman tamu</a><a href="#" id="logout">Keluar</a><button class="btn" id="saveBtn" title="Perubahan udah disimpan otomatis. Tombol ini buat nyimpen sekarang juga.">Simpan sekarang</button></div></div>'+
   '<div class="wrap"><div class="tabs">'+(isMitra()?[['villa','Villa Saya'],['cal','Jadwal'+(staleList().length?' ⚠️'+staleList().length:'')]]:[['villa','Villa'],['dup','Verifikasi'+(pendingCount()?' ('+pendingCount()+')':'')],['cal','Tanggal Terisi'+(staleList().length?' ⚠️'+staleList().length:'')],['hs','High Season & Tgl Merah'],['set','Pengaturan']]).concat(isOwner()?[['log','Riwayat']]:[]).map(function(t){return '<button data-tab="'+t[0]+'" class="'+(A.tab===t[0]?'on':'')+'">'+t[1]+'</button>'}).join('')+'</div>'+staleBanner()+'<div id="pane"></div></div>';
  $$('[data-tab]').forEach(function(b){b.addEventListener('click',function(){A.tab=b.dataset.tab;renderAdmin()})});
  $('#saveBtn').addEventListener('click',function(){save(false)});
  $('#logout').onclick=function(e){e.preventDefault();if((dirty||saving)&&!window.confirm('Perubahan terakhir lagi disimpan. Tunggu sampai tulisan "Tersimpan otomatis" muncul, atau tetap keluar?'))return;setTok('');USER=null;PRIV={};PRIV_DIRTY={};dirty=false;renderLogin()};
  bindStale();
  var p=$('#pane');
  if(A.tab==='villa')paneVilla(p);else if(A.tab==='cal')paneCal(p);else if(A.tab==='hs'&&!isMitra())paneHS(p);else if(A.tab==='dup'&&!isMitra())paneDup(p);else if(A.tab==='log'&&isOwner())paneLog(p);else if(!isMitra())paneSet(p);else paneVilla(p);
}

function paneVilla(p){
  var VF={all:function(){return true},show:function(v){return !v.status&&v.active!==false},hide:function(v){return !v.status&&v.active===false},pend:function(v){return v.status==='pending'},rej:function(v){return v.status==='rejected'},disc:function(v){return discActive(v)>0}};
  if(!VF[A.vf])A.vf='all';
  function chips(){var L=[['all','Semua'],['show','✅ Tampil'],['hide','🙈 Disembunyikan'],['pend','⏳ Menunggu verifikasi'],['rej','❌ Ditolak'],['disc','🏷️ Lagi diskon']];
    return L.map(function(c){var n=myVillas().filter(VF[c[0]]).length;if(!n&&c[0]!=='all'&&c[0]!=='show'&&c[0]!=='hide'&&A.vf!==c[0])return '';return '<button type="button" class="vfc'+(A.vf===c[0]?' on':'')+'" data-vf="'+c[0]+'">'+c[1]+' <b>'+n+'</b></button>'}).join('')}
  function rows(){return myVillas().filter(VF[A.vf]).filter(matchQ).map(function(v){
    var gp=goodPhotos(v),th=gp[0]?'<img src="'+gp[0]+'" alt="" loading="lazy">':'<div class="th">'+esc((v.name||'V').charAt(0))+'</div>';
    return '<div class="vi">'+th+'<div class="inf"><b>'+esc(v.name)+(v.status?'':'<span class="badge'+(v.active!==false?' on':'')+'">'+(v.active!==false?'Tampil':'Disembunyikan')+'</span>')+statusBadge(v)+(!isMitra()&&v.ownerAcc?'<span class="badge mit">Mitra'+(accName(v.ownerAcc)?': '+esc(accName(v.ownerAcc)):(isOwner()?': akun dihapus':''))+'</span>':'')+'</b><span>'+(v.bedrooms||'-')+' kamar · '+(v.capStd||'-')+'–'+capOf(v)+' orang · WD '+rp(v.priceWeekday)+' · WE '+rp(v.priceWeekend)+(v.priceHigh?' · HS '+rp(v.priceHigh):'')+'</span>'+(canOwner()&&PRIV[v.id]&&(PRIV[v.id].ownerName||PRIV[v.id].ownerPhone)?'<span class="own">🔒 Pemilik: <b>'+esc(PRIV[v.id].ownerName||'-')+'</b>'+(PRIV[v.id].ownerPhone?' · <a href="'+waOwner(PRIV[v.id].ownerPhone)+'" target="_blank" rel="noopener">'+esc(PRIV[v.id].ownerPhone)+'</a>':'')+'</span>':'')+(v.status==='pending'&&isMitra()?'<span class="upd">'+(DUPS[v.id]&&DUPS[v.id].possibleDup?'⚠️ Villa ini kemungkinan sudah terdaftar. Admin PuncakGoVillas lagi ngecek dulu.':'Belum tampil ke tamu sampai disetujui admin.')+'</span>':'')+(v.status==='pending'&&!isMitra()?'<span class="upd"><a href="#" data-gover>⏳ Belum tampil ke tamu · cek di tab Verifikasi</a></span>':'')+(v.status==='rejected'?'<span class="upd">Ditolak'+(v.rejectNote?': '+esc(v.rejectNote):'')+'</span>'+(v.photosCleaned?'<span class="upd">🗑️ Fotonya udah dihapus otomatis '+fmtTime(v.photosCleaned)+'</span>':(v.rejectedAt&&(v.photos||[]).length?'<span class="upd">🗑️ Foto dihapus otomatis mulai '+fmtD(toDS(Date.parse(v.rejectedAt)+30*864e5))+'</span>':'')):'')+(v.updatedBy?'<span class="upd">Terakhir diubah <b>'+esc(v.updatedBy)+'</b> · '+fmtTime(v.updatedAt)+'</span>':'')+'</div><div class="act"><button class="btn sm" data-edit="'+v.id+'">Edit</button>'+(v.status==='rejected'&&!isMitra()?'<button class="btn sm danger" data-purge="'+v.id+'">Hapus permanen</button>':'<button class="btn sm danger" data-del="'+v.id+'">Hapus</button>')+'</div></div>';
  }).join('')}
  p.innerHTML='<div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><div><h2>'+(isMitra()?'Villa Saya':'Daftar Villa')+' ('+myVillas().length+')</h2><p class="hint" style="margin:0">Data villa yang tampil ke tamu.</p></div><div class="row">'+'<button class="btn" id="bulkV">Upload Folder / PDF</button>'+(isMitra()?'':'<button class="btn" id="impV">Import Excel</button>')+'<button class="btn primary" id="addV">+ Tambah Villa</button></div></div>'+'<div class="srch" style="margin-top:14px"><input id="vq" type="search" placeholder="🔍 Cari nama villa atau lokasi…" value="'+esc(A.q)+'" autocomplete="off"></div><div class="vfs" id="vfs">'+chips()+'</div>'+'<div class="vl" id="vl" style="margin-top:14px"></div></div>';
  function fill(){var h=rows();$('#vfs',p).innerHTML=chips();$$('[data-vf]',p).forEach(function(b){b.onclick=function(){A.vf=b.dataset.vf;fill()}});$('#vl',p).innerHTML=h||(myVillas().length?'<p class="hint">Nggak ada villa yang cocok'+(A.vf!=='all'?' di filter ini':'')+'.</p>':'<div class="empty"><b>Belum ada villa</b>Klik "Tambah Villa" buat mulai'+(isMitra()?' upload villa kamu.':' (atau "Import Excel").')+'</div>');bind()}
  var vq=$('#vq',p);if(vq)vq.addEventListener('input',function(){A.q=vq.value;fill()});
  $('#addV').addEventListener('click',function(){editVilla(null)});
  if($('#impV'))$('#impV').addEventListener('click',importExcel);
  if($('#bulkV'))$('#bulkV').addEventListener('click',bulkUpload);
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
  if(dirty){$('#dl',p).innerHTML='<div class="note">Lagi nyimpen perubahan otomatis… daftar ini muncul sebentar lagi.</div>';return}
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
/* ===== Upload massal: pilih FOLDER (subfolder per villa) atau beberapa file PDF villa ===== */
var PDFJS_P=null;
function loadPDFJS(){if(!PDFJS_P)PDFJS_P=import('/vendor/pdfjs/pdf.min.mjs').then(function(m){m.GlobalWorkerOptions.workerSrc='/vendor/pdfjs/pdf.worker.min.mjs';return m}).catch(function(e){PDFJS_P=null;throw e});return PDFJS_P}
var BU_LOCS=['Cisarua','Ciloto','Kota Bunga','Cipanas','Hanjawar','Cimacan','Megamendung','Tugu','Cibodas','Puncak Resort','Pacet','Sindanglaya','Gadog','Ciburial','Safari','Puncak'];
function buNum(s){s=String(s||'').replace(/^[.,]+|[.,]+$/g,'');if(/^\d{1,3}([.,]\d{3})+$/.test(s)||/^\d+$/.test(s))return parseInt(s.replace(/\D/g,''),10)||0;var g=s.split(/[.,]/);if(g.length>=2&&/^\d+$/.test(g[0]))return parseInt(g[0],10)*1e6+parseInt((g[1]+'0').charAt(0),10)*1e5;return parseInt(s.replace(/\D/g,''),10)||0}
/* Nama villa dari nama file/folder: buang angka harga di depan, (N Kamar), PGV, Copy, dst */
function buName(raw){var s=String(raw||'').replace(/\.[a-z0-9]+$/i,'');
  var kam=(s.match(/(\d+)\s*kamar/i)||[])[1];
  s=s.replace(/^\s*\d+([.,]\d*)?\s*(juta|jt)?\s*[-.,]?\s*/i,'').replace(/\([^)]*\)?/g,' ').replace(/\b\d+\s*kamar\b/ig,' ')
     .replace(/\b(pgv|copy|new|ok|nataru|malam|npf)\b/ig,' ').replace(/\s+-\s*$/,'').replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
  s=s.replace(/^vila\b/i,'Villa');if(!/^villa\b/i.test(s))s='Villa '+s;s=s.replace(/^villa\b/i,'Villa');
  return {name:s,kamar:kam?+kam:0,price:(String(raw).match(/^\s*(\d+)[.,]?(\d)?/)||[])}}
function buKey(n){return String(n||'').toLowerCase().replace(/\(.*?\)/g,'').replace(/\b(villa|vila|pgv)\b/g,'').replace(/[^a-z0-9]/g,'')}
/* Baca teks halaman PDF jadi baris-baris (urut atas ke bawah) */
function buPageLines(page){return page.getTextContent().then(function(tc){var rows=[];tc.items.forEach(function(it){if(!it.str||!it.str.trim())return;var y=Math.round(it.transform[5]),x=it.transform[4];var r=rows.find(function(r){return Math.abs(r.y-y)<=3});if(!r){r={y:y,it:[]};rows.push(r)}r.it.push({x:x,w:it.width||0,s:it.str})});
  rows.sort(function(a,b){return b.y-a.y});return rows.map(function(r){r.it.sort(function(a,b){return a.x-b.x});var out='',end=null,cols=[];r.it.forEach(function(t){if(end!==null&&t.x-end>25){cols.push(out);out=''}out+=(out&&end!==null&&t.x-end>1.5?' ':'')+t.s;end=t.x+t.w});cols.push(out);return cols.map(function(c){return c.trim()}).filter(Boolean)})})}
function buParse(lines,fileName){var o={kamar:0,mandi:0,kap:0,wd:0,we:0,semi:0,lok:'',fas:[],flat:false};
  var left=lines.map(function(c){return c[0]||''}),all=lines.map(function(c){return c.join('   ')}).join('\n'),flat=lines.map(function(c){return c.join(' ')}).join(' ').replace(/\s+/g,' ');
  var re=/rp\.?\s*([\d.,]{7,})(?:(?!rp)[^]){0,40}?(w[e]{1,2}k\s*e{1,2}nd|w[e]{1,2}k\s*days?|semi\s*w[e]{1,2}k\s*e{1,2}nd)/gi,m;
  while((m=re.exec(flat))){var v=buNum(m[1]),t=m[2].toLowerCase();if(v<500000||v>1e8)continue;if(/semi/.test(t))o.semi=o.semi||v;else if(/end/.test(t))o.we=o.we||v;else o.wd=o.wd||v}
  if(!o.wd||!o.we){for(var i=0;i<lines.length;i++){var h=lines[i];if(h.some(function(x){return /^wee?k\s*days?$/i.test(x)})){var n=lines[i+1]||[];h.forEach(function(x,k){var v=n[k]&&/rp/i.test(n[k])?buNum(n[k].split('/')[0].replace(/[^\d.,]/g,'')):0;if(!v)return;if(/^wee?k\s*days?/i.test(x))o.wd=o.wd||v;else if(/semi/i.test(x))o.semi=o.semi||v;else if(/wee?k\s*e{1,2}nd/i.test(x))o.we=o.we||v})}}}
  if(!o.wd&&!o.we&&(m=/harga\s*rp\.?\s*([\d.,]{7,})/i.exec(flat))){o.wd=o.we=buNum(m[1]);o.flat=true}
  if((m=/(\d+)\s*kamar\s*tidur/i.exec(all)))o.kamar=+m[1];
  if((m=/(\d+)\s*kamar\s*mandi/i.exec(all)))o.mandi=+m[1];
  if((m=/max(?:imal|s)?\.?\s*(\d+)\s*(?:orang|org|pax|person)/i.exec(all)||/kapasitas\s*:?\s*(\d+)/i.exec(all)||/(\d+)\s*(?:orang|org)\b/i.exec(all)))o.kap=+m[1];
  for(var j=0;j<left.length;j++){var s=left[j];if(/harga|rp\s*\d|wee?k\s*day|fasilitas/i.test(s))break;var lm=/lokasi\s*:?\s*(.+)$/i.exec(s);if(lm){o.lok=lm[1];break}
    var hit=BU_LOCS.find(function(k){return new RegExp('\\b'+k+'\\b','i').test(s)});if(hit){var part=s.split(/,|kamar\s*[-–]/i).pop().trim();o.lok=new RegExp(hit,'i').test(part)?part:s.slice(s.toLowerCase().indexOf(hit.toLowerCase()));break}}
  o.lok=o.lok.replace(/\s*[–—-]\s*/g,' - ').replace(/kami pun menyediakan.*$/i,'').replace(/\s+/g,' ').replace(/^[\s,.-]+|[\s,.-]+$/g,'').slice(0,60);
  var st=0;
  if(st>=0){all.slice(st).split('\n').forEach(function(l){l.split(/\s{3,}/).forEach(function(c){c=c.trim();if(!/^[•·▪●○✓✔√\-−–*-]/.test(c))return;var it=c.replace(/^[•·▪●○✓✔√\-−–*-\s]+/,'').replace(/[.,"”]+$/,'').trim();
    if(!it||/rp|=|klik|http|catering|catring|kambing|organ|orgen|extra b|balon|testimoni|menyediakan|layanan|^\d+\.|instagram|tiktok|youtube|^wa /i.test(it))return;if(/^\d+\s*kamar\s*(tidur|mandi)|^max|^\d+\s*lantai$|^kapasitas|^fasilitas/i.test(it))return;
    it=it.replace(/,?\s*max\s*\d+.*$/i,'').replace(/[,\/]/g,' ').replace(/\s+/g,' ').trim();if(it&&o.fas.map(function(x){return x.toLowerCase()}).indexOf(it.toLowerCase())<0)o.fas.push(it)})})}
  /* Desain spek baru: fasilitas berupa daftar/kotak tanpa tanda bullet. Ambil semua sel teks di bawah judul "Fasilitas" sampai ketemu judul lain */
  var fi=o.fas.length>=3?-2:-1;if(fi===-1)lines.forEach(function(c,k){if(fi<0&&c.some(function(x){return /^fasilitas\b/i.test(x)}))fi=k});
  if(fi>=0){for(var q=fi;q<lines.length;q++){var stop=false;lines[q].forEach(function(cell){
      cell.split(/\s{2,}|\s*[•·▪●○✓✔√|]\s*/).forEach(function(c){c=c.replace(/^fasilitas\s*(villa)?\s*:?/i,'').replace(/^[\-−–*\ue000-\uf8ff\s]+/,'').replace(/[.,"”:]+$/,'').trim();
        if(q>fi&&/^(layanan|tambahan|harga|catatan|note|hubungi|kontak|contact|booking|reservasi|syarat|ketentuan|check.?in|alamat|lokasi|kapasitas|weekday|weekend)\b/i.test(c)){stop=true;return}
        if(!c||c.length<3||c.length>40||/rp|=|\d{3,}|http|@|klik|instagram|tiktok|youtube|wa\b|^\d+\.|catering|catring|kambing|organ|orgen|extra b|balon|^max|^\d+\s*(kamar|orang|lantai)|^fasilitas|puncakgovillas|kami pun|menyediakan|testimoni|pembayaran|^cek\b/i.test(c))return;
        c=c.replace(/\s+/g,' ');if(o.fas.map(function(x){return x.toLowerCase()}).indexOf(c.toLowerCase())<0)o.fas.push(c)})});if(stop)break}}
  if(!o.we){var fp=/^\s*(\d{1,2})(?:[.,](\d)(?!\d)|\s*(?:jt|juta))/i.exec(fileName||'');if(fp&&+fp[1]<50&&(fp[2]||/jt|juta/i.test(fp[0]))){o.we=+fp[1]*1e6+(+(fp[2]||0))*1e5;o.weGuess=true}}
  return o}
/* Buka PDF: ambil data dari halaman terakhir yang ada harganya; halaman lain = foto */
function buReadPDF(file){return loadPDFJS().then(function(pdfjs){return file.arrayBuffer().then(function(buf){return pdfjs.getDocument({data:buf,isOffscreenCanvasSupported:false,isImageDecoderSupported:false,useSystemFonts:true}).promise}).then(function(doc){
  var n=doc.numPages,specPage=n,tries=[n,n-1,n-2].filter(function(x){return x>=1});
  function tryPage(k){if(k>=tries.length)return Promise.resolve(null);return doc.getPage(tries[k]).then(buPageLines).then(function(lines){var txt=lines.map(function(c){return c.join(' ')}).join(' ');if(/rp\s*[\d.]{6}|kamar\s*tidur|fasilitas/i.test(txt)){specPage=tries[k];return lines}return tryPage(k+1)})}
  return tryPage(0).then(function(lines){if(lines)return lines;
    /* PDF hasil scan / gambar semua: halaman spek dibaca pakai OCR */
    return buOcrPage(doc,n).then(function(L){var txt=L.map(function(c){return c.join(' ')}).join(' ');if(/rp\s*[\d.]{6}|kamar|fasilitas/i.test(txt)){specPage=n;return L}return null},function(e){console.warn('OCR gagal',e);return null})}).then(function(lines){var photoPages=[];for(var p=1;p<=n;p++)if(p!==specPage)photoPages.push(p);return {doc:doc,lines:lines||[],photoPages:photoPages}})})})}
var TESS_P=null;
function loadTess(){if(!TESS_P)TESS_P=new Promise(function(res,rej){if(window.Tesseract)return res(window.Tesseract);var sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';sc.onload=function(){window.Tesseract?res(window.Tesseract):rej(new Error('OCR'))};sc.onerror=function(){TESS_P=null;rej(new Error('OCR nggak kebuka'))};document.head.appendChild(sc)});return TESS_P}
function buOcrPage(doc,p){return Promise.all([loadTess(),buRenderPage(doc,p,1800)]).then(function(x){var T=x[0],blob=x[1];return T.recognize(blob,'ind').then(function(r){var d=r.data||{},W=0;(d.words||[]).forEach(function(w){W=Math.max(W,w.bbox.x1)});var gap=Math.max(30,W*0.035);
  return (d.lines||[]).map(function(ln){var ws=(ln.words||[]).filter(function(w){return w.text&&w.text.trim()}),cols=[],cur='',end=null;
    ws.forEach(function(w,k){if(end!==null&&w.bbox.x0-end>gap){cols.push(cur);cur=''}var t=w.text.trim();
      if(!cur&&k<ws.length-1&&/^([“”"'‘’«»•·*~✓✔√-]+[vVY]?|[vVY]{1,2}|[vVY]\W)$/.test(t)){end=w.bbox.x1;return}cur+=(cur?' ':'')+t;end=w.bbox.x1});cols.push(cur);
    return cols.map(function(c){return c.replace(/\bBBO\b/g,'BBQ').trim()}).filter(function(c){return c.length>1})}).filter(function(c){return c.length})})})}
function buRenderPage(doc,p,max){max=max||1280;return doc.getPage(p).then(function(page){var v=page.getViewport({scale:1}),sc=Math.min(3,max/Math.max(v.width,v.height)),vp=page.getViewport({scale:sc}),c=document.createElement('canvas');c.width=Math.round(vp.width);c.height=Math.round(vp.height);
  return page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise.then(function(){return new Promise(function(res,rej){c.toBlob(function(b){c.width=c.height=0;try{page.cleanup()}catch(e){}b?res(b):rej(new Error('render'))},'image/jpeg',max<600?0.7:0.8)})})})}

/* ===== Pilih foto otomatis pakai AI (CLIP, jalan di browser) =====
   Utamakan: kolam renang, ruang tengah, halaman/view, fasilitas (billiard/karaoke), kamar tidur. Kamar mandi & halaman teks dihindari. */
var CLIP_P=null;
var BU_LABELS=[
  ['pool','a photo of a swimming pool at a villa'],
  ['living','a photo of a living room with sofas'],
  ['view','a photo of a garden lawn or mountain view outside a villa'],
  ['view','a photo of the front of a villa building'],
  ['facility','a photo of a billiard pool table'],
  ['facility','a photo of a karaoke room with a TV and speakers'],
  ['facility','a photo of a gazebo or playground'],
  ['kitchen','a photo of a kitchen or dining table'],
  ['bedroom','a photo of a bedroom with a bed'],
  ['bathroom','a photo of a bathroom with a toilet or shower'],
  ['text','a page with text, prices and a list of facilities']];
function loadClip(onProg){if(!CLIP_P)CLIP_P=import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2').then(function(t){t.env.allowLocalModels=false;
  var opt={quantized:true,progress_callback:function(x){if(onProg&&x&&x.status==='progress'&&x.file&&/onnx/.test(x.file))onProg(Math.round(x.progress||0))}};
  t.env.remoteHost=location.origin+'/hf/';
  return t.pipeline('zero-shot-image-classification','Xenova/clip-vit-base-patch32',opt).catch(function(){t.env.remoteHost='https://huggingface.co/';return t.pipeline('zero-shot-image-classification','Xenova/clip-vit-base-patch32',opt)})}).catch(function(e){CLIP_P=null;throw e});return CLIP_P}
function buClassify(clf,url){return clf(url,BU_LABELS.map(function(l){return l[1]})).then(function(out){var best={};out.forEach(function(o){var cat=BU_LABELS.find(function(l){return l[1]===o.label})[0];best[cat]=Math.max(best[cat]||0,o.score)});var top=Object.keys(best).sort(function(a,b){return best[b]-best[a]})[0];return {cat:top,score:best[top],all:best}})}
/* Ciri warna sederhana (cadangan kalau AI nggak kebuka): air/taman (outdoor) & putih-abu polos (kamar mandi marmer / halaman teks) */
function buFeat(blob){return new Promise(function(res){var u=URL.createObjectURL(blob),im=new Image();im.onload=function(){var c=document.createElement('canvas');c.width=64;c.height=48;var x=c.getContext('2d');x.drawImage(im,0,0,64,48);URL.revokeObjectURL(u);
  var d=x.getImageData(0,0,64,48).data,n=d.length/4,cy=0,gr=0,wh=0;for(var i=0;i<d.length;i+=4){var r=d[i],g=d[i+1],b=d[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b);if(g>r+12&&b>r+5&&g>90)cy++;if(g>r+15&&g>b+15)gr++;if(mx-mn<12&&r>140)wh++}
  res({out:(cy+gr)/n,wh:wh/n})};im.onerror=function(){URL.revokeObjectURL(u);res({out:0,wh:0})};im.src=u})}
var BU_CATN={pool:'kolam',living:'ruang tengah',view:'view/halaman',facility:'fasilitas',kitchen:'dapur',bedroom:'kamar',bathroom:'kamar mandi',text:'teks',auto:'otomatis'};
/* items urut sesuai PDF/folder. thumb(i) -> Promise<Blob kecil>. Balikin {idx:[index terpilih], cats:[kategori], ai:true/false, err} */
function buPickPhotos(items,slots,thumb,onStat){
  var feats=[],res=[],clf=null,err='';
  if(items.length<=slots)return Promise.resolve({idx:items.map(function(_,i){return i}),cats:[],ai:false});
  function fallback(){var n=items.length,bad=function(k){return feats[k]&&feats[k].wh>0.33},ok=[];for(var k=0;k<n;k++)if(!bad(k))ok.push(k);if(ok.length<slots)ok=items.map(function(_,i){return i});
    var outd=function(k){return feats[k]&&feats[k].out>0.12},out=ok.filter(outd).sort(function(a,b){return feats[b].out-feats[a].out}).slice(0,1);
    var rest=ok.filter(function(k){return !outd(k)});if(rest.length<slots-out.length)rest=ok.filter(function(k){return out.indexOf(k)<0});var need=slots-out.length;for(var j=0;j<need&&rest.length;j++){var k2=rest[Math.round(j*(rest.length-1)/Math.max(1,need-1))];if(out.indexOf(k2)<0)out.push(k2)}
    rest.forEach(function(k){if(out.length<slots&&out.indexOf(k)<0)out.push(k)});return out.slice(0,slots)}
  var phone=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent||'');
  return (phone?Promise.reject(new Error('di HP pakai cara biasa (AI cuma di laptop)')):loadClip(function(pct){onStat&&onStat('download AI pemilih foto '+pct+'% (sekali aja)…')})).then(function(c){clf=c},function(e){err=(e&&e.message)||String(e);console.warn('AI foto gagal',e)}).then(function(){var i=0;
    function next(){if(i>=items.length)return Promise.resolve();var k=i++;onStat&&onStat((clf?'AI milih foto ':'milih foto ')+(k+1)+'/'+items.length+'…');
      return thumb(k).then(function(b){return buFeat(b).then(function(f){feats[k]=f;if(!clf)return;var u=URL.createObjectURL(b);return buClassify(clf,u).then(function(r){URL.revokeObjectURL(u);res[k]=r},function(e){URL.revokeObjectURL(u);console.warn(e)})})}).catch(function(){}).then(next)}
    return next()}).then(function(){
      if(!clf||!res.some(Boolean))return {idx:fallback(),cats:[],ai:false,err:err||'AI gagal baca foto'};
      var want=['pool','living','view','facility','bedroom','pool','facility','bedroom','view','kitchen','living'],used={},out=[],cats=[];
      want.forEach(function(cat){if(out.length>=slots)return;var cand=-1,bs=-1;res.forEach(function(r,k){if(!r||used[k]||r.cat!==cat)return;if(r.score>bs){bs=r.score;cand=k}});if(cand>=0){used[cand]=1;out.push(cand);cats.push(cat)}});
      if(out.length<slots)res.forEach(function(r,k){if(out.length<slots&&r&&!used[k]&&r.cat!=='text'&&r.cat!=='bathroom'){used[k]=1;out.push(k);cats.push(r.cat)}});
      return {idx:out,cats:cats,ai:true}})}
var BU_IMG=/\.(jpe?g|png|webp|gif|bmp)$/i;
function buThumb(file){return new Promise(function(res,rej){var u=URL.createObjectURL(file),im=new Image();im.onload=function(){var s=Math.min(1,384/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(function(b){b?res(b):rej()},'image/jpeg',0.7)};im.onerror=function(){URL.revokeObjectURL(u);rej()};im.src=u})}
function buNatSort(a,b){return a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'})}
/* Kelompokkan file jadi daftar villa */
function buGroup(files,mode){var groups=[];
  if(mode==='pdf'){files.filter(function(f){return /\.pdf$/i.test(f.name)}).forEach(function(f){groups.push({src:f.name,label:f.name,pdf:f,imgs:[],skipped:[]})});return groups}
  var map={};files.forEach(function(f){var rp=(f.webkitRelativePath||f.name).split('/');if(/^\./.test(rp[rp.length-1]))return;var di=rp.length-2;if(di>0&&/^(foto|fotos|photo|photos|img|images|gambar|pict|pictures)$/i.test(rp[di]))di--;var key=rp[Math.max(0,di)];var g=map[key];if(!g){g=map[key]={src:key,label:key,pdf:null,imgs:[],skipped:[]};groups.push(g)}
    if(BU_IMG.test(f.name))g.imgs.push(f);else if(/\.pdf$/i.test(f.name)){if(!g.pdf)g.pdf=f}else if(/\.(heic|heif)$/i.test(f.name))g.skipped.push(f.name)});
  groups.forEach(function(g){g.imgs.sort(buNatSort)});return groups.filter(function(g){return g.imgs.length||g.pdf})}
function buMitras(){return isOwner()?ACCS.filter(function(a){return a.type==='mitra'}):[]}
function buAccSel(i,g){var ms=buMitras();if(!ms.length)return '';if(g.acc===undefined)g.acc=g.match&&g.match.ownerAcc||'';
  return '<select data-acc="'+i+'" title="Dikelola akun" style="width:auto;max-width:180px"><option value="">Dikelola: Tim admin</option>'+ms.map(function(a){return '<option value="'+esc(a.id)+'"'+(g.acc===a.id?' selected':'')+'>Dikelola: '+esc(a.name)+'</option>'}).join('')+'</select>'}
function bulkUpload(){
  if(isOwner()&&!ACCS.length)loadAccs();
  fetch('/version.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){if(j&&j.v&&j.v!==APP_VER&&window.confirm('Ada versi baru fitur upload. Muat ulang halaman dulu ya (data yang udah kesimpen aman).'))location.reload()}).catch(function(){});
  var m=modal('<h2>Upload villa dari folder / PDF</h2>'+
    '<p class="hint">Pilih salah satu:<br>• <b>Folder</b>: satu folder besar yang isinya <b>subfolder per villa</b> (nama subfolder = nama villa). Isinya foto (JPG/PNG), boleh ada PDF villanya juga buat ambil data.<br>• <b>PDF</b>: pilih beberapa file PDF villa sekaligus (kayak PDF yang biasa dikirim ke tamu). Nama villa diambil dari nama file, foto dari halaman-halamannya, data (kamar, kapasitas, harga, fasilitas) dari halaman terakhir.</p>'+
    '<div class="row" style="gap:8px;margin:6px 0 12px"><button class="btn" id="buF">📁 Pilih folder</button><button class="btn" id="buP">📄 Pilih file PDF</button><input type="file" id="buFi" webkitdirectory directory multiple hidden><input type="file" id="buPi" accept="application/pdf,.pdf" multiple hidden></div>'+
    '<div id="buO" style="display:none"><label style="flex-direction:row;align-items:center;gap:8px;font-weight:600;color:var(--ink)">Foto buat villa yang udah ada: <select id="buPh" style="width:auto"><option value="add">Tambahin (sampai maks 6)</option><option value="replace">Ganti foto lama</option><option value="keep">Jangan ubah foto</option></select></label><label style="flex-direction:row;align-items:center;gap:8px;font-weight:600;color:var(--ink);margin-top:8px">Data buat villa yang udah ada: <select id="buDt" style="width:auto"><option value="fill">Lengkapin yang kosong aja</option><option value="over">Timpa pakai data dari PDF (fasilitas, kamar, kapasitas, harga, lokasi)</option></select></label></div>'+
    '<div id="buL" style="margin-top:10px"></div><div id="buE" class="err"></div><div class="mf"><button class="btn" data-x>Tutup</button><button class="btn primary" data-ok disabled>Mulai upload</button></div>');
  var groups=[],running=false;
  $('[data-x]',m).onclick=function(){if(running&&!window.confirm('Upload masih jalan. Villa yang udah selesai tetap tersimpan. Berhenti sekarang?'))return;running=false;m.remove();renderAdmin()};
  $('#buF',m).onclick=function(){$('#buFi',m).click()};$('#buP',m).onclick=function(){$('#buPi',m).click()};
  function picked(files,mode){groups=buGroup([].slice.call(files),mode);
    var idx={};myVillas().forEach(function(v){idx[buKey(v.name)]=v});
    groups.forEach(function(g){var nm=buName(g.src);g.name=nm.name;g.kamarFromName=nm.kamar;g.match=idx[buKey(g.name)]||null});
    if(!groups.length){$('#buL',m).innerHTML='';$('#buE',m).textContent=mode==='pdf'?'Nggak ada file PDF yang kepilih.':'Di folder itu nggak ketemu foto (JPG/PNG) atau PDF. Pastiin isinya subfolder per villa.';$('[data-ok]',m).disabled=true;return}
    $('#buE',m).textContent='';$('#buO',m).style.display='';
    $('#buL',m).innerHTML='<p class="hint" style="margin:0 0 6px">'+groups.length+' villa ketemu. Nama bisa diedit dulu sebelum mulai. Villa yang namanya sama dengan yang udah ada bakal <b>diupdate</b> (ikut pilihan "Data buat villa yang udah ada" di atas).'+(buMitras().length?' Pilih juga <b>dikelola siapa</b>: kalau dikelola mitra, mitra itu yang update jadwalnya.':'')+'</p>'+(buMitras().length&&groups.length>1?'<label style="flex-direction:row;align-items:center;gap:8px;margin:0 0 8px">Set semua dikelola: <select id="buAll" style="width:auto"><option value="-">— pilih —</option><option value="">Tim admin</option>'+buMitras().map(function(a){return '<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>'}).join('')+'</select></label>':'')+'<div class="bul">'+groups.map(function(g,i){return '<div class="bur" data-i="'+i+'"><input value="'+esc(g.name)+'" data-nm="'+i+'">'+(isMitra()?'<input data-ph="'+i+'" inputmode="tel" placeholder="No. HP pemilik villa" style="max-width:170px'+(g.match?';display:none':'')+'">':'')+buAccSel(i,g)+'<span class="badge'+(g.match?'':' on')+'">'+(g.match?'Update':'Baru')+'</span><span class="bus">'+(g.imgs.length?g.imgs.length+' foto':'')+(g.pdf?(g.imgs.length?' + ':'')+'PDF':'')+(g.skipped.length?' · '+g.skipped.length+' HEIC dilewati':'')+'</span></div>'}).join('')+'</div>';
    $$('[data-nm]',m).forEach(function(inp){inp.oninput=function(){var g=groups[+inp.dataset.nm];g.name=inp.value.trim();g.match=myVillas().find(function(v){return buKey(v.name)===buKey(g.name)})||null;var b=inp.parentNode.querySelector('.badge');b.className='badge'+(g.match?'':' on');b.textContent=g.match?'Update':'Baru';var ph=inp.parentNode.querySelector('[data-ph]');if(ph)ph.style.display=g.match?'none':''}});
    $$('[data-acc]',m).forEach(function(sel){sel.onchange=function(){groups[+sel.dataset.acc].acc=sel.value}});
    if($('#buAll',m))$('#buAll',m).onchange=function(){var val=this.value;if(val==='-')return;$$('[data-acc]',m).forEach(function(sel){sel.value=val;groups[+sel.dataset.acc].acc=val})};
    $$('[data-ph]',m).forEach(function(inp){inp.oninput=function(){groups[+inp.dataset.ph].phone=inp.value.trim()}});
    $('[data-ok]',m).disabled=false}
  $('#buFi',m).onchange=function(){picked(this.files,'folder');this.value=''};
  $('#buPi',m).onchange=function(){picked(this.files,'pdf');this.value=''};
  $('[data-ok]',m).onclick=function(){if(running)return;if(isMitra()){var kosong=groups.filter(function(g){return g.name&&!g.match&&String(g.phone||'').replace(/\D/g,'').length<9});if(kosong.length){$('#buE',m).textContent='Isi dulu No. HP pemilik villa buat: '+kosong.map(function(g){return g.name}).join(', ');return}$('#buE',m).textContent=''}running=true;var phMode=$('#buPh',m).value,over=$('#buDt',m).value==='over';$('[data-ok]',m).disabled=true;$('#buF',m).disabled=$('#buP',m).disabled=true;$$('[data-nm]',m).forEach(function(i){i.disabled=true});
    var done=0,fails=0,report=[];
    function stat(i,txt,cls){var r=$('.bur[data-i="'+i+'"] .bus',m);if(r){r.textContent=txt;r.className='bus'+(cls?' '+cls:'')}}
    function one(i){if(!running)return Promise.resolve();if(i>=groups.length)return Promise.resolve();var g=groups[i];if(!g.name){stat(i,'dilewati (nama kosong)','bad');return one(i+1)}
      stat(i,'membaca PDF…');var info=null,pdfDoc=null,photoPages=[],readErr='';
      var pre=g.pdf?buReadPDF(g.pdf).then(function(r){pdfDoc=r.doc;photoPages=r.photoPages;info=buParse(r.lines,g.pdf.name)}).catch(function(e){info=null;readErr=(e&&e.message)||String(e);console.warn('PDF gagal',e)}):Promise.resolve();
      return pre.then(function(){
        var v=g.match||myVillas().find(function(x){return buKey(x.name)===buKey(g.name)});var isNew=!v;
        if(isNew){v={id:uid(),name:g.name,location:'',bedrooms:'',bathrooms:'',capStd:'',capMax:'',priceWeekday:'',priceSemi:'',priceWeekend:'',priceHigh:'',facilities:[],desc:'',photos:[],active:true}}
        var cur=(v.photos||[]).slice();if(!isNew&&phMode==='replace')cur=[];var slots=(isNew||phMode!=='keep')?Math.max(0,6-cur.length):0;
        var pool=g.imgs.map(function(f){return {file:f}});if(!pool.length&&pdfDoc)pool=photoPages.map(function(p){return {page:p}});
        var thumb=function(k){var s=pool[k];return s.file?buThumb(s.file):buRenderPage(pdfDoc,s.page,384)};
        return (slots?buPickPhotos(pool,slots,thumb,function(t){stat(i,t)}):Promise.resolve({idx:[],cats:[]})).then(function(pk){var idx=pk.idx;
        var pickInfo=!idx.length?'':pk.ai?' · AI pilih: '+pk.cats.map(function(c){return BU_CATN[c]||c}).join(', '):pool.length>slots?' · AI nggak kebuka ('+String(pk.err||'').slice(0,60)+'), foto dipilih otomatis cara biasa':'';
        var srcs=idx.map(function(k){return pool[k]});
        var up=[];var k=0;
        function nextPhoto(){if(!running||k>=srcs.length)return Promise.resolve();var s=srcs[k++];stat(i,'upload foto '+k+'/'+srcs.length+'…');
          return (s.file?compressBlob(s.file):buRenderPage(pdfDoc,s.page)).then(uploadBlob).then(function(u){up.push(u)}).catch(function(){}).then(nextPhoto)}
        return nextPhoto().then(function(){
          if(!running&&!up.length)return;
          v.photos=cur.concat(up).slice(0,6);
          var d=info||{},fill=function(f,val){if(val&&(isNew||over||!v[f]))v[f]=val};
          fill('bedrooms',d.kamar||g.kamarFromName);fill('bathrooms',d.mandi);fill('capMax',d.kap);fill('location',d.lok);
          fill('priceWeekday',d.wd);fill('priceWeekend',d.we);fill('priceSemi',d.semi);
          if(d.we&&(isNew||over||!v.priceHigh))v.priceHigh=d.we+1000000;
          if(d.fas&&d.fas.length&&(isNew||over||!(v.facilities||[]).length))v.facilities=d.fas;
          var miss=[];if(!v.priceWeekday&&!v.priceWeekend)miss.push('harga');if(!v.capStd&&!v.capMax)miss.push('kapasitas');
          if(!isMitra()&&g.acc!==undefined&&buMitras().length){if(g.acc)v.ownerAcc=g.acc;else delete v.ownerAcc}
          if(isNew){if(miss.length)v.active=false;if(isMitra()){v.ownerAcc=USER.id;v.status='pending';var op={ownerName:'',ownerPhone:g.phone||'',ownerNote:''};PRIV_DIRTY[v.id]=op;PRIV[v.id]=op}D.villas.push(v)}
          markDirty();done++;
          stat(i,(isNew?'✓ ditambah':'✓ diupdate')+' · '+up.length+' foto'+(miss.length?' · ⚠️ belum ada '+miss.join(' & ')+(isNew?' (disembunyiin dulu)':''):'')+(d.weGuess?' · harga weekend dari nama file':'')+(d.fas&&d.fas.length?' · '+d.fas.length+' fasilitas':'')+pickInfo+(readErr?' · ❌ PDF gagal dibaca: '+String(readErr).slice(0,80):''),miss.length?'warn':'ok');
          if(miss.length)report.push(g.name+': '+miss.join(' & '))})})
      }).catch(function(e){fails++;stat(i,'gagal: '+(e&&e.message||'error'),'bad')}).then(function(){if(pdfDoc){try{pdfDoc.destroy()}catch(e){}}return one(i+1)})}
    one(0).then(function(){running=false;$('#buF',m).disabled=$('#buP',m).disabled=false;
      $('#buE',m).innerHTML='<span style="color:var(--green)">Selesai: '+done+' villa'+(fails?', '+fails+' gagal':'')+'. Udah kesimpen otomatis.</span>'+(isMitra()?'<br><span style="color:var(--ink)">Villa baru belum tampil ke tamu sampai disetujui admin PuncakGoVillas.</span>':'')+(report.length?'<br><span style="color:var(--ink)">Villa baru yang belum ada harga/kapasitas aku <b>sembunyiin dulu</b> dari tamu, lengkapin lewat tombol Edit ya.</span>':'');
      $('[data-x]',m).textContent='Selesai'})};
}
var XLSX_P=null;
function loadXLSX(){if(window.XLSX)return Promise.resolve(window.XLSX);if(!XLSX_P)XLSX_P=new Promise(function(res,rej){var sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';sc.onload=function(){window.XLSX?res(window.XLSX):rej()};sc.onerror=function(){XLSX_P=null;rej()};document.head.appendChild(sc)});return XLSX_P}
var PCOLS={ownerName:['namapemilik','pemilik','pemilikvilla'],ownerPhone:['nohppemilik','nopemilik','hppemilik','nomorpemilik','wapemilik','nowapemilik','telppemilik'],ownerNote:['catatanpemilik']};
var COLS={name:['nama','namavilla','villa'],location:['lokasi','alamat','area'],bedrooms:['kamar','jumlahkamar','kamartidur'],bathrooms:['kamarmandi','km'],capStd:['kapasitasnormal','kapasitas','kapasitasstandar'],capMax:['kapasitasmaks','kapasitasmaksimal','kapasitasmax','maks'],priceWeekday:['hargaweekday','weekday'],priceSemi:['hargasemiweekend','semiweekend','hargasemi','semi'],priceWeekend:['hargaweekend','weekend'],priceHigh:['hargahighseason','highseason','hargahs'],facilities:['fasilitas'],desc:['deskripsi','keterangan'],active:['tampil','aktif']};
function normKey(k){return String(k).toLowerCase().replace(/[^a-z0-9]/g,'')}
function cellNum(x){return typeof x==='number'?Math.round(x):num(x)}
function parseRows(rows){
  var out=[];rows.forEach(function(r){var o={},m={};Object.keys(r).forEach(function(k){m[normKey(k)]=r[k]});
    Object.keys(COLS).forEach(function(f){for(var i=0;i<COLS[f].length;i++){if(m.hasOwnProperty(COLS[f][i])&&String(m[COLS[f][i]]).trim()!==''){o[f]=m[COLS[f][i]];break}}});
    if(!o.name||!String(o.name).trim())return;
    var v={name:String(o.name).trim()};
    if(o.location!=null)v.location=String(o.location).trim();
    ['bedrooms','bathrooms','capStd','capMax','priceWeekday','priceSemi','priceWeekend','priceHigh'].forEach(function(f){if(o[f]!=null)v[f]=cellNum(o[f])});
    if(o.facilities!=null)v.facilities=String(o.facilities).split(/[,;\/\n]+/).map(function(x){return x.trim()}).filter(Boolean);
    if(o.desc!=null)v.desc=String(o.desc).trim();
    var pr={};Object.keys(PCOLS).forEach(function(f){for(var i=0;i<PCOLS[f].length;i++){var c=PCOLS[f][i];if(m.hasOwnProperty(c)&&String(m[c]).trim()!==''){pr[f]=String(m[c]).trim();break}}});
    if(Object.keys(pr).length)v._priv=pr;
    if(o.active!=null)v.active=!/^(tidak|no|n|0|false|sembunyi|hide)/i.test(String(o.active).trim());
    out.push(v)});
  return out;
}
function importExcel(){
  var m=modal('<h2>Import villa dari Excel</h2><p class="hint">Baris pertama harus judul kolom. Kolom yang dibaca: <b>Nama</b>, Lokasi, Kamar, Kamar Mandi, Kapasitas Normal, Kapasitas Maks, Harga Weekday, Harga Semi Weekend, Harga Weekend, Harga High Season, Fasilitas (pisah pakai koma), Deskripsi, Tampil (Ya/Tidak).</p><p class="hint">Villa yang namanya sudah ada akan <b>diupdate</b> (foto & tanggal terisi tetap aman). Nama baru akan <b>ditambahkan</b>. Villa yang nggak ada di file <b>nggak dihapus</b>.</p><input type="file" id="xf" accept=".xlsx,.xls,.csv"><div id="xr" style="margin-top:12px"></div><div class="mf"><button class="btn" data-x>Batal</button><button class="btn primary" data-ok disabled>Import</button></div>');
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
    m.remove();markDirty();renderAdmin();toast('Import beres, lagi disimpan otomatis.',4000)};
}

function modal(html){var bg=document.createElement('div');bg.className='modal-bg';bg.innerHTML='<div class="modal">'+html+'</div>';document.body.appendChild(bg);return bg}
function confirmBox(title,body,okLabel){return new Promise(function(res){var m=modal('<h2>'+esc(title)+'</h2><p style="margin:0;color:var(--muted)">'+esc(body)+'</p><div class="mf"><button class="btn" data-x>Batal</button><button class="btn primary" data-ok>'+esc(okLabel||'OK')+'</button></div>');$('[data-x]',m).onclick=function(){m.remove();res(false)};$('[data-ok]',m).onclick=function(){m.remove();res(true)}})}

var HEIC_P=null;
function isHeic(f){return /\.(heic|heif)$/i.test(f.name||'')||/hei[cf]/i.test(f.type||'')}
function heicToJpg(f){if(!HEIC_P)HEIC_P=new Promise(function(res,rej){var sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';sc.onload=function(){window.heic2any?res(window.heic2any):rej()};sc.onerror=function(){HEIC_P=null;rej()};document.head.appendChild(sc)});
  return HEIC_P.then(function(h){return h({blob:f,toType:'image/jpeg',quality:0.85})}).then(function(b){return Array.isArray(b)?b[0]:b})}
function compressBlob(file){var nm=file&&file.name?'"'+file.name+'"':'foto';
  var src=isHeic(file)?heicToJpg(file).catch(function(){throw new Error(nm+' format HEIC (iPhone) nggak bisa dibaca, ubah ke JPG dulu')}):Promise.resolve(file);
  return src.then(function(f){return new Promise(function(res,rej){var url=URL.createObjectURL(f),img=new Image();img.onload=function(){var max=1280,s=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);c.toBlob(function(b){b?res(b):rej(new Error(nm+' gagal diproses'))},'image/jpeg',0.75)};img.onerror=function(){URL.revokeObjectURL(url);rej(new Error(nm+' bukan foto JPG/PNG yang bisa dibaca'))};img.src=url})})}
function compress(file){return new Promise(function(res,rej){var url=URL.createObjectURL(file),img=new Image();img.onload=function(){var max=1100,s=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);res(c.toDataURL('image/jpeg',0.72))};img.onerror=function(){URL.revokeObjectURL(url);rej()};img.src=url})}

function editVilla(id){
  var orig=id?D.villas.find(function(v){return v.id===id}):null;
  var v=orig?JSON.parse(JSON.stringify(orig)):{id:uid(),name:'',location:'',bedrooms:'',bathrooms:'',capStd:'',capMax:'',priceWeekday:'',priceSemi:'',priceWeekend:'',priceHigh:'',facilities:[],desc:'',photos:[],active:true};
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
    money(v.priceWeekday,'priceWeekday','Harga weekday','Min–Kam malam')+money(v.priceSemi,'priceSemi','Harga semi weekend','Jumat & malam sblm tgl merah')+
    money(v.priceWeekend,'priceWeekend','Harga weekend','Sabtu & Natal')+money(v.priceHigh,'priceHigh','Harga high season','opsional')+
    '<div class="full privbox" style="background:#fff6f4;border-color:#f3cfc8"><div class="privh">🏷️ Promo / diskon <span class="opt">(opsional, tampil label "% OFF" & harga coret)</span></div><div class="fg"><label>Diskon (%)<input id="dcP" inputmode="numeric" value="'+(v.disc||'')+'" placeholder="misal 10"></label><label><span>Berlaku mulai <span class="opt">(malam)</span></span><input id="dcF" type="date" value="'+esc(v.discFrom||'')+'"></label><label><span>Sampai <span class="opt">(kosong = terus)</span></span><input id="dcT" type="date" value="'+esc(v.discTo||'')+'"></label></div></div>'+
    '<div class="full"><label style="margin-bottom:6px">Fasilitas</label><div class="pick" id="fac"></div><div class="row" style="margin-top:8px"><label style="flex:1"><input id="facIn" placeholder="Tambah fasilitas lain, lalu Enter"></label><button class="btn sm" id="facAdd" type="button">Tambah</button></div></div>'+
    '<label class="full"><span>Deskripsi singkat <span class="opt">(opsional)</span></span><textarea data-k="desc" rows="3" placeholder="Villa luas dengan kolam renang dan view gunung...">'+esc(v.desc)+'</textarea></label>'+
    '<label class="full"><span>Peraturan khusus villa ini <span class="opt">(opsional, satu baris satu aturan. Peraturan umum diatur di Pengaturan)</span></span><textarea data-k="rules" rows="2" placeholder="Karaoke maksimal jam 22.00">'+esc(v.rules||'')+'</textarea></label>'+
    '<div class="full"><label style="margin-bottom:6px"><span>Foto <span class="opt">(maks 6, foto pertama jadi cover)</span></span></label><div class="pg" id="pg"></div><input type="file" id="pf" accept="image/*" multiple hidden></div>'+
    (canOwner()?'<div class="full privbox"><div class="privh">🔒 Kontak pemilik villa <span class="opt">(rahasia, nggak tampil di website'+(isMitra()?'. Cuma kamu & tim PuncakGoVillas yang bisa lihat':', cuma kelihatan di admin')+')</span></div><div class="fg"><label>Nama pemilik<input id="oN" value="'+esc(pv.ownerName||'')+'" placeholder="Pak Budi"></label><label>No. HP / WA pemilik'+(isMitra()?' <span class="opt">(wajib)</span>':'')+'<input id="oP" inputmode="tel" value="'+esc(pv.ownerPhone||'')+'" placeholder="08xxxxxxxxxx"></label><label class="full">Catatan <span class="opt">(opsional)</span><input id="oC" value="'+esc(pv.ownerNote||'')+'" placeholder="misal: rekening, jam bisa dihubungi"></label></div></div>':'')+
    (isOwner()&&mitras.length?'<label class="full">Dikelola akun mitra <span class="opt">(mitra cuma bisa lihat & atur villa yang ditugasin ke dia)</span><select id="oAcc"><option value="">— Nggak ada (dikelola tim) —</option>'+mitras.map(function(a){return '<option value="'+esc(a.id)+'"'+(v.ownerAcc===a.id?' selected':'')+'>'+esc(a.name)+'</option>'}).join('')+'</select></label>':'')+
    '<label class="chk full"><input type="checkbox" id="act"'+(v.active!==false?' checked':'')+'> Tampilkan villa ini ke tamu</label>'+
    '</div><div id="er" class="err"></div><div class="mf"><button class="btn" data-x>Batal</button><button class="btn primary" data-ok>Simpan villa</button></div>');
  v.photos=goodPhotos(v);if(!Array.isArray(v.facilities))v.facilities=[];
  function facR(){var all=FAC.concat((v.facilities||[]).filter(function(f){return FAC.indexOf(f)<0}));$('#fac',m).innerHTML=all.map(function(f){return '<button type="button" class="'+(v.facilities.indexOf(f)>=0?'on':'')+'" data-f="'+esc(f)+'">'+esc(f)+'</button>'}).join('');$$('[data-f]',m).forEach(function(b){b.onclick=function(){var f=b.dataset.f,i=v.facilities.indexOf(f);if(i>=0)v.facilities.splice(i,1);else v.facilities.push(f);facR()}})}
  function addFac(){var x=$('#facIn',m).value.trim();if(x&&v.facilities.indexOf(x)<0)v.facilities.push(x);$('#facIn',m).value='';facR()}
  $('#facAdd',m).onclick=addFac;$('#facIn',m).onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();addFac()}};
  function pgR(){$('#pg',m).innerHTML=v.photos.map(function(p,i){return '<div class="p"><img src="'+imgSrc(p)+'" alt="">'+(i===0?'<span class="cv">Cover</span>':'')+'<div class="pa">'+(i>0?'<button type="button" data-cv="'+i+'">Jadikan cover</button>':'')+'<button type="button" data-rm="'+i+'">Hapus</button></div></div>'}).join('')+(v.photos.length<6?'<div class="add" id="padd">+ Tambah foto</div>':'<div class="add" style="cursor:default;font-size:12px;text-align:center;padding:6px">Udah 6 foto (maks).<br>Hapus dulu yang mau diganti</div>')+(v.photos.length?'<div style="grid-column:1/-1"><button type="button" class="btn sm" id="pclr">Ganti semua foto</button></div>':'');
    if($('#pclr',m))$('#pclr',m).onclick=function(){if(!window.confirm('Hapus semua foto villa ini terus pilih foto baru?'))return;v.photos=[];pgR();$('#pf',m).click()};
    $$('[data-rm]',m).forEach(function(b){b.onclick=function(){v.photos.splice(+b.dataset.rm,1);pgR()}});
    $$('[data-cv]',m).forEach(function(b){b.onclick=function(){var x=v.photos.splice(+b.dataset.cv,1)[0];v.photos.unshift(x);pgR()}});
    var a=$('#padd',m);if(a)a.onclick=function(){$('#pf',m).click()}}
  var upBusy=0;
  $('#pf',m).onchange=function(e){var all=Array.prototype.slice.call(e.target.files),room=6-v.photos.length,fs=all.slice(0,Math.max(0,room));e.target.value='';if(!fs.length){toast('Udah 6 foto (maks). Hapus dulu foto lama, atau klik "Ganti semua foto".',5000);return}
    var a=$('#padd',m),n=0;upBusy++;var errs=[];
    fs.reduce(function(pr,f){return pr.then(function(){n++;if(a)a.textContent='Mengupload '+n+'/'+fs.length+'…';return compressBlob(f).then(uploadBlob).then(function(x){if(x)v.photos.push(x)}).catch(function(e){errs.push((e&&e.message)||'gagal upload')})})},Promise.resolve())
    .then(function(){upBusy--;pgR();var msg=[];if(errs.length)msg.push('Gagal: '+errs.join('; '));if(all.length>fs.length)msg.push((all.length-fs.length)+' foto nggak masuk karena maks 6 foto. Hapus foto lama dulu kalau mau ganti.');if(msg.length)toast(msg.join(' '),8000)})};
  facR();pgR();
  $$('[data-m]',m).forEach(function(i){i.addEventListener('input',function(){var n=num(i.value);i.value=n?n.toLocaleString('id-ID'):''})});
  $$('[data-n]',m).forEach(function(i){i.addEventListener('input',function(){i.value=i.value.replace(/\D/g,'').slice(0,3)})});
  function formSnap(){return JSON.stringify([$$('input,textarea,select',m).map(function(i){return i.type==='checkbox'?i.checked:i.value}),v.photos,v.facilities])}
  var snap0=formSnap();
  $('[data-x]',m).onclick=function(){
    if(formSnap()===snap0&&!upBusy){m.remove();return}
    var q=modal('<h2>Perubahan villa belum disimpan</h2><p style="margin:0;color:var(--muted)">Mau disimpan dulu? Kalau pilih <b>Buang</b>, perubahan & foto yang barusan diupload nggak kepakai.</p><div class="mf"><button class="btn danger" data-x>Buang</button><button class="btn primary" data-ok>Simpan villa</button></div>');
    $('[data-x]',q).onclick=function(){q.remove();m.remove()};
    $('[data-ok]',q).onclick=function(){q.remove();$('.mf [data-ok]',m).click()};
  };
  $('[data-ok]',m).onclick=function(){
    if(upBusy){$('#er',m).textContent='Tunggu upload foto selesai dulu ya.';return}
    $$('[data-k]',m).forEach(function(i){v[i.dataset.k]=i.value.trim()});
    $$('[data-n]',m).forEach(function(i){v[i.dataset.n]=num(i.value)});
    $$('[data-m]',m).forEach(function(i){v[i.dataset.m]=num(i.value)});
    v.active=$('#act',m).checked;
    var dp=num($('#dcP',m).value);if(dp>0&&dp<90){v.disc=dp;v.discFrom=$('#dcF',m).value||'';v.discTo=$('#dcT',m).value||'';if(!v.discFrom)delete v.discFrom;if(!v.discTo)delete v.discTo}else{delete v.disc;delete v.discFrom;delete v.discTo}
    if(!v.rules)delete v.rules;
    if($('#oAcc',m)){var oa=$('#oAcc',m).value;if(oa)v.ownerAcc=oa;else delete v.ownerAcc}
    if(v.capMax&&v.capStd&&v.capMax<v.capStd)v.capMax=v.capStd;
    var er=[];if(!v.name)er.push('nama villa');if(isMitra()&&(!orig||v.status==='pending')&&$('#oP',m)&&$('#oP',m).value.replace(/\D/g,'').length<9)er.push('no. HP pemilik villa');if(!v.capStd&&!v.capMax)er.push('kapasitas');if(!v.priceWeekday&&!v.priceWeekend)er.push('harga');
    if(er.length){$('#er',m).textContent='Isi dulu: '+er.join(', ')+'.';return}
    if(canOwner()&&$('#oN',m)){var np={ownerName:$('#oN',m).value.trim(),ownerPhone:$('#oP',m).value.trim(),ownerNote:$('#oC',m).value.trim()},op=PRIV[v.id]||{};
      if(np.ownerName!==(op.ownerName||'')||np.ownerPhone!==(op.ownerPhone||'')||np.ownerNote!==(op.ownerNote||'')){PRIV_DIRTY[v.id]=np;PRIV[v.id]=Object.assign({},op,np)}}
    if(orig){D.villas[D.villas.indexOf(orig)]=v}else D.villas.push(v);
    m.remove();markDirty();renderAdmin();toast('Villa disimpan, website ke-update otomatis.');
  };
}

function ranges(arr){var a=(arr||[]).slice().sort(),out=[],s=null,prev=null;a.forEach(function(d){if(s&&addDays(prev,1)===d){prev=d}else{if(s)out.push([s,prev]);s=d;prev=d}});if(s)out.push([s,prev]);return out}
/* ===== Pengingat update jadwal: villa yang jadwalnya udah lebih dari X hari (default 6) nggak diupdate ===== */
var CAL_START='2026-11-26T11:00:00.000Z';
function calDays(){var n=parseInt(D.settings.calDays,10);return n>0?n:6}
function calAge(v){var t=Date.parse(v.calAt||CAL_START);return Math.floor((Date.now()-t)/864e5)}
function staleList(){return myVillas().filter(function(v){return v.active!==false&&!v.status&&calAge(v)>=calDays()}).sort(function(a,b){return calAge(b)-calAge(a)})}
function calWho(v){return v.ownerAcc?(accName(v.ownerAcc)?'Mitra '+accName(v.ownerAcc):'Mitra'):'Tim admin'}
function calLast(v){return v.calAt?calAge(v)+' hari lalu'+(v.calBy?' oleh '+esc(v.calBy):''):'belum ada catatan (dihitung dari 26 Nov 2026)'}
function calCheck(v){v.calCheck=true;v.calAt=new Date().toISOString();v.calBy=USER?USER.name:'';markDirty()}
function staleBanner(){var L=staleList();if(!L.length)return '';
  return '<div class="note warn" style="margin-bottom:14px"><div class="row" style="justify-content:space-between;align-items:center"><b>⚠️ '+L.length+' villa belum update jadwal lebih dari '+calDays()+' hari</b><button class="btn sm" id="stT">'+(A.staleOpen?'Tutup':'Lihat villanya')+'</button></div>'+
    (A.staleOpen?'<div class="rl" style="margin-top:10px">'+L.map(function(v){return '<div class="it"><span><b>'+esc(v.name)+'</b>'+(isMitra()?'':' · '+esc(calWho(v)))+'<br><small>Update terakhir: '+calLast(v)+'</small></span><span class="row" style="gap:6px"><button class="btn sm" data-sgo="'+v.id+'">Buka jadwal</button><button class="btn sm primary" data-sok="'+v.id+'">✓ Udah dicek, nggak ada perubahan</button></span></div>'}).join('')+'</div>':'')+'</div>'}
function bindStale(){var b=$('#stT');if(b)b.onclick=function(){A.staleOpen=!A.staleOpen;renderAdmin()};
  $$('[data-sgo]').forEach(function(x){x.onclick=function(){var v=D.villas.find(function(y){return y.id===x.dataset.sgo});A.tab='cal';A.q=v?v.name:'';renderAdmin()}});
  $$('[data-sok]').forEach(function(x){x.onclick=function(){var v=D.villas.find(function(y){return y.id===x.dataset.sok});if(!v)return;calCheck(v);toast('Jadwal '+v.name+' ditandai udah dicek');renderAdmin()}})}
function setNights(id,ns,on){var cv=D.villas.find(function(x){return x.id===id});if(cv){cv.calAt=new Date().toISOString();cv.calBy=USER?USER.name:''}var set={};(D.booked[id]||[]).forEach(function(d){set[d]=1});ns.forEach(function(d){if(on)set[d]=1;else delete set[d]});D.booked[id]=Object.keys(set).sort();if(!D.booked[id].length)delete D.booked[id]}

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

function calPanel(){var L=myVillas().filter(function(v){return v.active!==false&&!v.status}).sort(function(a,b){return calAge(b)-calAge(a)}),lim=calDays();
  return '<div class="panel"><h2>Update jadwal terakhir</h2><p class="hint">Jadwal tiap villa wajib dicek minimal <b>'+lim+' hari sekali</b>'+(isOwner()?' (ubah batas: <input id="cdN" type="number" min="1" max="99" value="'+lim+'" style="width:60px;display:inline-block;padding:4px 6px"> hari)':'')+'. Dianggap update kalau ada tanggal terisi/kosong yang diubah, atau klik <b>"Udah dicek"</b> kalau jadwalnya emang nggak berubah.</p><div class="rl">'+
    L.map(function(v){var old=calAge(v)>=lim;return '<div class="it"><span>'+(old?'⚠️ ':'✅ ')+'<b>'+esc(v.name)+'</b>'+(isMitra()?'':' · '+esc(calWho(v)))+'<br><small style="'+(old?'color:var(--red)':'')+'">Update terakhir: '+calLast(v)+'</small></span><button class="btn sm'+(old?' primary':'')+'" data-cok="'+v.id+'">✓ Udah dicek</button></div>'}).join('')+'</div></div>'}
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
   calPanel()+'<div class="panel"><h2>Jadwal terisi ke depan</h2><div class="rl">'+(rl||'<p class="hint" style="margin:0">Belum ada tanggal terisi.</p>')+'</div></div>';
  bindSync(p);
  $$('[data-cok]',p).forEach(function(x){x.onclick=function(){var v=D.villas.find(function(y){return y.id===x.dataset.cok});if(!v)return;calCheck(v);toast('Jadwal '+v.name+' ditandai udah dicek');renderAdmin()}});
  if($('#cdN',p))$('#cdN',p).onchange=function(){var n=parseInt(this.value,10);if(n>0&&n<100){D.settings.calDays=n;markDirty();renderAdmin()}};
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
  paneHol(p);
}
function paneHol(p){
  var lb=document.createElement('div');lb.className='panel';p.appendChild(lb);var L=lebDays();
  var ll=L.list.slice().sort().map(function(h){var a=addDays(h,-L.b),z=addDays(h,L.a),f=function(d){return fmtD(d,{weekday:'short',day:'numeric',month:'short',year:undefined})};
    return '<div class="it"><span><b>Lebaran '+fmtD(h,{weekday:'long'})+'</b><br><small class="hint">Harga weekend: malam '+f(a)+' s/d malam '+f(z)+' ('+(L.a+L.b+1)+' malam)</small></span><button class="btn sm danger" data-lebd="'+h+'">Hapus</button></div>'}).join('');
  lb.innerHTML='<h2>Lebaran (Idul Fitri)</h2><p class="hint">Semua malam dari <b>H-<input id="lebB" type="number" min="0" max="14" value="'+L.b+'" style="width:56px;display:inline-block;padding:3px 6px"></b> sampai <b>H+<input id="lebA" type="number" min="0" max="30" value="'+L.a+'" style="width:56px;display:inline-block;padding:3px 6px"></b> pakai <b>harga weekend</b>. H = hari pertama Idul Fitri. Kalau tanggalnya masuk rentang high season, tetep harga high season.</p>'+
    '<div class="row"><label>Tanggal Idul Fitri (H)<input type="date" id="lebD"></label><button class="btn primary" id="lebAdd">Tambah</button></div>'+
    '<div class="rl" style="margin-top:14px">'+(ll||'<p class="hint" style="margin:0">Belum ada tanggal Lebaran.</p>')+'</div>';
  function setL(k,v){D.settings[k]=v;markDirty();renderAdmin()}
  $('#lebB',lb).onchange=function(){var n=parseInt(this.value,10);if(n>=0&&n<=14)setL('lebB',n)};
  $('#lebA',lb).onchange=function(){var n=parseInt(this.value,10);if(n>=0&&n<=30)setL('lebA',n)};
  $('#lebAdd',lb).onclick=function(){var d=$('#lebD',lb).value;if(!d||L.list.indexOf(d)>=0)return;setL('lebaran',L.list.concat([d]).sort())};
  $$('[data-lebd]',lb).forEach(function(b){b.onclick=function(){setL('lebaran',L.list.filter(function(x){return x!==b.dataset.lebd}))}});
  var box=document.createElement('div');box.className='panel';p.appendChild(box);
  var today=todayDS(),showOld=A.holOld;
  var hs=(D.holidays||[]).slice().sort(function(a,b){return a.date<b.date?-1:1});
  var vis=hs.filter(function(h){return showOld||h.date>=addDays(today,-1)});
  var miss=DEF_HOL.filter(function(d){return d.date>=today&&!hs.some(function(h){return h.date===d.date})});
  var yr='';
  var list=vis.map(function(h){var y=h.date.slice(0,4),hd=y!==yr?'<div class="yh">'+y+'</div>':'';yr=y;var eve=addDays(h.date,-1),w=dow(h.date),et=dayType(eve);
    var eff=w===0||w===6?'jatuh di akhir pekan, harga nggak berubah':(et==='semi'?'malam '+fmtD(eve,{weekday:'short',day:'numeric',month:'short',year:undefined})+' jadi <b>semi weekend</b>':et==='weekend'?'malam sebelumnya udah harga weekend':et==='high'?'malam sebelumnya udah high season':'');
    return hd+'<div class="it"><span><b>'+fmtD(h.date,{weekday:'short'})+'</b> · '+esc(h.label||'Tanggal merah')+'<br><small class="hint">'+eff+'</small></span><button class="btn sm danger" data-hold="'+h.date+'">Hapus</button></div>'}).join('');
  box.innerHTML='<h2>Tanggal merah</h2><p class="hint">Aturan harga per malam:<br>• <b>Minggu–Kamis</b> = weekday<br>• <b>Jumat</b> = semi weekend<br>• <b>Sabtu</b> = weekend<br>• Tanggal merah di hari kerja → <b>malam sebelumnya</b> jadi semi weekend<br>• <b>Natal</b> (malam 24 & 25 Des) = weekend<br>• <b>Lebaran</b> (H-'+lebDays().b+' s/d H+'+lebDays().a+') = weekend<br>• Rentang <b>high season</b> di atas (misal tahun baru) ngalahin semuanya</p>'+
    (miss.length?'<div class="note" style="margin-bottom:12px">Ada '+miss.length+' libur nasional (SKB 3 Menteri) yang belum masuk. <button class="btn sm" id="holFill">Masukin semua</button></div>':'')+
    '<div class="row"><label>Nama<input id="holL" placeholder="Idulfitri / cuti bersama"></label><label>Tanggal<input type="date" id="holD"></label><button class="btn primary" id="holA">Tambah</button></div><div id="holE" class="err"></div>'+
    '<div class="rl" style="margin-top:14px">'+(list||'<p class="hint" style="margin:0">Belum ada tanggal merah.</p>')+'</div>'+
    '<p style="margin:10px 0 0"><a href="#" id="holOld">'+(showOld?'Sembunyikan tanggal yang udah lewat':'Lihat juga tanggal yang udah lewat')+'</a></p>';
  $('#holA',box).onclick=function(){var d=$('#holD',box).value;if(!d){$('#holE',box).textContent='Pilih tanggalnya.';return}if(hs.some(function(h){return h.date===d})){$('#holE',box).textContent='Tanggal itu udah ada.';return}D.holidays.push({date:d,label:$('#holL',box).value.trim()});markDirty();renderAdmin()};
  if($('#holFill',box))$('#holFill',box).onclick=function(){miss.forEach(function(d){D.holidays.push(Object.assign({},d))});markDirty();renderAdmin()};
  $('#holOld',box).onclick=function(e){e.preventDefault();A.holOld=!A.holOld;renderAdmin()};
  $$('[data-hold]',box).forEach(function(b){b.onclick=function(){D.holidays=D.holidays.filter(function(h){return h.date!==b.dataset.hold});markDirty();renderAdmin()}});
}

var DEF_GUIDE=['Isi tanggal check-in, check-out & jumlah orang di puncakgovillas.com, lalu klik "Cari Villa".','Pilih villa yang cocok. Klik "Detail" buat lihat foto, fasilitas, kalender harga & tanggal yang masih kosong.','Klik "Booking via WhatsApp" (atau klik tanggal di kalender). Pesan ke admin otomatis keisi nama villa & tanggalnya.','Admin cek ulang ketersediaan dan kirim total harga final.','Bayar DP sesuai arahan admin buat ngunci tanggal. Pelunasan sesuai kesepakatan dengan admin.'];
var DEF_FAQ=[{q:'Gimana cara booking villa?',a:'Cari villa sesuai tanggal & jumlah orang di website, lalu klik "Booking via WhatsApp". Admin kami bakal konfirmasi ketersediaan dan total harganya.'},{q:'Harga yang tampil di website udah final?',a:'Harga di website adalah estimasi per malam sesuai tanggal. Ketersediaan dan harga final dikonfirmasi admin lewat WhatsApp.'},{q:'Kenapa harga tiap malam beda-beda?',a:'Weekday (Minggu–Kamis malam) paling murah. Jumat malam & malam sebelum tanggal merah pakai harga semi weekend. Sabtu malam, Natal & Lebaran pakai harga weekend. Tahun baru & libur panjang pakai harga high season.'},{q:'Villa yang saya mau udah penuh, gimana?',a:'Chat admin aja. Kami punya banyak pilihan villa di Puncak dan bisa carikan villa lain yang mirip di tanggal kamu.'},{q:'Rombongan besar, ada villanya?',a:'Ada villa kapasitas besar untuk rombongan. Kalau masih kurang, bisa ambil 2 villa berdekatan, admin bantu carikan kombinasinya.'}];
var RULES_TPL='Wajib menunjukkan KTP saat check-in\nDilarang membawa minuman beralkohol & narkoba\nDilarang membawa hewan peliharaan tanpa izin admin\nMusik / karaoke maksimal sampai jam 22.00\nDilarang memakai sabun / sampo di kolam renang\nJaga kebersihan & fasilitas villa, kerusakan atau kehilangan wajib diganti';
function setExtraPanels(s){var p=s.promo||{},faq=Array.isArray(s.faq)?s.faq:DEF_FAQ,guide=Array.isArray(s.guide)?s.guide:DEF_GUIDE;
  return '<div class="panel"><h2>🏷️ Banner promo</h2><p class="hint">Tampil di halaman depan, di atas kolom pencarian, lengkap dengan hitung mundur. Diskon per villa diatur di <b>Edit villa</b>.</p><div class="fg">'+
    '<label class="chk full"><input type="checkbox" id="prOn"'+(p.on?' checked':'')+'> Tampilkan banner promo</label>'+
    '<label class="full">Judul promo<input id="prT" value="'+esc(p.title||'')+'" placeholder="Promo Akhir Tahun – diskon sampai 20%"></label>'+
    '<label class="full"><span>Keterangan <span class="opt">(opsional)</span></span><input id="prX" value="'+esc(p.text||'')+'" placeholder="Cek villa berlabel % OFF di hasil pencarian"></label>'+
    '<label><span>Berlaku sampai <span class="opt">(kosong = tanpa hitung mundur)</span></span><input id="prU" type="date" value="'+esc(p.until||'')+'"></label></div></div>'+
   '<div class="panel"><h2>📋 Peraturan villa</h2><p class="hint">Tampil di halaman detail tiap villa & halaman Panduan Booking. Kosongin kalau belum mau ditampilin. Peraturan khusus per villa bisa ditambah di <b>Edit villa</b>.</p><div class="fg">'+
    '<label>Jam check-in<input data-s="checkin" value="'+esc(s.checkin||'')+'" placeholder="14:00"></label><label>Jam check-out<input data-s="checkout" value="'+esc(s.checkout||'')+'" placeholder="12:00"></label>'+
    '<label class="full"><span>Peraturan umum <span class="opt">(satu baris satu aturan)</span></span><textarea data-s="rules" id="ruT" rows="6" placeholder="Wajib menunjukkan KTP saat check-in">'+esc(s.rules||'')+'</textarea></label>'+
    '<div class="full"><button type="button" class="btn sm" id="ruTpl">Isi contoh peraturan</button> <span class="hint">cek & sesuaikan dulu sebelum dipakai</span></div></div></div>'+
   '<div class="panel"><h2>📖 Panduan booking & FAQ</h2><p class="hint">Tampil di halaman <a href="/panduan-booking" target="_blank">/panduan-booking</a>, dan FAQ juga di bagian bawah halaman depan.</p>'+
    '<label class="full"><span>Langkah booking <span class="opt">(satu baris satu langkah)</span></span><textarea id="guT" rows="6">'+esc(guide.join('\n'))+'</textarea></label>'+
    '<h3 style="margin:16px 0 8px;font-size:15px">Pertanyaan yang sering ditanya</h3><div id="fqL">'+faq.map(function(f,i){return '<div class="fgq" style="border:1px solid var(--line);border-radius:12px;padding:10px;margin:0 0 8px"><input data-fq="'+i+'" value="'+esc(f.q)+'" placeholder="Pertanyaan" style="font-weight:700;margin-bottom:6px"><textarea data-fa="'+i+'" rows="2" placeholder="Jawaban">'+esc(f.a)+'</textarea><button type="button" class="btn sm danger" data-fd="'+i+'" style="margin-top:6px">Hapus</button></div>'}).join('')+'</div>'+
    '<button type="button" class="btn sm" id="fqAdd">+ Tambah pertanyaan</button></div>'}
function bindExtraPanels(p,s){
  function pr(){var o=s.promo||{};o.on=$('#prOn',p).checked;o.title=$('#prT',p).value.trim();o.text=$('#prX',p).value.trim();o.until=$('#prU',p).value;s.promo=o;markDirty()}
  ['#prOn','#prT','#prX','#prU'].forEach(function(id){$(id,p).addEventListener('input',pr);$(id,p).addEventListener('change',pr)});
  $('#ruTpl',p).onclick=function(){var t=$('#ruT',p);if(t.value.trim()&&!window.confirm('Ganti isi peraturan sekarang dengan contoh?'))return;t.value=RULES_TPL;s.rules=RULES_TPL;markDirty()};
  $('#guT',p).addEventListener('input',function(){s.guide=this.value.split('\n').map(function(x){return x.trim()}).filter(Boolean);markDirty()});
  function faqArr(){if(!Array.isArray(s.faq))s.faq=DEF_FAQ.map(function(f){return {q:f.q,a:f.a}});return s.faq}
  $$('[data-fq]',p).forEach(function(i){i.addEventListener('input',function(){faqArr()[+i.dataset.fq].q=i.value;markDirty()})});
  $$('[data-fa]',p).forEach(function(i){i.addEventListener('input',function(){faqArr()[+i.dataset.fa].a=i.value;markDirty()})});
  $$('[data-fd]',p).forEach(function(b){b.onclick=function(){faqArr().splice(+b.dataset.fd,1);markDirty();renderAdmin()}});
  $('#fqAdd',p).onclick=function(){faqArr().push({q:'',a:''});markDirty();renderAdmin()};
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
   '</div></div>'+setExtraPanels(s)+'<div class="panel"><h2>Penyimpanan foto</h2><p class="hint" id="usage">Mengecek…</p><button class="btn" id="clean">Bersihin foto yang nggak dipakai</button></div>'+
   (isOwner()?'<div class="panel"><h2>Akun admin</h2><p class="hint">Bikin akun buat tiap orang, biar ketahuan siapa yang upload foto dan ngubah jadwal (lihat tab <b>Riwayat</b>). <b>Admin</b> bisa ngurus semua villa. <b>Mitra</b> cuma bisa lihat & atur villa miliknya sendiri (villa yang dia tambahin, atau yang kamu tugasin lewat Edit villa). Kamu sendiri masuk pakai password pemilik (ADMIN_PASSWORD di Cloudflare).</p><div id="adl" class="rl"><p class="hint">Memuat…</p></div><div class="row" style="margin-top:12px"><label>Jenis akun<select id="at"><option value="">— Pilih jenis akun —</option><option value="mitra">Mitra / pemilik villa (cuma villanya sendiri)</option><option value="staff">Admin (semua villa)</option></select></label><label>Nama<input id="an" placeholder="misal: Rina" autocomplete="off"></label><label>Password<input id="ap" type="text" placeholder="min. 6 karakter" autocomplete="off"></label><button class="btn primary" id="aa">Tambah / ganti password</button></div><label class="chk" style="margin-top:10px"><input type="checkbox" id="ac"> Boleh lihat kontak pemilik villa</label><div id="ae" class="err"></div></div>':'')+
   '<p class="hint" style="margin:0 2px 18px">Data otomatis dicadangkan tiap kali disimpan.</p>';
  $$('[data-s]',p).forEach(function(i){i.addEventListener('input',function(){var k=i.dataset.s;s[k]=k==='overPct'?num(i.value):i.value;markDirty()});i.addEventListener('change',function(){var k=i.dataset.s;s[k]=k==='overPct'?num(i.value):i.value;markDirty()})});
  $('#so',p).onchange=function(e){s.showOver=e.target.checked;markDirty()};
  bindExtraPanels(p,s);
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
  ['settings','highSeason','holidays','syncInfo'].forEach(function(k){if(J(mine[k])!==J(base[k]))out[k]=mine[k]});
  ['booked','synced'].forEach(function(k){var b=base[k]||{},m=mine[k]||{},o=out[k]=out[k]||{};
    Object.keys(Object.assign({},b,m)).forEach(function(id){if(J(m[id])!==J(b[id])){if(m[id]&&m[id].length)o[id]=m[id];else delete o[id]}})});
  var bm={},mm={};(base.villas||[]).forEach(function(v){bm[v.id]=v});(mine.villas||[]).forEach(function(v){mm[v.id]=v});
  var res=[];(out.villas||[]).forEach(function(v){var b=bm[v.id],m=mm[v.id];
    if(b&&!m)return;                         // gue hapus
    if(m&&J(m)!==J(b))res.push(m);else res.push(v)});
  (mine.villas||[]).forEach(function(v){if(!bm[v.id]&&!res.some(function(x){return x.id===v.id}))res.push(v)}); // villa baru gue
  out.villas=res;return out;
}
function save(auto){
  if(saving){if(dirty)scheduleSave(1500);return}
  clearTimeout(AUTO_T);clearTimeout(RETRY_T);
  var btn=$('#saveBtn');
  if(!dirty){if(!auto)toast('Semua udah tersimpan.');return}
  saving=true;var c0=CHG;if(btn){btn.disabled=true;btn.textContent='Menyimpan…'}setSt('d','Menyimpan…');
  var t=todayDS();Object.keys(D.booked).forEach(function(k){D.booked[k]=D.booked[k].filter(function(d){return d>=t});if(!D.booked[k].length)delete D.booked[k]});Object.keys(D.synced||{}).forEach(function(k){D.synced[k]=D.synced[k].filter(function(d){return d>=t});if(!D.synced[k].length)delete D.synced[k]});
  var pk=Object.keys(PRIV_DIRTY),names={};pk.forEach(function(id){var v=D.villas.find(function(x){return x.id===id});names[id]=v?v.name:''});
  var sent=JSON.parse(JSON.stringify(D)),privSent=PRIV_DIRTY;PRIV_DIRTY={};
  api('PUT','/api/data',{rev:REV,data:sent}).then(function(r){return (pk.length?api('PUT','/api/private',{villas:privSent,names:names}).catch(function(e){Object.keys(privSent).forEach(function(k){if(!PRIV_DIRTY[k])PRIV_DIRTY[k]=privSent[k]});throw e}):Promise.resolve()).then(function(){return r})}).then(function(r){REV=r.rev;flushPhotoDel();var newP=isMitra()?D.villas.filter(function(v){return v.status==='pending'&&!DUPS[v.id]}).length:0;loadDups().then(function(){if(isAdminPath()&&!busyTyping())renderAdmin();if(newP)toast('Villa tersimpan & lagi nunggu verifikasi admin. Belum tampil ke tamu sampai disetujui.',5000)});(r.villas||[]).forEach(function(x){var v=D.villas.find(function(y){return y.id===x.id});if(v){v.updatedBy=x.updatedBy;v.updatedAt=x.updatedAt;var sv=(sent.villas||[]).find(function(y){return y.id===x.id});if(sv&&sv.calCheck)delete v.calCheck;if(x.calAt&&!v.calCheck){v.calAt=x.calAt;v.calBy=x.calBy}}});save.retry=0;BASE=Object.assign(sent,{rev:REV});saving=false;
    var more=CHG!==c0||Object.keys(PRIV_DIRTY).length>0;dirty=more;
    if(isAdminPath()&&!busyTyping())renderAdmin();
    if(!auto)toast('Tersimpan! Website udah update.');
    btn=$('#saveBtn');if(btn){btn.disabled=false;btn.textContent='Simpan sekarang'}
    if(more){setSt('d','Menyimpan otomatis…');scheduleSave(1500)}else setSt('','✓ Tersimpan otomatis '+new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}))})
  .catch(function(e){
    if(e.status!==409)save.retry=0;
    saving=false;btn=$('#saveBtn');if(btn){btn.disabled=false;btn.textContent='Simpan sekarang'}
    if(e.status===409&&!save.retry){save.retry=1;fetch('/api/data',{cache:'no-store'}).then(function(r){return r.json()}).then(function(latest){var mine=JSON.parse(JSON.stringify(D)),base=BASE||{};setData(merge3(base,mine,latest));REV=latest.rev||0;BASE=JSON.parse(JSON.stringify(latest));dirty=true;save(auto)}).catch(function(){save.retry=0;toast('Gagal ambil data terbaru, coba simpan lagi.',4000)});return}
    if(e.status===409)confirmBox('Data udah diubah dari perangkat lain','Muat ulang data terbaru? Perubahan di layar ini yang belum disimpan akan hilang.','Muat ulang').then(function(ok){if(ok){dirty=false;load().then(renderAdmin)}});
    else if(e.status===401){toast('Sesi habis, login lagi ya. Perubahan di layar ini belum tersimpan.',5000);setTok('');renderLogin()}
    else{setSt('d','⚠️ Gagal nyimpen, nyoba lagi otomatis…');if(!auto)toast('Gagal menyimpan: '+e.message,5000);clearTimeout(RETRY_T);RETRY_T=setTimeout(function(){if(dirty&&USER)save(true)},15000)}
  });
}
window.addEventListener('beforeunload',function(e){if((dirty||saving)&&isAdminPath()){if(dirty&&!saving)save(true);e.preventDefault();e.returnValue=''}});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'&&dirty&&!saving&&USER&&isAdminPath())save(true)});

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
