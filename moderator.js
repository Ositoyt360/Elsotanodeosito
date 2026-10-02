(() => {
  'use strict';
  const CREATOR_EMAIL = 'ositoyt360@elsotanodeosito.com';
  const LIMITED_MOD_NAME = 'denis';
  const config = {apiKey:'AIzaSyAM4rnHi3YU5pY6EK66ztAPRQdESs789Ew',authDomain:'el-sotano-de-osito.firebaseapp.com',projectId:'el-sotano-de-osito',storageBucket:'el-sotano-de-osito.firebasestorage.app',messagingSenderId:'569093514370',appId:'1:569093514370:web:121b78008c667bde93409b'};
  const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
  const auth = firebase.auth(); const db = firebase.firestore(); const storage = firebase.storage();
  let users=[]; let bans=new Map(); let messages=[];
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function toast(msg,error=false){const e=$('toast');e.textContent=msg;e.className='toast show'+(error?' error':'');clearTimeout(toast.t);toast.t=setTimeout(()=>e.className='toast',3200)}
  function fmt(ts){ if(!ts)return '—'; const d=new Date(Number(ts)); return Number.isNaN(d.getTime())?'—':d.toLocaleString('es-SV'); }
  async function token(){ return auth.currentUser ? auth.currentUser.getIdToken(true) : ''; }
  async function server(path,body){
    console.log('[Moderador] →', path, body||{});
    const t=await token();
    const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify(body||{})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){
      console.error('[Moderador] ✗', path, 'código', r.status, data);
      throw new Error(data.error || `El servidor no pudo completar la acción (código ${r.status}).`);
    }
    console.log('[Moderador] ✓', path, data);
    return data;
  }
  function isBanned(uid){const b=bans.get(uid);return b && Number(b.bannedUntil)>Date.now();}
  function renderUsers(){ const q=$('user-search').value.trim().toLowerCase(); const list=users.filter(u=>`${u.displayName||''} ${u.email||''}`.toLowerCase().includes(q)); $('stat-users').textContent=users.length; $('stat-banned').textContent=users.filter(u=>isBanned(u.id)).length; $('users-body').innerHTML=list.length?list.map(u=>{const ban=bans.get(u.id)||{};const banned=isBanned(u.id);const deleted=Boolean(u.deleted);return `<tr><td><div class="user-cell"><img class="avatar" src="${esc(u.photoURL||'logo_yt.png')}" alt=""><div><strong>${esc(u.displayName||u.email||'Usuario')}</strong><div class="sub">${esc(u.email||'sin correo')} · ${esc(u.id)}</div></div></div></td><td><span class="badge ${banned?'banned':'ok'}">${deleted?'Eliminado':banned?'Baneado hasta '+esc(fmt(ban.bannedUntil)):'Activo'}</span></td><td><div class="inline-controls"><input id="ban-${u.id}" type="number" min="1" value="10" aria-label="Duración"><select id="unit-${u.id}"><option value="60">min</option><option value="3600">h</option><option value="86400">días</option></select><button class="btn small" data-ban="${u.id}">Banear</button>${banned?`<button class="btn small secondary" data-unban="${u.id}">Quitar ban</button>`:''}</div></td><td><div class="inline-controls"><input id="pass-${u.id}" type="password" minlength="6" placeholder="Nueva contraseña"><button class="btn small" data-pass="${u.id}">Cambiar</button></div></td><td><button class="btn small danger" data-delete-user="${u.id}">Borrar cuenta</button></td></tr>`}).join(''):'<tr><td colspan="5" class="empty">No hay cuentas que coincidan.</td></tr>'; }
  function renderMessages(){ const stat=$('stat-messages'); if(stat) stat.textContent=messages.length; const list=$('messages-list'); if(!list) return; list.innerHTML=messages.length?messages.map(m=>`<div class="message-row"><div><strong>${esc(m.user||'Usuario')}</strong><span class="sub"> · ${esc(fmt(m.timestamp))}</span><p>${esc(m.isDeleted?'Mensaje eliminado':m.text||'')}</p></div><button class="btn small danger" data-delete-message="${esc(m.id)}">Borrar</button></div>`).join(''):'<p class="empty">No hay mensajes.</p>'; }
  async function loadUsers(){
    try {
      const data=await server('/api/moderator/users',{method:'list'});
      users=Array.isArray(data.users)?data.users:[];
      // Mezcla el estado de Firestore para que el fallback 405 (deleted=true)
      // también se vea aunque Firebase Authentication siga conservando el UID.
      try {
        const s=await db.collection('users').get();
        const profiles=new Map(s.docs.map(d=>[d.id,d.data()||{}]));
        users=users.map(u=>({...u,...(profiles.get(u.id)||{})}));
      } catch(e) {}
    } catch (error) {
      const s=await db.collection('users').get();
      users=s.docs.map(d=>({id:d.id,...d.data()}));
      toast('Firebase Admin no está disponible; se muestran los perfiles registrados en Firestore.',true);
    }
    renderUsers();
  }
  async function loadBans(){ const s=await db.collection('moderation').get(); bans=new Map(s.docs.map(d=>[d.id,d.data()])); renderUsers(); }
  async function loadMessages(){ const s=await db.collection('livechat').orderBy('timestamp','desc').limit(80).get().catch(()=>db.collection('livechat').limit(80).get()); messages=s.docs.filter(d=>!d.id.startsWith('profile_')&&!d.id.startsWith('rank_')).map(d=>({id:d.id,...d.data()})); messages.sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)); renderMessages(); }
  const THEME_LABELS={normal:'Normal',halloween:'Halloween',navidad:'Navidad', 'san-valentin':'San Valentín',cumpleanos:'Cumpleaños del canal'};
  // Modos especiales, título y conteos se guardan DIRECTAMENTE en Firestore.
  // Esto evita depender de endpoints POST del hosting (que estaban devolviendo 405)
  // y hace que el cambio se publique para todos los visitantes en tiempo real.
  const siteSettingsRef = db.doc('siteSettings/public');
  async function loadSettings(){
    try {
      const snap=await siteSettingsRef.get();
      const settings=snap.exists ? (snap.data()||{}) : {};
      setThemeUI(settings.theme||'normal');
      const titleInput=$('site-title');
      if(titleInput && settings.title) titleInput.value=settings.title;
    } catch (error) {
      console.warn('[Moderador] No se pudo leer siteSettings/public en Firestore.', error);
      setThemeUI('normal');
    }
  }
  async function saveSiteSettings(patch){
    const user=auth.currentUser;
    if(!user || String(user.email||'').toLowerCase()!==CREATOR_EMAIL) throw new Error('Debes iniciar sesión con la cuenta creadora.');
    try {
      await siteSettingsRef.set({...patch,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    } catch(error) {
      console.error('[Moderador] Firestore rechazó siteSettings/public',error);
      if(error && (error.code==='permission-denied' || /permission/i.test(error.message||''))) {
        throw new Error('Firestore rechazó el cambio. Publica el archivo firestore.rules incluido en esta versión.');
      }
      throw new Error('No se pudo guardar el modo especial: '+(error.message||'error de Firestore'));
    }
  }
  function setThemeUI(theme){ const t=THEME_LABELS[theme]?theme:'normal'; document.querySelectorAll('[data-theme-mode]').forEach(b=>b.classList.toggle('active',b.dataset.themeMode===t)); const label=$('theme-current-label'); if(label) label.textContent='Modo actual: '+THEME_LABELS[t]; }
  async function saveTheme(theme){
    if(!THEME_LABELS[theme]) return;
    await saveSiteSettings({theme});
    setThemeUI(theme);
    toast('Modo '+THEME_LABELS[theme]+' activado para todos.');
  }
  async function saveTitle(){
    const input=$('site-title');
    const title=(input?.value||'').trim();
    if(!title){ toast('Escribe un título antes de guardar.',true); return; }
    await saveSiteSettings({title});
    toast('Título guardado para todos los visitantes.');
  }
  function defaultCountdowns(){return [{id:'ositoexpo',title:'OsitoExpo',emoji:'🎃',subtitle:'Nuevas sorpresas para la comunidad',targetAt:''},{id:'youtube-aniversario',title:'5 años en YouTube',emoji:'▶️',subtitle:'Aniversario de OsitoYT360',targetAt:''}];}
  function renderCountdownEditor(items){const list=Array.isArray(items)&&items.length?items:defaultCountdowns();$('countdowns-editor').innerHTML=list.map((c,i)=>`<div class="countdown-editor-row" data-countdown-row><div class="inline-controls"><input data-cd-title maxlength="70" value="${esc(c.title||'')}" placeholder="Nombre del evento"><input data-cd-emoji maxlength="4" value="${esc(c.emoji||'⏳')}" title="Emoji"><input data-cd-date type="datetime-local" value="${toLocalInput(c.targetAt)}"><button class="btn small danger" data-remove-countdown type="button">Eliminar</button></div><input data-cd-subtitle maxlength="120" value="${esc(c.subtitle||'')}" placeholder="Texto debajo del conteo (opcional)"><input type="hidden" data-cd-id value="${esc(c.id||`countdown-${i+1}`)}"></div>`).join('');}
  function toMillis(value){
    if(value==null||value==='') return NaN;
    if(typeof value==='number') return value;
    if(value instanceof Date) return value.getTime();
    if(typeof value==='object' && typeof value.toMillis==='function') return value.toMillis();
    if(typeof value==='object' && Number.isFinite(Number(value.seconds))) return Number(value.seconds)*1000 + Math.floor(Number(value.nanoseconds||0)/1e6);
    const n=Number(value); if(Number.isFinite(n) && n>0) return n;
    const d=new Date(value); return d.getTime();
  }
  function toLocalInput(value){const ms=toMillis(value);if(!Number.isFinite(ms))return '';const d=new Date(ms);const pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;}
  function collectCountdowns(){return [...document.querySelectorAll('[data-countdown-row]')].map((row,i)=>{const v=s=>String(row.querySelector(s)?.value||'').trim();const raw=v('[data-cd-date]');let targetAt='';if(raw){const ms=new Date(raw).getTime();if(Number.isFinite(ms)) targetAt=ms;}return {id:v('[data-cd-id]')||`countdown-${i+1}`,title:v('[data-cd-title]')||'Nuevo evento',emoji:v('[data-cd-emoji]')||'⏳',subtitle:v('[data-cd-subtitle]'),targetAt};}).filter(c=>c.title);}
  function addCountdown(){const current=collectCountdowns();current.push({id:`countdown-${Date.now()}`,title:'Nuevo evento',emoji:'⏳',subtitle:'',targetAt:''});renderCountdownEditor(current);}
  async function saveCountdowns(){
    const countdowns=collectCountdowns();
    const invalid=countdowns.filter(c=>!Number.isFinite(Number(c.targetAt)) || Number(c.targetAt)<=Date.now());
    if(!countdowns.length) { await saveSiteSettings({countdowns:[]}); renderCountdownEditor([]); toast('Conteos eliminados.'); return; }
    if(invalid.length) throw new Error('Cada conteo debe tener una fecha y hora futura.');
    await saveSiteSettings({countdowns});
    const snap=await siteSettingsRef.get();
    const saved=snap.exists && Array.isArray(snap.data()?.countdowns) ? snap.data().countdowns : countdowns;
    renderCountdownEditor(saved);
    toast('Conteos guardados y publicados para todos.');
  }
  function imageFileToBlob(file){
    return new Promise((resolve,reject)=>{
      if(!file) return resolve(null);
      if(!/^image\/(jpeg|png|webp|gif)$/i.test(file.type||'')) return reject(new Error('Solo se permiten imágenes JPG, PNG, WEBP o GIF.'));
      if(file.size>8*1024*1024) return reject(new Error('La imagen debe pesar menos de 8 MB.'));
      const reader=new FileReader();
      reader.onload=()=>{
        const img=new Image();
        img.onload=()=>{
          const maxSide=1400;
          const scale=Math.min(1,maxSide/Math.max(img.width,img.height));
          const canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(img.width*scale));
          canvas.height=Math.max(1,Math.round(img.height*scale));
          const ctx=canvas.getContext('2d');
          ctx.drawImage(img,0,0,canvas.width,canvas.height);
          canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('No se pudo preparar la imagen.')),'image/jpeg',.82);
        };
        img.onerror=()=>reject(new Error('No se pudo leer la imagen.'));
        img.src=String(reader.result||'');
      };
      reader.onerror=()=>reject(new Error('No se pudo leer la imagen.'));
      reader.readAsDataURL(file);
    });
  }
  async function publishAnnouncement(){
    const text=String($('announcement')?.value||'').trim().slice(0,400);
    const file=$('announcement-image')?.files?.[0]||null;
    if(!text && !file) throw new Error('Escribe un aviso o selecciona una foto.');
    const user=auth.currentUser;
    if(!user) throw new Error('La sesión del moderador no está activa.');
    let imageURL='';
    if(file){
      const blob=await imageFileToBlob(file);
      const path=`announcements/${user.uid}/${Date.now()}.jpg`;
      const ref=storage.ref(path);
      await ref.put(blob,{contentType:'image/jpeg',cacheControl:'public,max-age=31536000'});
      imageURL=await ref.getDownloadURL();
    }
    await db.collection('livechat').add({
      user:'ANUNCIO OFICIAL', text, timestamp:Date.now(), isSystem:true, isAdmin:true,
      isCreator:user.email===CREATOR_EMAIL, isModeratorAnnouncement:true,
      uid:user.uid, email:user.email||'', photoURL:'', imageURL, seenBy:[]
    });
    $('announcement').value='';
    const input=$('announcement-image'); if(input) input.value='';
    const preview=$('announcement-image-preview'); if(preview){preview.hidden=true;preview.innerHTML='';}
    toast('Publicación enviada para todos.');
  }
  function setupPublicationPreview(){
    const input=$('announcement-image'), preview=$('announcement-image-preview');
    if(!input||!preview) return;
    input.addEventListener('change',()=>{
      const file=input.files?.[0];
      if(!file){preview.hidden=true;preview.innerHTML='';return;}
      const url=URL.createObjectURL(file);
      preview.hidden=false; preview.innerHTML=`<img src="${url}" alt="Vista previa">`;
    });
  }
  async function initData(isLimited=false){
    if(isLimited){
      document.body.classList.add('limited-moderator');
      document.querySelectorAll('[data-creator-only]').forEach(e=>e.remove());
      const title=$('mod-title'); if(title) title.textContent='Panel de moderación';
      const role=$('mod-role-badge'); if(role){ role.hidden=false; role.textContent='🛡️ Moderador · Denis'; role.className='role-badge limited'; }
      const scope=$('moderator-scope'); if(scope){ scope.hidden=false; scope.innerHTML='<strong>Permisos de Denis:</strong> revisar, publicar anuncios y eliminar mensajes del chat. Las opciones de creador permanecen bloqueadas.'; }
      await loadMessages();
      return;
    }
    document.body.classList.remove('limited-moderator');
    const title=$('mod-title'); if(title) title.textContent='Centro del creador';
    const role=$('mod-role-badge'); if(role){ role.hidden=false; role.textContent='👑 Creador · OsitoYT360'; role.className='role-badge creator'; }
    const scope=$('moderator-scope'); if(scope){ scope.hidden=false; scope.innerHTML='<strong>OsitoYT360:</strong> acceso completo a la administración del sitio, modos, conteos, cuentas y moderación.'; }
    await Promise.all([loadUsers(),loadBans(),loadMessages(),loadSettings()]);
  }
  document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{
    if(b.dataset.ban){const uid=b.dataset.ban,n=Math.max(1,Number($(`ban-${uid}`).value)||10),factor=Number($(`unit-${uid}`).value)||60,until=Date.now()+n*factor*1000;await server('/api/moderator/moderation',{action:'ban',uid,bannedUntil:until});toast('Cuenta baneada para todos.');await loadBans();}
    if(b.dataset.unban){await server('/api/moderator/moderation',{action:'unban',uid:b.dataset.unban});toast('Ban retirado.');await loadBans();}
    if(b.dataset.pass){const uid=b.dataset.pass,p=$(`pass-${uid}`).value;if(p.length<6)throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');await server('/api/moderator/account',{action:'set_password',uid,password:p});$(`pass-${uid}`).value='';toast('Contraseña nueva establecida.');}
    if(b.dataset.deleteUser){
      const uid=b.dataset.deleteUser;
      if(!confirm('¿Borrar esta cuenta del sitio? Esta acción la ocultará y bloqueará su acceso aunque el servidor no tenga disponible Firebase Admin.')) return;
      let hardDeleted=false;
      try {
        await server('/api/moderator/account',{action:'delete_user',uid});
        hardDeleted=true;
      } catch(error) {
        // Algunos hostings estáticos/reverse proxies responden 405 a POST /api.
        // Fallback seguro: marca la cuenta como eliminada en Firestore; la web
        // detecta deleted=true y cierra la sesión aunque Auth no pueda borrarse.
        if (!String(error.message||'').includes('405')) throw error;
        await db.doc(`users/${uid}`).set({deleted:true,deletedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
      }
      await Promise.all([
        db.doc(`moderation/${uid}`).delete().catch(()=>{}),
        db.doc(`livechat/profile_${uid}`).delete().catch(()=>{}),
        db.doc(`livechat/rank_${uid}`).delete().catch(()=>{})
      ]);
      toast(hardDeleted ? 'Cuenta eliminada completamente.' : 'Cuenta eliminada del sitio. El servidor no permite borrarla de Authentication (405), pero ya no podrá entrar.');
      await Promise.all([loadUsers(),loadBans()]);
    }
    if(b.dataset.deleteMessage){
      if(!confirm('¿Borrar este mensaje para todos?')) return;
      const messageId = b.dataset.deleteMessage;
      // La moderación de mensajes no depende de Express ni de /api: así
      // funciona también cuando el sitio está publicado como GitHub Pages.
      await db.doc(`livechat/${messageId}`).delete();
      toast('Mensaje borrado para todos.');
      await loadMessages();
    }
  }catch(err){toast(err.message||'No se pudo completar la acción.',true)}});
  $('user-search').addEventListener('input',renderUsers);
  $('refresh-messages').addEventListener('click',()=>loadMessages().catch(e=>toast(e.message,true)));
  document.querySelectorAll('[data-theme-mode]').forEach(b=>b.addEventListener('click',()=>saveTheme(b.dataset.themeMode).catch(e=>toast(e.message,true))));
  if($('save-title')) $('save-title').addEventListener('click',()=>saveTitle().catch(e=>toast(e.message,true)));
  if($('publish-announcement')) $('publish-announcement').addEventListener('click',()=>publishAnnouncement().catch(e=>toast(e.message,true)));
  setupPublicationPreview();
  $('mod-logout').addEventListener('click',async()=>{await auth.signOut();location.href='index.html'});
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{}).finally(()=>auth.onAuthStateChanged(async user=>{
    const email=String(user?.email||'').toLowerCase();
    const isCreator=email===CREATOR_EMAIL;
    const displayName=String(user?.displayName||'').trim().toLowerCase();
    const localPart=email.split('@')[0];
    const isLimited=Boolean(user) && !isCreator && (displayName===LIMITED_MOD_NAME || localPart===LIMITED_MOD_NAME);
    const ok=isCreator||isLimited;
    $('mod-app').hidden=!ok;
    $('access-denied').hidden=ok;
    if(!ok){$('mod-status').textContent='Acceso denegado';return;}
    $('mod-status').textContent=isCreator?'Sesión segura · cuenta creadora OsitoYT360':`Sesión segura · moderador ${user.displayName||'Denis'}`;
    try{await initData(isLimited)}catch(e){toast('No se pudieron cargar todos los datos: '+e.message,true)}
  }));
})();
