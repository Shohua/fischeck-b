// ================================================================
//  FISCHECK R03 — App Controller
// ================================================================

const ACTORS = {
  maestro:    {label:'Maestro / Subcontrato',icon:'🔨',color:'#f5c518',pages:['reportar-maestro']},
  supervisor: {label:'Supervisor',icon:'🔍',color:'#f0883e',pages:['reportar-supervisor','pendientes-sup']},
  jefe:       {label:'Jefe de Terreno',icon:'📋',color:'#58a6ff',pages:['gantt','alertas-jefe']},
  autocontrol:{label:'Autocontrol',icon:'✅',color:'#3fb950',pages:['pendientes-auto','cartillas-auto']},
  admin:      {label:'Administrador de Obra',icon:'🏗️',color:'#bc8cff',pages:['resumen-admin','propuestas-admin']},
  fto:        {label:'FTO (Fiscal Técnico)',icon:'🏛️',color:'#e6edf3',pages:['revision-fto','historial-fto']}
};
const PAGE_META = {
  'reportar-maestro':   {label:'Reportar Avance',icon:'📸'},
  'reportar-supervisor':{label:'Reportar / Verificar',icon:'🔍'},
  'pendientes-sup':     {label:'Pendientes Supervisión',icon:'🔔',badge:true},
  'gantt':              {label:'Tablero Gantt',icon:'📊'},
  'alertas-jefe':       {label:'Alertas',icon:'⚠️',badge:true},
  'pendientes-auto':    {label:'Pendientes Autocontrol',icon:'🔔',badge:true},
  'cartillas-auto':     {label:'Cartillas de Control',icon:'📋'},
  'resumen-admin':      {label:'Resumen de Avance',icon:'📈'},
  'propuestas-admin':   {label:'Propuestas de Pago',icon:'💰'},
  'revision-fto':       {label:'Estados de Pago',icon:'✍️',badge:true},
  'historial-fto':      {label:'Historial Aprobaciones',icon:'📜'}
};

let _QRViv = null, _fotosTemp = [];

const App = {
  page:null, actor:null,

  async boot() { await S.boot(); this._renderActorModal(); },

  setActor(key) {
    this.actor=key; S.actor=key;
    S.user={id:`USR_${key.toUpperCase()}`,nombre:_demoName(key),rol:key};
    this._buildSidebar();
    this.go(ACTORS[key].pages[0]);
    closeModal('actorModal');
    toast('ok',`Sesión: ${ACTORS[key].label}`);
  },

  go(page) {
    this.page=page; _fotosTemp=[]; _QRViv=null;
    document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.page===page));
    document.querySelectorAll('.page-view').forEach(el=>el.classList.toggle('active',el.id===`p-${page}`));
    const meta=PAGE_META[page]||{};
    document.querySelector('.tb-title').textContent=meta.label||page;
    document.querySelector('.tb-sub').textContent=`${ACTORS[this.actor]?.label||''} · ${S.proyecto?.codigo||'Sin proyecto'}`;
    this._render(page);
  },

  _render(page) {
    const el=document.getElementById(`p-${page}`); if(!el) return;
    const map={
      'reportar-maestro':renderMaestro,'reportar-supervisor':renderSupReportar,
      'pendientes-sup':renderPendSup,'gantt':renderGantt,'alertas-jefe':renderAlertasJefe,
      'pendientes-auto':renderPendAuto,'cartillas-auto':renderCartillasAuto,
      'resumen-admin':renderResumenAdmin,'propuestas-admin':renderPropuestasAdmin,
      'revision-fto':renderRevisionFTO,'historial-fto':renderHistorialFTO
    };
    if (map[page]) el.innerHTML=map[page]();
  },

  _buildSidebar() {
    const a=ACTORS[this.actor];
    document.getElementById('actorBtn').innerHTML=`
      <div class="aico" style="background:${a.color}22;color:${a.color}">${a.icon}</div>
      <div class="aname">${a.label}</div><div class="achv">▼</div>`;
    const nav=document.getElementById('sbNav');
    nav.innerHTML='<div class="nav-sec">Mi sección</div>';
    a.pages.forEach(pg=>{
      const m=PAGE_META[pg]||{};
      nav.innerHTML+=`<div class="nav-item" data-page="${pg}" onclick="App.go('${pg}')">
        <span class="nico">${m.icon}</span><span class="nlbl">${m.label}</span>
        ${m.badge?`<span class="nbadge" id="badge-${pg}" style="display:none">0</span>`:''}
      </div>`;
    });
    this._updateBadges();
  },

  _updateBadges() {
    const ps=S.reportes.filter(r=>r.estado==='pendiente_supervision').length;
    const pa=S.supervisiones.filter(s=>s.estado==='supervisada_ok').length;
    const al=S.alertas.filter(a=>!a.gestionada).length;
    const pf=S.propuestas.filter(p=>p.estado==='pendiente_fto').length;
    _sb('pendientes-sup',ps); _sb('pendientes-auto',pa);
    _sb('alertas-jefe',al); _sb('revision-fto',pf);
  },

  _renderActorModal() {
    document.getElementById('actorModalBody').innerHTML=`
      <div style="text-align:center;margin-bottom:18px">
        <div style="font-family:var(--mono);font-size:22px;font-weight:700;color:var(--acc)">FISCHECK R03</div>
        <div style="font-size:11px;color:var(--txt2);margin-top:3px">Sistema de Control · Parte B</div>
      </div>
      ${S.proyecto?`<div style="text-align:center;margin-bottom:14px"><span class="chip">📁 ${S.proyecto.nombre} · ${S.proyecto.codigo}</span></div>`:`
        <div class="notif-item info" style="margin-bottom:14px">
          <span class="ni-ico">ℹ️</span>
          <div><div class="ni-title">Sin proyecto activo</div><div class="ni-desc">Crea un proyecto primero</div></div>
        </div>
        <button class="btn btn-pri btn-sm" style="width:100%;margin-bottom:14px" onclick="closeModal('actorModal');openModal('proyectoModal')">+ Crear Proyecto</button>
      `}
      <p style="font-size:11px;color:var(--txt2);margin-bottom:12px;text-align:center">Selecciona tu rol</p>
      <div class="actor-grid">
        ${Object.entries(ACTORS).map(([k,a])=>`
          <div class="actor-opt" onclick="App.setActor('${k}')">
            <div class="ao-ico">${a.icon}</div><div class="ao-name">${a.label}</div>
            <div class="ao-desc text-muted">${_rolDesc(k)}</div>
          </div>`).join('')}
      </div>`;
    openModal('actorModal');
  }
};

// ═══════════════════════════════════════════
//  MAESTRO
// ═══════════════════════════════════════════
function renderMaestro() {
  _QRViv=null; _fotosTemp=[];
  // Verificar si hay partidas rechazadas para este actor
  const rechazadas = S.reportes.filter(r => r.estado === 'pendiente_correccion');
  return `
    <div class="ph">
      <div><div class="ph-h1">📸 Reportar <span>Avance</span></div>
      <div class="ph-desc">Escanea el QR de la vivienda y registra la ejecución</div></div>
    </div>
    ${rechazadas.length > 0 ? `
      <div class="notif-item danger mb-12">
        <span class="ni-ico">⚠️</span>
        <div><div class="ni-title">Tienes ${rechazadas.length} partida(s) rechazada(s) — Puedes re-reportar</div>
        <div class="ni-desc">${rechazadas.slice(0,2).map(r=>`${S._pN(r.partida_id)} · ${r.vivienda_id}`).join(' | ')}</div></div>
      </div>` : ''}
    <div class="card" id="maestro-qr-card">
      <div class="card-hdr"><div class="card-title">Escanear QR de la vivienda</div></div>
      <div id="qr-cnt-maestro">
        <div class="qr-box" onclick="QRScanner.open('qr-cnt-maestro', onQRMaestro)">
          <div class="qi">📱</div><div class="qt">Toca para abrir cámara</div>
          <div class="qs">Apunta al QR de la vivienda</div>
        </div>
      </div>
    </div>
    <div id="maestro-form" style="display:none">
      <div class="card">
        <div class="card-hdr">
          <div><div class="card-title">Nueva Evidencia</div>
          <div class="card-sub" id="maestro-viv-lbl">-</div></div>
          <button class="btn btn-ghost btn-sm" onclick="resetMaestro()">↩ Cambiar QR</button>
        </div>
        <div class="fg">
          <label class="flbl">Partida <span style="color:var(--danger)">*</span></label>
          <select class="finp" id="sel-partida-maestro">
            <option value="">-- Selecciona partida --</option>
            ${S.partidas.filter(p=>p.cartilla_id_asociada).map(p=>
              `<option value="${p.partida_id}">${p.codigo_item} · ${p.nombre}</option>`).join('')}
          </select>
        </div>
        <div class="fg">
          <label class="flbl">Foto obligatoria <span style="color:var(--danger)">*</span></label>
          <div class="photo-grid" id="foto-grid-maestro">
            <div class="photo-add" onclick="capturarFoto('foto-grid-maestro','maestro')">
              <span>📷</span><span>Tomar foto</span></div>
          </div>
          <div class="text-muted mt-12">La foto se toma en el momento (no desde galería)</div>
        </div>
        <div class="fg">
          <label class="flbl">Comentario (opcional)</label>
          <textarea class="finp" id="maestro-comentario" rows="2" placeholder="Describe el trabajo realizado..."></textarea>
        </div>
        <button class="btn btn-pri" style="width:100%" id="btn-submit-maestro" onclick="submitMaestro()">
          ✅ Reportar Avance
        </button>
        <div style="font-size:10px;color:var(--txt3);margin-top:5px;text-align:center">
          Estado: <strong style="color:var(--warn)">PENDIENTE SUPERVISIÓN</strong>
        </div>
      </div>
    </div>`;
}

function onQRMaestro(v) {
  _QRViv=v;
  document.getElementById('maestro-qr-card').style.display='none';
  document.getElementById('maestro-form').style.display='';
  document.getElementById('maestro-viv-lbl').textContent=`Vivienda ${v.id}`;
}
function resetMaestro() {
  _QRViv=null; _fotosTemp=[];
  document.getElementById('maestro-qr-card').style.display='';
  document.getElementById('maestro-form').style.display='none';
  document.getElementById('qr-cnt-maestro').innerHTML=`
    <div class="qr-box" onclick="QRScanner.open('qr-cnt-maestro', onQRMaestro)">
      <div class="qi">📱</div><div class="qt">Toca para abrir cámara</div><div class="qs">Apunta al QR</div></div>`;
}
async function submitMaestro() {
  const pid=document.getElementById('sel-partida-maestro')?.value;
  if (!_QRViv) {toast('warn','Escanea el QR primero');return;}
  if (!pid) {toast('warn','Selecciona la partida');return;}
  if (!_fotosTemp.length) {toast('warn','Adjunta al menos una foto');return;}
  try {
    await S.crearReporte(_QRViv.id, pid, _fotosTemp[0],
      document.getElementById('maestro-comentario').value, 'maestro');
    resetMaestro();
    App._render('reportar-maestro');
  } catch(e){toast('danger',e.message);}
}

// ═══════════════════════════════════════════
//  SUPERVISOR — REPORTAR
// ═══════════════════════════════════════════
let _supMode=null, _supRepId=null, _supDec=null;

function renderSupReportar() {
  _QRViv=null; _fotosTemp=[]; _supMode=null; _supRepId=null; _supDec=null;
  return `
    <div class="ph">
      <div><div class="ph-h1">🔍 Reportar / <span>Verificar</span></div>
      <div class="ph-desc">Escanea el QR, verifica pendientes del Maestro o reporta directo</div></div>
    </div>
    <div class="card" id="sup-qr-card">
      <div class="card-hdr"><div class="card-title">Escanear QR de la vivienda</div></div>
      <div id="qr-cnt-sup">
        <div class="qr-box" onclick="QRScanner.open('qr-cnt-sup', onQRSup)">
          <div class="qi">📱</div><div class="qt">Toca para abrir cámara</div>
          <div class="qs">Accede a las partidas de la vivienda</div>
        </div>
      </div>
    </div>
    <div id="sup-action" style="display:none">
      <div class="card">
        <div class="card-hdr">
          <div><div class="card-title">Vivienda escaneada</div>
          <div class="card-sub" id="sup-viv-lbl">-</div></div>
          <button class="btn btn-ghost btn-sm" onclick="resetSupReportar()">↩ Cambiar QR</button>
        </div>
        <div id="sup-pendientes-viv"></div>
        <div class="divider"></div>
        <div class="fg">
          <label class="flbl">Reportar avance directo (sin reporte previo del Maestro)</label>
          <select class="finp" id="sel-partida-sup-dir">
            <option value="">-- Selecciona partida --</option>
            ${S.partidas.filter(p=>p.cartilla_id_asociada).map(p=>
              `<option value="${p.partida_id}">${p.codigo_item} · ${p.nombre}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-info btn-sm" onclick="abrirFormSupDir()">📸 Reportar directo → va a Autocontrol</button>
      </div>
    </div>
    <div id="sup-form" style="display:none">
      <div class="card">
        <div class="card-hdr"><div class="card-title" id="sup-form-title">Registrar</div></div>
        <div class="fg">
          <label class="flbl">Foto obligatoria <span style="color:var(--danger)">*</span></label>
          <div class="photo-grid" id="foto-grid-sup">
            <div class="photo-add" onclick="capturarFoto('foto-grid-sup','sup')"><span>📷</span><span>Tomar foto</span></div>
          </div>
        </div>
        <div id="sup-dec-wrap">
          <label class="flbl">Decisión</label>
          <div class="flex-row">
            <button class="btn btn-ok" onclick="setSupDec('ok')">✅ Aceptar</button>
            <button class="btn btn-danger" onclick="setSupDec('obs')">⚠️ Observación</button>
          </div>
        </div>
        <div id="sup-motivo-wrap" style="display:none" class="fg">
          <label class="flbl">Motivo observación <span style="color:var(--danger)">*</span></label>
          <textarea class="finp" id="sup-motivo" rows="2" placeholder="Mínimo 10 caracteres..."></textarea>
        </div>
        <div id="sup-submit-wrap" style="display:none">
          <button class="btn btn-pri" style="width:100%" onclick="submitSup()">Enviar al Jefe de Terreno</button>
        </div>
      </div>
    </div>`;
}

function onQRSup(v) {
  _QRViv=v;
  document.getElementById('sup-qr-card').style.display='none';
  document.getElementById('sup-action').style.display='';
  document.getElementById('sup-viv-lbl').textContent=`Vivienda ${v.id}`;
  // Cargar pendientes de ESTA vivienda
  const pend=S.reportes.filter(r=>r.estado==='pendiente_supervision'&&r.vivienda_id===v.id);
  const el=document.getElementById('sup-pendientes-viv');
  if (!pend.length) { el.innerHTML=`<div class="text-muted mb-12">Sin reportes pendientes del Maestro para esta vivienda</div>`; return; }
  el.innerHTML=`<label class="flbl">Pendientes Maestro · ${v.id} (${pend.length})</label>`+
    pend.map(r=>{
      const p=S.partidas.find(x=>x.partida_id===r.partida_id);
      return `<div class="notif-item info" style="margin-bottom:6px">
        <span class="ni-ico">🔍</span>
        <div><div class="ni-title">${p?.nombre||r.partida_id}</div>
        <div class="ni-desc">${formatDate(r.timestamp)} ${r.comentario?'· "'+r.comentario+'"':''}</div></div>
        <div class="flex-row">
          <button class="btn btn-ok btn-xs" onclick="abrirFormSupVerif('${r.id}')">Verificar</button>
        </div>
      </div>`;
    }).join('');
}

function resetSupReportar() {
  _QRViv=null;_fotosTemp=[];_supMode=null;_supRepId=null;_supDec=null;
  ['sup-qr-card','sup-action','sup-form'].forEach((id,i)=>{
    const el=document.getElementById(id); if(el) el.style.display=i===0?'':'none';
  });
  document.getElementById('qr-cnt-sup').innerHTML=`
    <div class="qr-box" onclick="QRScanner.open('qr-cnt-sup', onQRSup)">
      <div class="qi">📱</div><div class="qt">Toca para abrir cámara</div><div class="qs">Accede a las partidas</div></div>`;
}

function abrirFormSupVerif(repId) {
  _supMode='verificar'; _supRepId=repId; _supDec=null;
  const r=S.reportes.find(x=>x.id===repId);
  const p=S.partidas.find(x=>x.partida_id===r?.partida_id);
  document.getElementById('sup-form').style.display='';
  document.getElementById('sup-form-title').textContent=`Verificar: ${p?.nombre||r?.partida_id}`;
  document.getElementById('sup-dec-wrap').style.display='';
  document.getElementById('sup-motivo-wrap').style.display='none';
  document.getElementById('sup-submit-wrap').style.display='none';
}

function abrirFormSupDir() {
  const pid=document.getElementById('sel-partida-sup-dir')?.value;
  if (!pid){toast('warn','Selecciona una partida');return;}
  _supMode='directo'; _supRepId=null; _supDec='ok';
  const p=S.partidas.find(x=>x.partida_id===pid);
  document.getElementById('sup-form').style.display='';
  document.getElementById('sup-form-title').textContent=`Reporte directo: ${p?.nombre||pid}`;
  document.getElementById('sup-dec-wrap').style.display='none';
  document.getElementById('sup-motivo-wrap').style.display='none';
  document.getElementById('sup-submit-wrap').style.display='';
}

function setSupDec(d) {
  _supDec=d;
  document.getElementById('sup-motivo-wrap').style.display=d==='obs'?'':'none';
  document.getElementById('sup-submit-wrap').style.display='';
}

async function submitSup() {
  if (!_fotosTemp.length){toast('warn','Adjunta al menos una foto');return;}
  try {
    if (_supMode==='directo') {
      const pid=document.getElementById('sel-partida-sup-dir')?.value;
      await S.supervisorReportaDirecto(_QRViv.id, pid, _fotosTemp[0], '');
    } else {
      const motivo=document.getElementById('sup-motivo')?.value||'';
      if (_supDec==='obs'&&motivo.length<10){toast('warn','Motivo muy corto (mín 10)');return;}
      await S.supervisar(_supRepId, _supDec, motivo, _fotosTemp[0]);
    }
    App._updateBadges();
    resetSupReportar();
    App._render('reportar-supervisor');
  } catch(e){toast('danger',e.message);}
}

// ═══════════════════════════════════════════
//  SUPERVISOR — PENDIENTES (requiere QR)
// ═══════════════════════════════════════════
let _pendSupQRViv=null;

function renderPendSup() {
  _pendSupQRViv=null;
  const pend=S.reportes.filter(r=>r.estado==='pendiente_supervision');
  return `
    <div class="ph">
      <div><div class="ph-h1">🔔 Pendientes de <span>Supervisión</span></div>
      <div class="ph-desc">${pend.length} partidas · Escanea QR para aprobar/rechazar</div></div>
    </div>
    <div class="card mb-12">
      <div class="card-hdr"><div class="card-title">⚠️ Escanear QR obligatorio para supervisar</div></div>
      <div id="qr-cnt-pendsup">
        <div class="qr-box" onclick="QRScanner.open('qr-cnt-pendsup', onQRPendSup)">
          <div class="qi">📱</div><div class="qt">Escanea el QR de la vivienda a supervisar</div>
          <div class="qs">Requerido para verificar que estás en terreno</div>
        </div>
      </div>
      <div id="pendsup-viv-badge" style="display:none;margin-top:10px"></div>
    </div>
    <div class="filters">
      <select id="filt-psup-viv" onchange="filtrarPendSup(this.value)">
        <option value="">Todas las viviendas</option>
        ${[...new Set(pend.map(r=>r.vivienda_id))].map(v=>`<option value="${v}">${v}</option>`).join('')}
      </select>
    </div>
    ${pend.length===0?`<div class="empty-state"><div class="ei">✅</div><div class="et">Sin pendientes</div></div>`:''}
    <div id="pend-sup-list">
      ${pend.map(r=>_rowPendSup(r)).join('')}
    </div>`;
}

function onQRPendSup(v) {
  _pendSupQRViv=v;
  document.getElementById('pendsup-viv-badge').style.display='';
  document.getElementById('pendsup-viv-badge').innerHTML=`
    <div class="notif-item ok"><span class="ni-ico">✅</span>
    <div><div class="ni-title">QR válido · Vivienda ${v.id}</div>
    <div class="ni-desc">Puedes supervisar partidas de esta vivienda</div></div></div>`;
  document.getElementById('filt-psup-viv').value=v.id;
  filtrarPendSup(v.id);
}

function filtrarPendSup(vivId) {
  const pend=S.reportes.filter(r=>r.estado==='pendiente_supervision'&&(!vivId||r.vivienda_id===vivId));
  document.getElementById('pend-sup-list').innerHTML=pend.map(r=>_rowPendSup(r)).join('');
}

function _rowPendSup(r) {
  const p=S.partidas.find(x=>x.partida_id===r.partida_id);
  const puedeActuar=_pendSupQRViv&&_pendSupQRViv.id===r.vivienda_id;
  return `<div class="card" style="margin-bottom:10px">
    <div class="flex-row" style="flex-wrap:wrap;gap:8px">
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${p?.nombre||r.partida_id}</div>
        <div class="text-muted">${r.vivienda_id} · ${formatDate(r.timestamp)}</div>
        ${r.comentario?`<div style="font-size:11px;color:var(--acc)">"${r.comentario}"</div>`:''}
        ${!puedeActuar?`<div style="font-size:10px;color:var(--warn);margin-top:4px">⚠️ Escanea QR de ${r.vivienda_id} para actuar</div>`:''}
      </div>
      <div class="flex-row">
        <button class="btn btn-ok btn-sm" ${puedeActuar?`onclick="quickSupOK('${r.id}')"`:'disabled'}>✅ OK</button>
        <button class="btn btn-danger btn-sm" ${puedeActuar?`onclick="openSupObsModal('${r.id}')"`:'disabled'}>⚠️ Obs</button>
      </div>
    </div>
  </div>`;
}

async function quickSupOK(repId) {
  if (!_pendSupQRViv){toast('warn','Escanea el QR primero');return;}
  await S.supervisar(repId,'ok','',null);
  App._updateBadges(); App._render('pendientes-sup');
}

function openSupObsModal(repId) {
  if (!_pendSupQRViv){toast('warn','Escanea el QR primero');return;}
  const r=S.reportes.find(x=>x.id===repId);
  const p=S.partidas.find(x=>x.partida_id===r?.partida_id);
  document.getElementById('genModalTitle').textContent='⚠️ Registrar Observación';
  document.getElementById('genModalBody').innerHTML=`
    <div class="notif-item warn mb-12">
      <span class="ni-ico">📋</span>
      <div><div class="ni-title">${p?.nombre||r?.partida_id}</div><div class="ni-desc">${r?.vivienda_id} · ${formatDate(r?.timestamp)}</div></div>
    </div>
    <div class="fg"><label class="flbl">Motivo <span style="color:var(--danger)">*</span></label>
    <textarea class="finp" id="obs-motivo-sup" rows="3" placeholder="Mínimo 10 caracteres..."></textarea></div>
    <div class="flex-row">
      <button class="btn btn-danger" onclick="confirmSupObs('${repId}')">Registrar Observación</button>
      <button class="btn btn-ghost" onclick="closeModal('genModal')">Cancelar</button>
    </div>`;
  openModal('genModal');
}

async function confirmSupObs(repId) {
  const m=document.getElementById('obs-motivo-sup')?.value||'';
  if (m.length<10){toast('warn','Motivo muy corto');return;}
  await S.supervisar(repId,'obs',m,null);
  closeModal('genModal'); App._updateBadges(); App._render('pendientes-sup');
}

// ═══════════════════════════════════════════
//  JEFE — GANTT
// ═══════════════════════════════════════════
function renderGantt() {
  if (!S.proyecto) return `<div class="empty-state"><div class="ei">📋</div><div class="et">Sin proyecto activo</div></div>`;
  const meses=ganttMonths(S.proyecto.fecha_inicio,S.proyecto.fecha_termino);
  const partidas=S.partidas.filter(p=>p.cartilla_id_asociada);
  return `
    <div class="ph">
      <div><div class="ph-h1">📊 Tablero <span>Gantt</span></div>
      <div class="ph-desc">${S.proyecto.nombre} · ${S.proyecto.fecha_inicio} → ${S.proyecto.fecha_termino}</div></div>
    </div>
    <div class="gantt-legend">
      ${[['var(--bdr)','Sin iniciar'],['var(--info)','Iniciada'],['var(--acc)','Sup OK'],
         ['var(--warn)','Con observación'],['var(--ok)','Verificada']].map(([c,l])=>
        `<div class="gl-item"><div class="gl-dot" style="background:${c}"></div><span>${l}</span></div>`).join('')}
    </div>
    <div class="filters">
      <select id="gf-viv" onchange="renderGanttTable()">
        <option value="global">Global (todas las viviendas)</option>
        ${(S.viviendas||[]).map(v=>`<option value="${v.id}">Vivienda ${v.numero}</option>`).join('')}
      </select>
      <select id="gf-estado" onchange="renderGanttTable()">
        <option value="">Todos los estados</option>
        <option value="verde">✅ Verificadas</option>
        <option value="amarillo">🟡 Sup OK</option>
        <option value="naranjo">🟠 Con observación</option>
        <option value="azul">🔵 Iniciadas</option>
        <option value="none">⬜ Sin iniciar</option>
      </select>
    </div>
    <div class="gantt-wrap" id="gantt-container">
      ${_buildGantt('global','',meses,partidas)}
    </div>`;
}

function renderGanttTable() {
  const vf=document.getElementById('gf-viv')?.value||'global';
  const ef=document.getElementById('gf-estado')?.value||'';
  const meses=ganttMonths(S.proyecto.fecha_inicio,S.proyecto.fecha_termino);
  const partidas=S.partidas.filter(p=>p.cartilla_id_asociada);
  document.getElementById('gantt-container').innerHTML=_buildGantt(vf,ef,meses,partidas);
}

function _buildGantt(vf,ef,meses,partidas) {
  const totalDays=(new Date(S.proyecto.fecha_termino)-new Date(S.proyecto.fecha_inicio))/(1000*60*60*24);
  const COL_W=Math.max(36,Math.floor(560/(meses.length||1)));
  let rows='', curGrp='';

  partidas.forEach((p,idx)=>{
    const grp=p.codigo_item.split('.')[0];
    if (grp!==curGrp) {
      curGrp=grp;
      rows+=`<tr class="gantt-section"><td class="sticky-col" colspan="2" style="padding:4px 8px">${grp}. ${_grpName(grp)}</td>${meses.map(()=>'<td></td>').join('')}</tr>`;
    }
    let est;
    if (vf==='global') {
      const ests=(S.viviendas||[]).map(v=>S.getAvancePartidaVivienda(p.partida_id,v.id));
      if (ests.every(e=>e==='verde')) est='verde';
      else if (ests.some(e=>e==='naranjo')) est='naranjo';
      else if (ests.some(e=>e==='amarillo')) est='amarillo';
      else if (ests.some(e=>e==='azul')) est='azul';
      else est='none';
    } else est=S.getAvancePartidaVivienda(p.partida_id,vf);
    if (ef&&est!==ef) return;

    const {barStart,barEnd}=ganttBarStyle(idx,partidas.length,S.proyecto.fecha_inicio,S.proyecto.fecha_termino);
    const pct=vf==='global'?S.getAvanceGlobalPartida(p.partida_id):(est==='verde'?100:est==='amarillo'?50:est==='azul'?10:0);
    const colorClass={verde:'gb-verde',amarillo:'gb-amarillo',naranjo:'gb-naranjo',azul:'gb-azul',none:'gb-none'}[est]||'gb-none';
    const badgeCls={verde:'s-ok',amarillo:'s-ver',naranjo:'s-pend',azul:'s-ver',none:'s-none'}[est]||'s-none';

    const mCells=meses.map(m=>{
      const mS=new Date(m.year,m.month,1),mE=new Date(m.year,m.month+1,0);
      if (barStart>mE||barEnd<mS) return `<td style="width:${COL_W}px"></td>`;
      const cS=Math.max(barStart,mS),cE=Math.min(barEnd,mE);
      const mD=(mE-mS)/(1000*60*60*24)+1,cD=(cE-cS)/(1000*60*60*24),cO=(cS-mS)/(1000*60*60*24);
      const w=Math.max(4,Math.round((cD/mD)*COL_W)),off=Math.round((cO/mD)*COL_W);
      return `<td style="width:${COL_W}px;padding:2px 0">
        <div style="position:relative;height:18px">
          <div class="gantt-bar ${colorClass}" style="position:absolute;left:${off}px;width:${w}px"
               title="${p.nombre} · ${pct}% · ${est}"></div>
        </div></td>`;
    }).join('');

    rows+=`<tr>
      <td class="sticky-col" style="min-width:200px;max-width:200px;overflow:hidden;text-overflow:ellipsis;font-size:11px" title="${p.nombre}">
        ${p.codigo_item} · ${p.nombre.substring(0,28)}${p.nombre.length>28?'…':''}</td>
      <td style="text-align:center;padding:2px 5px"><span class="sbadge ${badgeCls}" style="font-size:9px">${pct}%</span></td>
      ${mCells}</tr>`;
  });

  return `<table class="gantt-table">
    <thead><tr>
      <th class="sticky-col" style="min-width:200px">Partida</th>
      <th style="width:50px">Avance</th>
      ${meses.map(m=>`<th class="gantt-month" style="width:${COL_W}px">${m.label}</th>`).join('')}
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// ═══════════════════════════════════════════
//  JEFE — ALERTAS (con botón OK + historial VB)
// ═══════════════════════════════════════════
function renderAlertasJefe() {
  const alertas=S.alertas.filter(a=>!a.gestionada);
  const obsHist=S.observacionesHistorial;
  const vobs=S.verificaciones.filter(v=>v.estado==='verificada').slice(0,10);
  return `
    <div class="ph">
      <div><div class="ph-h1">⚠️ Alertas y <span>Trazabilidad</span></div>
      <div class="ph-desc">${alertas.length} alertas activas</div></div>
    </div>
    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab(this,'tab-alertas-act')">Alertas activas (${alertas.length})</button>
      <button class="tab-btn" onclick="switchTab(this,'tab-obs-hist')">Historial observaciones (${obsHist.length})</button>
      <button class="tab-btn" onclick="switchTab(this,'tab-vob-hist')">V°B° registrados (${vobs.length})</button>
    </div>
    <div class="tab-panel active" id="tab-alertas-act">
      ${alertas.length===0?`<div class="empty-state"><div class="ei">✅</div><div class="et">Sin alertas activas</div></div>`:''}
      ${alertas.map(a=>{
        const p=S.partidas.find(x=>x.partida_id===a.partida_id);
        return `<div class="notif-item ${a.tipo}" style="margin-bottom:8px">
          <span class="ni-ico">${{ok:'✅',warn:'⚠️',danger:'❌',info:'ℹ️'}[a.tipo]}</span>
          <div style="flex:1">
            <div class="ni-title">${a.mensaje}</div>
            <div class="ni-desc">${a.vivienda_id||''} · ${p?.nombre||''} · ${a.actor_origen||''}</div>
            <div style="font-family:var(--mono);font-size:9px;color:var(--txt3)">${formatDate(a.timestamp)}</div>
          </div>
          <button class="btn btn-ok btn-xs" onclick="gestionarAlertaJefe('${a.id}')">OK ✓</button>
        </div>`;
      }).join('')}
    </div>
    <div class="tab-panel" id="tab-obs-hist">
      ${obsHist.length===0?`<div class="empty-state"><div class="ei">📝</div><div class="et">Sin observaciones registradas</div></div>`:''}
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Actor</th><th>Vivienda</th><th>Partida</th><th>Observación</th><th>Fecha</th></tr></thead>
        <tbody>
          ${obsHist.map(o=>{
            const p=S.partidas.find(x=>x.partida_id===o.partida_id);
            return `<tr>
              <td><span class="sbadge ${o.actor==='supervisor'?'s-pend':'s-rej'}">${o.actor}</span></td>
              <td>${o.vivienda_id}</td>
              <td style="font-size:11px">${p?.nombre||o.partida_id}</td>
              <td style="font-size:11px;color:var(--txt2)">${o.observacion}</td>
              <td style="font-size:10px;font-family:var(--mono)">${formatDate(o.timestamp)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>
    <div class="tab-panel" id="tab-vob-hist">
      ${vobs.length===0?`<div class="empty-state"><div class="ei">✅</div><div class="et">Sin V°B° aún</div></div>`:''}
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Vivienda</th><th>Partida</th><th>Autocontrol</th><th>Foto</th><th>Doc</th><th>Fecha</th></tr></thead>
        <tbody>
          ${vobs.map(v=>{
            const p=S.partidas.find(x=>x.partida_id===v.partida_id);
            return `<tr>
              <td>${v.vivienda_id}</td>
              <td style="font-size:11px">${p?.nombre||v.partida_id}</td>
              <td><span class="sbadge s-ok">V°B° ✓</span></td>
              <td>${v.foto_url?'📷':'—'}</td>
              <td>${v.doc_url?'📎':'—'}</td>
              <td style="font-size:10px;font-family:var(--mono)">${formatDate(v.timestamp)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>`;
}

async function gestionarAlertaJefe(id) {
  await S.gestionarAlerta(id);
  App._updateBadges();
  App._render('alertas-jefe');
}

// ═══════════════════════════════════════════
//  AUTOCONTROL — PENDIENTES (QR obligatorio)
// ═══════════════════════════════════════════
let _autoQRViv=null, _autoCartChecks={};

function renderPendAuto() {
  _autoQRViv=null;
  const pend=S.supervisiones.filter(s=>s.estado==='supervisada_ok');
  return `
    <div class="ph">
      <div><div class="ph-h1">✅ Pendientes de <span>Verificación</span></div>
      <div class="ph-desc">${pend.length} partidas · QR obligatorio para V°B°</div></div>
    </div>
    <div class="card mb-12">
      <div class="card-hdr"><div class="card-title">⚠️ Escanear QR obligatorio para dar V°B° o rechazar</div></div>
      <div id="qr-cnt-auto">
        <div class="qr-box" onclick="QRScanner.open('qr-cnt-auto', onQRAuto)">
          <div class="qi">📱</div><div class="qt">Escanea el QR de la vivienda a verificar</div>
          <div class="qs">Comprueba que estás en terreno</div>
        </div>
      </div>
      <div id="auto-qr-badge" style="display:none;margin-top:10px"></div>
    </div>
    <div class="filters">
      <select onchange="filtrarPendAuto()" id="filt-auto-viv">
        <option value="">Todas las viviendas</option>
        ${[...new Set(pend.map(s=>s.vivienda_id))].map(v=>`<option value="${v}">${v}</option>`).join('')}
      </select>
      <select onchange="filtrarPendAuto()" id="filt-auto-part">
        <option value="">Todas las partidas</option>
        ${[...new Set(pend.map(s=>s.partida_id))].map(id=>{
          const p=S.partidas.find(x=>x.partida_id===id);
          return `<option value="${id}">${p?.nombre||id}</option>`;
        }).join('')}
      </select>
    </div>
    ${pend.length===0?`<div class="empty-state"><div class="ei">✅</div><div class="et">Sin pendientes</div></div>`:''}
    <div id="pend-auto-list">${pend.map(s=>_rowPendAuto(s)).join('')}</div>`;
}

function onQRAuto(v) {
  _autoQRViv=v;
  document.getElementById('auto-qr-badge').style.display='';
  document.getElementById('auto-qr-badge').innerHTML=`
    <div class="notif-item ok"><span class="ni-ico">✅</span>
    <div><div class="ni-title">QR válido · Vivienda ${v.id}</div>
    <div class="ni-desc">Puedes dar V°B° o rechazar partidas de esta vivienda</div></div></div>`;
  document.getElementById('filt-auto-viv').value=v.id;
  filtrarPendAuto();
}

function filtrarPendAuto() {
  const vf=document.getElementById('filt-auto-viv')?.value||'';
  const pf=document.getElementById('filt-auto-part')?.value||'';
  const pend=S.supervisiones.filter(s=>
    s.estado==='supervisada_ok'&&(!vf||s.vivienda_id===vf)&&(!pf||s.partida_id===pf));
  document.getElementById('pend-auto-list').innerHTML=pend.map(s=>_rowPendAuto(s)).join('');
}

function _rowPendAuto(s) {
  const p=S.partidas.find(x=>x.partida_id===s.partida_id);
  const cart=S.cartillas.find(c=>c.cartilla_id===p?.cartilla_id_asociada);
  const docReq=cart?.documentos_solicitados;
  const docOk=s.doc_url||S.verificaciones.find(v=>v.supervision_id===s.id)?.doc_url;
  const puedeActuar=_autoQRViv&&_autoQRViv.id===s.vivienda_id;
  return `<div class="card" style="margin-bottom:10px" id="row-pend-auto-${s.id}">
    <div class="flex-row" style="flex-wrap:wrap;gap:8px">
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${p?.nombre||s.partida_id}</div>
        <div class="text-muted">${s.vivienda_id} · Sup OK · ${formatDate(s.timestamp)}</div>
        ${docReq?`<span class="sbadge ${docOk?'s-ok':'s-pend'}" style="margin-top:4px">${docOk?'📎 Doc subido':'📎 Certificado requerido'}</span>`:''}
        ${!puedeActuar?`<div style="font-size:10px;color:var(--warn);margin-top:4px">⚠️ Escanea QR de ${s.vivienda_id} para actuar</div>`:''}
      </div>
      <div class="flex-row" style="flex-wrap:wrap;gap:5px">
        ${docReq&&!docOk?`<button class="btn btn-ghost btn-xs" onclick="abrirSubirDoc('${s.id}')">📎 Subir doc</button>`:''}
        <button class="btn btn-info btn-xs" onclick="abrirCartillaAutoModal('${s.id}')">📋 Cartilla</button>
        <button class="btn btn-ok btn-sm" ${puedeActuar?`onclick="abrirVOBModal('${s.id}')"`:'disabled'}>✅ V°B°</button>
        <button class="btn btn-danger btn-sm" ${puedeActuar?`onclick="abrirRechazarAutoModal('${s.id}')"`:'disabled'}>❌ Rechazar</button>
      </div>
    </div>
  </div>`;
}

function abrirSubirDoc(supId) {
  // Sin QR requerido para subir documentos
  document.getElementById('genModalTitle').textContent='📎 Subir Certificado / Documento';
  document.getElementById('genModalBody').innerHTML=`
    <div class="text-muted mb-12">Puedes subir el documento sin escanear el QR. Al subirlo se marcará automáticamente en la cartilla.</div>
    <div class="fg">
      <label class="flbl">Nombre del documento</label>
      <input class="finp" id="doc-nombre" placeholder="Ej: Certificado mecánica de suelos" value="">
    </div>
    <div class="upzone" onclick="simSubirDoc('${supId}')" style="margin-bottom:12px">
      <div class="ui">📎</div>
      <div class="ut">Toca para seleccionar archivo</div>
      <div class="us">PDF, imagen · máx 10MB</div>
    </div>
    <div id="doc-preview" style="display:none"></div>
    <button class="btn btn-ghost" onclick="closeModal('genModal')">Cancelar</button>`;
  openModal('genModal');
}

function simSubirDoc(supId) {
  const input=document.createElement('input');
  input.type='file'; input.accept='application/pdf,image/*';
  input.onchange=async(e)=>{
    const file=e.target.files[0]; if(!file) return;
    const nombre=document.getElementById('doc-nombre')?.value||file.name;
    const url=URL.createObjectURL(file);
    document.getElementById('doc-preview').style.display='';
    document.getElementById('doc-preview').innerHTML=`<div class="notif-item ok"><span>📎</span><div><div class="ni-title">${file.name}</div><div class="ni-desc">${(file.size/1024).toFixed(1)} KB</div></div></div>`;
    await S.subirDocPendiente(supId, url, nombre);
    closeModal('genModal');
    App._render('pendientes-auto');
  };
  input.click();
}

function abrirCartillaAutoModal(supId) {
  // Cartilla siempre accesible para ver, pero V°B° requiere QR
  const sup=S.supervisiones.find(s=>s.id===supId);
  const p=S.partidas.find(x=>x.partida_id===sup?.partida_id);
  const cart=S.cartillas.find(c=>c.cartilla_id===p?.cartilla_id_asociada);
  if (!cart) {toast('warn','Sin cartilla asociada');return;}
  _renderCartillaModal(cart, sup?.vivienda_id, supId, false);
}

function abrirVOBModal(supId) {
  if (!_autoQRViv){toast('warn','Escanea el QR primero');return;}
  const sup=S.supervisiones.find(s=>s.id===supId);
  const p=S.partidas.find(x=>x.partida_id===sup?.partida_id);
  const cart=S.cartillas.find(c=>c.cartilla_id===p?.cartilla_id_asociada);
  if (cart) { _renderCartillaModal(cart, sup?.vivienda_id, supId, true); return; }
  // Sin cartilla: confirmar directo
  document.getElementById('genModalTitle').textContent='✅ Dar V°B°';
  document.getElementById('genModalBody').innerHTML=`
    <p class="text-muted mb-12">${p?.nombre||sup?.partida_id} · ${sup?.vivienda_id}</p>
    <div class="fg"><label class="flbl">Foto obligatoria <span style="color:var(--danger)">*</span></label>
    <div class="photo-grid" id="foto-grid-vob">
      <div class="photo-add" onclick="capturarFoto('foto-grid-vob','vob')"><span>📷</span><span>Foto</span></div>
    </div></div>
    <div class="flex-row mt-12">
      <button class="btn btn-ok" onclick="submitVOBSimple('${supId}')">✅ Confirmar V°B°</button>
      <button class="btn btn-ghost" onclick="closeModal('genModal')">Cancelar</button>
    </div>`;
  openModal('genModal');
}

async function submitVOBSimple(supId) {
  if (!_fotosTemp.length){toast('warn','Foto obligatoria');return;}
  await S.verificarAutocontrol(supId,'vob','',{},_fotosTemp[0]||null,null);
  closeModal('genModal'); App._updateBadges(); App._render('pendientes-auto');
}

function _renderCartillaModal(cart, vivId, supId, puedeVOB) {
  const prog=S.getCartillaProgress(supId);
  const todosChecked=cart.items?.length>0&&cart.items.every(item=>prog[item.item_id]);
  document.getElementById('genModalTitle').textContent=`📋 ${cart.nombre_partida} · ${vivId}`;
  document.getElementById('genModalBody').innerHTML=`
    <div class="flex-row mb-12">
      <span class="chip">Vivienda: ${vivId}</span>
      ${cart.documentos_solicitados?`<span class="sbadge s-pend">📎 Requiere certificado</span>`:''}
      ${puedeVOB?'<button class="btn btn-ghost btn-xs" onclick="marcarTodosCartilla(\''+supId+'\')">☑️ Marcar todas</button>':''}
    </div>
    <table class="cartilla-tbl">
      <thead><tr><th>N°</th><th>Ítem de verificación</th>${cart.documentos_solicitados?'<th>Doc</th>':''}<th>✓</th></tr></thead>
      <tbody>
        ${(cart.items||[]).map((item,i)=>`
          <tr id="ctr-${item.item_id}">
            <td class="text-mono" style="color:var(--acc);font-size:11px">${i+1}</td>
            <td>${item.descripcion}</td>
            ${cart.documentos_solicitados?`<td>${item.evidencia_documental?'📎':''}</td>`:''}
            <td><div class="chk ${prog[item.item_id]?'checked':''}" id="chk-${item.item_id}"
              onclick="${puedeVOB?`toggleChkAuto('${supId}','${item.item_id}',this)`:'void(0)'}"
              style="${!puedeVOB?'cursor:default;opacity:.6':''}">${prog[item.item_id]?'✓':''}</div></td>
          </tr>`).join('')}
      </tbody>
    </table>
    <div class="divider"></div>
    ${puedeVOB?`
    <div class="fg"><label class="flbl">Foto final obligatoria <span style="color:var(--danger)">*</span></label>
    <div class="photo-grid" id="foto-grid-cart">
      <div class="photo-add" onclick="capturarFoto('foto-grid-cart','cart')"><span>📷</span><span>Foto final</span></div>
    </div></div>
    ${cart.documentos_solicitados?`
    <div class="fg"><label class="flbl">Certificado / Documento</label>
    <div class="upzone" onclick="simSubirDoc('${supId}')">
      <div class="ui">📎</div><div class="ut">Subir certificado</div><div class="us">PDF, imagen</div>
    </div></div>`:''}
    <div id="obs-hist-cart">
      ${S.observacionesHistorial.filter(o=>o.partida_id===S.supervisiones.find(s=>s.id===supId)?.partida_id).length?`
        <label class="flbl" style="margin-top:10px">Historial de observaciones</label>
        ${S.observacionesHistorial.filter(o=>o.partida_id===S.supervisiones.find(s=>s.id===supId)?.partida_id).map(o=>`
          <div class="notif-item danger" style="margin-bottom:5px">
            <span class="ni-ico">📝</span>
            <div><div class="ni-title">${o.actor}: ${o.observacion}</div>
            <div class="ni-desc">${formatDate(o.timestamp)}</div></div>
          </div>`).join('')}
      `:''}
    </div>
    <div class="flex-row mt-12">
      <button class="btn btn-ok" onclick="submitVOBCartilla('${supId}')">✅ Dar V°B° y guardar cartilla</button>
      <button class="btn btn-ghost btn-sm" onclick="guardarCartilla('${supId}')">💾 Guardar avance</button>
      <button class="btn btn-ghost" onclick="closeModal('genModal')">Cancelar</button>
    </div>
    ` : `
    <p class="text-muted">Vista de cartilla (solo lectura). Escanea el QR para dar V°B°.</p>
    <button class="btn btn-ghost" onclick="closeModal('genModal')">Cerrar</button>
    `}`;
  openModal('genModal');
}

function toggleChkAuto(supId, itemId, el) {
  el.classList.toggle('checked');
  el.textContent=el.classList.contains('checked')?'✓':'';
  S.saveCartillaProgress(supId, itemId, el.classList.contains('checked'));
}

function marcarTodosCartilla(supId) {
  document.querySelectorAll('[id^="chk-"]').forEach(el=>{
    if (!el.classList.contains('checked')) {
      el.classList.add('checked'); el.textContent='✓';
      const itemId=el.id.replace('chk-','');
      S.saveCartillaProgress(supId, itemId, true);
    }
  });
  toast('ok','Todos los ítems marcados');
}

function guardarCartilla(supId) {
  // Ya se va guardando en tiempo real, confirmar al usuario
  toast('ok','Progreso guardado correctamente');
}

async function submitVOBCartilla(supId) {
  if (!_fotosTemp.length){toast('warn','Foto final obligatoria');return;}
  const cart=_getCartillaDeSup(supId);
  const prog=S.getCartillaProgress(supId);
  const checks=cart?cart.items.filter(it=>prog[it.item_id]).map(it=>it.item_id):[];
  const sup=S.supervisiones.find(s=>s.id===supId);
  const docUrl=S.verificaciones.find(v=>v.supervision_id===supId)?.doc_url||sup?.doc_url||null;
  await S.verificarAutocontrol(supId,'vob','',checks,_fotosTemp[0]||null,docUrl);
  closeModal('genModal'); App._updateBadges(); App._render('pendientes-auto');
}

function _getCartillaDeSup(supId) {
  const sup=S.supervisiones.find(s=>s.id===supId);
  const p=S.partidas.find(x=>x.partida_id===sup?.partida_id);
  return S.cartillas.find(c=>c.cartilla_id===p?.cartilla_id_asociada)||null;
}

function abrirRechazarAutoModal(supId) {
  if (!_autoQRViv){toast('warn','Escanea el QR primero');return;}
  const obsHist=S.observacionesHistorial.filter(o=>{
    const sup=S.supervisiones.find(s=>s.id===supId);
    return o.partida_id===sup?.partida_id&&o.vivienda_id===sup?.vivienda_id;
  });
  document.getElementById('genModalTitle').textContent='❌ Rechazar Partida';
  document.getElementById('genModalBody').innerHTML=`
    ${obsHist.length?`<div class="mb-12">
      <label class="flbl">Historial de observaciones previas</label>
      ${obsHist.map(o=>`<div class="notif-item danger" style="margin-bottom:5px">
        <span class="ni-ico">📝</span><div><div class="ni-title">${o.actor}: ${o.observacion}</div>
        <div class="ni-desc">${formatDate(o.timestamp)}</div></div></div>`).join('')}
    </div>`:``}
    <div class="fg"><label class="flbl">Motivo del rechazo <span style="color:var(--danger)">*</span></label>
    <textarea class="finp" id="motivo-rech-auto" rows="3" placeholder="Especifica el incumplimiento técnico..."></textarea></div>
    <div class="flex-row">
      <button class="btn btn-danger" onclick="submitRechazoAuto('${supId}')">Confirmar Rechazo</button>
      <button class="btn btn-ghost" onclick="closeModal('genModal')">Cancelar</button>
    </div>`;
  openModal('genModal');
}

async function submitRechazoAuto(supId) {
  const m=document.getElementById('motivo-rech-auto')?.value||'';
  if (!m.trim()){toast('warn','Ingresa el motivo');return;}
  await S.verificarAutocontrol(supId,'rechazar',m,[],null,null);
  closeModal('genModal'); App._updateBadges(); App._render('pendientes-auto');
}

// ═══════════════════════════════════════════
//  AUTOCONTROL — CARTILLAS (requiere QR)
// ═══════════════════════════════════════════
function renderCartillasAuto() {
  _QRViv=null;
  return `
    <div class="ph">
      <div><div class="ph-h1">📋 Cartillas de <span>Control</span></div>
      <div class="ph-desc">Escanea el QR de la vivienda para acceder</div></div>
    </div>
    <div class="card" id="cart-qr-card">
      <div class="card-hdr"><div class="card-title">⚠️ Escanear QR obligatorio</div></div>
      <div id="qr-cnt-cart">
        <div class="qr-box" onclick="QRScanner.open('qr-cnt-cart', onQRCartillas)">
          <div class="qi">📱</div><div class="qt">Escanea para ver cartillas de la vivienda</div>
        </div>
      </div>
    </div>
    <div id="cart-list" style="display:none">
      <div class="card">
        <div class="card-hdr">
          <div><div class="card-title" id="cart-viv-lbl">Vivienda -</div></div>
          <button class="btn btn-ghost btn-sm" onclick="resetCartillasAuto()">↩ Cambiar QR</button>
        </div>
        <div id="cart-items"></div>
      </div>
    </div>`;
}

function onQRCartillas(v) {
  _QRViv=v;
  document.getElementById('cart-qr-card').style.display='none';
  document.getElementById('cart-list').style.display='';
  document.getElementById('cart-viv-lbl').textContent=`Vivienda ${v.id}`;
  // Buscar supervisiones de esta vivienda para asociar supId
  const supViv=S.supervisiones.filter(s=>s.vivienda_id===v.id&&s.estado==='supervisada_ok');
  const el=document.getElementById('cart-items');
  el.innerHTML=S.cartillas.map(c=>{
    const sup=supViv.find(s=>{const p=S.partidas.find(x=>x.partida_id===s.partida_id);return p?.cartilla_id_asociada===c.cartilla_id;});
    const fto=S.propuestas.find(p=>p.estado==='aprobada'&&p.items?.some(i=>i.partida_id===sup?.partida_id));
    return `<div class="notif-item info" style="cursor:pointer;margin-bottom:6px"
      onclick="${sup?`verCartillaAutoViv('${c.cartilla_id}','${v.id}','${sup?.id||''}',true)`:`toast('warn','Sin supervisión activa para esta partida')`}">
      <span class="ni-ico">📋</span>
      <div>
        <div class="ni-title">${c.nombre_partida}</div>
        <div class="ni-desc">${(c.items||[]).length} ítems · ${c.documentos_solicitados?'📎 Requiere doc':'Sin docs'}</div>
        ${fto?`<span class="sbadge s-ok" style="margin-top:2px">✍️ Firmada por FTO</span>`:''}
      </div>
      <button class="btn btn-ghost btn-xs">Ver →</button>
    </div>`;
  }).join('');
}

function resetCartillasAuto() {
  _QRViv=null;
  document.getElementById('cart-qr-card').style.display='';
  document.getElementById('cart-list').style.display='none';
  document.getElementById('qr-cnt-cart').innerHTML=`
    <div class="qr-box" onclick="QRScanner.open('qr-cnt-cart', onQRCartillas)">
      <div class="qi">📱</div><div class="qt">Escanea para ver cartillas</div></div>`;
}

function verCartillaAutoViv(cartId, vivId, supId, puedeVOB) {
  const cart=S.cartillas.find(c=>c.cartilla_id===cartId); if(!cart) return;
  _renderCartillaModal(cart, vivId, supId, puedeVOB&&!!_autoQRViv);
}

// ═══════════════════════════════════════════
//  ADMIN — RESUMEN
// ═══════════════════════════════════════════
function renderResumenAdmin() {
  return `
    <div class="ph">
      <div><div class="ph-h1">📈 Resumen de <span>Avance</span></div>
      <div class="ph-desc">Estado de pago · Proyecto ${S.proyecto?.codigo||'—'}</div></div>
      <div class="ph-actions">
        <button class="btn btn-ghost btn-sm" onclick="selDisponibles()">☑️ Seleccionar disponibles</button>
        <button class="btn btn-pri" onclick="crearPropuestaSeleccion()">💰 Crear Propuesta</button>
      </div>
    </div>
    <div class="filters">
      <select id="adm-fviv" onchange="renderTablaAdm()">
        <option value="global">Global</option>
        ${(S.viviendas||[]).map(v=>`<option value="${v.id}">Vivienda ${v.numero}</option>`).join('')}
      </select>
      <select id="adm-fest" onchange="renderTablaAdm()">
        <option value="">Todos</option>
        <option value="disponible">✅ Disponibles</option>
        <option value="pendiente">⏳ Pendiente auto</option>
        <option value="sin_cert">📎 Falta certificado</option>
        <option value="alerta">⚠️ Con alerta</option>
      </select>
    </div>
    <div id="adm-totales" style="margin-bottom:12px"></div>
    <div class="ptbl-wrap" id="adm-tabla">${_buildTablaAdm('global','')}</div>`;
}

function renderTablaAdm() {
  const vf=document.getElementById('adm-fviv')?.value||'global';
  const ef=document.getElementById('adm-fest')?.value||'';
  document.getElementById('adm-tabla').innerHTML=_buildTablaAdm(vf,ef);
  _renderTotalesAdm(vf);
}

function _renderTotalesAdm(vivFilter) {
  let totalUF=0, avActualUF=0, avAnteriorUF=0;
  S.partidas.forEach(p=>{
    const total=p.total_uf||(p.cantidad_contrato*p.precio_unitario_uf*1.25)||0;
    const avAct=S.getAvanceGlobalPartida(p.partida_id)/100;
    const avAnt=_avAnterior(p.partida_id)/100;
    totalUF+=total; avActualUF+=total*avAct; avAnteriorUF+=total*avAnt;
  });
  const dif=avActualUF-avAnteriorUF;
  document.getElementById('adm-totales').innerHTML=`
    <div class="flex-row" style="gap:14px;flex-wrap:wrap;padding:10px 14px;background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r);font-size:12px">
      <div><div style="font-size:10px;color:var(--txt2);font-family:var(--mono);text-transform:uppercase">Total Contrato</div>
           <div class="text-mono" style="font-size:14px;font-weight:700">${totalUF.toFixed(3)} UF</div></div>
      <div><div style="font-size:10px;color:var(--txt2);font-family:var(--mono);text-transform:uppercase">Avance Actual</div>
           <div class="text-mono" style="font-size:14px;color:var(--ok)">${avActualUF.toFixed(3)} UF</div></div>
      <div><div style="font-size:10px;color:var(--txt2);font-family:var(--mono);text-transform:uppercase">Avance Anterior</div>
           <div class="text-mono" style="font-size:14px;color:var(--txt2)">${avAnteriorUF.toFixed(3)} UF</div></div>
      <div><div style="font-size:10px;color:var(--txt2);font-family:var(--mono);text-transform:uppercase">Diferencia</div>
           <div class="text-mono" style="font-size:14px;color:${dif>=0?'var(--ok)':'var(--danger)'}">${dif>=0?'+':''}${dif.toFixed(3)} UF</div></div>
    </div>`;
}

function _buildTablaAdm(vf, ef) {
  const secs=_agruparSecs(S.partidas);
  let rows='';
  for (const [sec,parts] of Object.entries(secs)) {
    rows+=`<tr class="section-row"><td colspan="10">${sec}. ${_grpName(sec)}</td></tr>`;
    for (const p of parts) {
      const total=p.total_uf||(p.cantidad_contrato*p.precio_unitario_uf*1.25)||0;
      const avAct=S.avanceManual[p.partida_id]!==undefined?S.avanceManual[p.partida_id]:S.getAvanceGlobalPartida(p.partida_id);
      const avAnt=_avAnterior(p.partida_id);
      const estP=_estadoAdm(p.partida_id,vf);
      if (ef&&ef!==estP) continue;
      const alerta=S.alertas.find(a=>a.partida_id===p.partida_id&&!a.gestionada);
      const estIcon={disponible:'✅',pendiente:'⏳',sin_cert:'📎',alerta:'⚠️'}[estP]||'';
      rows+=`<tr>
        <td><input type="checkbox" class="prop-chk" data-id="${p.partida_id}" data-pct="${avAct}" ${estP==='disponible'?'':' disabled'}></td>
        <td class="text-mono" style="font-size:10px">${p.codigo_item}</td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.nombre}">${p.nombre}</td>
        <td class="num">${p.unidad||'-'}</td>
        <td class="num">${(p.cantidad_contrato||0).toLocaleString('es-CL',{minimumFractionDigits:2})}</td>
        <td class="num">${(p.precio_unitario_uf||0).toLocaleString('es-CL',{minimumFractionDigits:2})}</td>
        <td class="num">${total.toLocaleString('es-CL',{minimumFractionDigits:2})}</td>
        <td class="num">
          <input class="inline-edit" type="number" min="0" max="100" value="${avAct}"
            onchange="S.setAvanceManual('${p.partida_id}',+this.value);renderTablaAdm()">%
        </td>
        <td class="num ${avAct>0?'avance-ok':'avance-pend'}">${(total*avAct/100).toLocaleString('es-CL',{minimumFractionDigits:3})} UF</td>
        <td class="num" style="color:var(--txt3)">${avAnt}%</td>
        <td style="text-align:center;white-space:nowrap">
          ${estIcon} ${alerta?`<span class="sbadge s-pend" style="font-size:9px">⚠️</span>`:''}
        </td>
      </tr>`;
    }
  }
  return `<table class="ptbl">
    <thead><tr>
      <th></th><th>Ítem</th><th>Designación</th>
      <th class="num">Unidad</th><th class="num">Cantidad</th>
      <th class="num">P. Unit UF</th><th class="num">Total</th>
      <th class="num">Av. Actual %</th><th class="num">Valor UF</th>
      <th class="num">Av. Anterior</th><th>Estado</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function selDisponibles() {
  document.querySelectorAll('.prop-chk:not(:disabled)').forEach(c=>c.checked=true);
  toast('ok','Partidas disponibles seleccionadas');
}

async function crearPropuestaSeleccion() {
  const checks=Array.from(document.querySelectorAll('.prop-chk:checked'));
  if (!checks.length){toast('warn','Selecciona al menos una partida');return;}
  const items=checks.map(c=>({partida_id:c.dataset.id,pct_propuesto:+c.dataset.pct}));
  await S.crearPropuesta(items);
  App._render('propuestas-admin'); App._render('resumen-admin');
}

// ═══════════════════════════════════════════
//  ADMIN — PROPUESTAS
// ═══════════════════════════════════════════
function renderPropuestasAdmin() {
  return `
    <div class="ph">
      <div><div class="ph-h1">💰 Propuestas de <span>Pago</span></div></div>
      <button class="btn btn-ghost btn-sm" onclick="App.go('resumen-admin')">+ Nueva desde Resumen</button>
    </div>
    ${S.propuestas.length===0?`<div class="empty-state"><div class="ei">💰</div><div class="et">Sin propuestas</div></div>`:''}
    ${S.propuestas.map(prop=>`
      <div class="card" style="margin-bottom:14px">
        <div class="card-hdr">
          <div><div class="card-title">${prop.id}</div>
          <div class="card-sub">${prop.items?.length||0} partidas · ${formatDate(prop.fecha)}</div></div>
          <span class="sbadge ${prop.estado==='aprobada'?'s-ok':prop.estado==='rechazada'?'s-rej':'s-pend'}">
            ${prop.estado==='aprobada'?'✅ Aprobada':prop.estado==='rechazada'?'❌ Rechazada':'⏳ Pendiente FTO'}
          </span>
        </div>
        ${prop.firma_digital?`<div class="firma-box"><span class="firma-ico">✍️</span>
          <div><div class="firma-title">Aprobado · Firma FTO</div>
          <div class="firma-hash">${prop.firma_digital} · ${formatDate(prop.fecha_resolucion)}</div></div></div>`:
          prop.comentario_fto?`<div class="notif-item danger"><span class="ni-ico">❌</span>
          <div><div class="ni-title">Rechazada</div><div class="ni-desc">${prop.comentario_fto}</div></div></div>`:''}
      </div>`).join('')}`;
}

// ═══════════════════════════════════════════
//  FTO — REVISIÓN (sin pagadas)
// ═══════════════════════════════════════════
function renderRevisionFTO() {
  // Solo mostrar las NO aprobadas aún
  const props=S.propuestas.filter(p=>p.estado!=='aprobada');
  return `
    <div class="ph">
      <div><div class="ph-h1">✍️ Estados de <span>Pago</span></div>
      <div class="ph-desc">${props.filter(p=>p.estado==='pendiente_fto').length} pendientes</div></div>
    </div>
    ${props.length===0?`<div class="empty-state"><div class="ei">✅</div><div class="et">Sin propuestas pendientes</div></div>`:''}
    ${props.map(prop=>`
      <div class="card" style="margin-bottom:14px">
        <div class="card-hdr">
          <div><div class="card-title">${prop.id}</div>
          <div class="card-sub">${prop.items?.length||0} partidas · ${formatDate(prop.fecha)}</div></div>
          <span class="sbadge ${prop.estado==='rechazada'?'s-rej':'s-pend'}">
            ${prop.estado==='rechazada'?'❌ Rechazada':'⏳ Pendiente revisión'}
          </span>
        </div>
        ${prop.estado==='pendiente_fto'?`
        <div class="tabs">
          <button class="tab-btn active" onclick="switchTab(this,'tab-fto-part-${prop.id}')">Partidas</button>
          <button class="tab-btn" onclick="switchTab(this,'tab-fto-cart-${prop.id}')">Cartillas</button>
        </div>
        <div class="tab-panel active" id="tab-fto-part-${prop.id}">
          ${_buildTablaFTO(prop)}
        </div>
        <div class="tab-panel" id="tab-fto-cart-${prop.id}">
          ${_buildCartillasFTO(prop)}
        </div>
        <div class="divider"></div>
        <div class="flex-row">
          <button class="btn btn-ok" onclick="aprobarFTO('${prop.id}')">✅ Aprobar con Firma Digital</button>
          <button class="btn btn-danger" onclick="abrirRechazarFTO('${prop.id}')">❌ Rechazar</button>
        </div>
        `:prop.comentario_fto?`<div class="notif-item danger"><span class="ni-ico">❌</span>
          <div><div class="ni-title">Rechazada</div><div class="ni-desc">${prop.comentario_fto}</div></div></div>`:''}
      </div>`).join('')}`;
}

function _buildTablaFTO(prop) {
  const items=prop.items||[];
  return `<div class="ptbl-wrap" style="max-height:280px"><table class="ptbl">
    <thead><tr><th>Ítem</th><th>Designación</th>
    <th class="num">Total</th><th class="num">Propuesto%</th>
    <th class="num">Mod. FTO%</th><th class="num">Valor UF</th><th class="num">Anterior</th></tr></thead>
    <tbody>
      ${items.map(item=>{
        const p=S.partidas.find(x=>x.partida_id===item.partida_id);
        const total=p?(p.total_uf||(p.cantidad_contrato*p.precio_unitario_uf*1.25)):0;
        return `<tr>
          <td class="text-mono" style="font-size:10px">${p?.codigo_item||''}</td>
          <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p?.nombre||item.partida_id}</td>
          <td class="num">${total.toLocaleString('es-CL',{minimumFractionDigits:2})}</td>
          <td class="num avance-ok">${item.pct_propuesto||0}%</td>
          <td class="num"><input class="editable-pct" type="number" min="0" max="100"
            value="${item.pct_propuesto||0}" id="fto-pct-${item.partida_id}"
            onchange="recalcFTO('${item.partida_id}',this.value,${total})">%</td>
          <td class="num" id="fto-val-${item.partida_id}">${(total*(item.pct_propuesto||0)/100).toLocaleString('es-CL',{minimumFractionDigits:3})} UF</td>
          <td class="num" style="color:var(--txt3)">${_avAnterior(item.partida_id)}%</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table></div>`;
}

function _buildCartillasFTO(prop) {
  // Mostrar cartillas agrupadas por partida
  const items=prop.items||[];
  const vistas=new Set(); let html='';
  for (const item of items) {
    const p=S.partidas.find(x=>x.partida_id===item.partida_id);
    const cartId=p?.cartilla_id_asociada;
    if (!cartId||vistas.has(cartId)) continue;
    vistas.add(cartId);
    const cart=S.cartillas.find(c=>c.cartilla_id===cartId);
    if (!cart) continue;
    // Ver si ya fue firmada por FTO
    const firma=S.propuestas.find(pr=>pr.estado==='aprobada'&&pr.items?.some(i=>i.partida_id===item.partida_id));
    html+=`<div style="margin-bottom:14px">
      <div class="flex-row mb-12">
        <div class="card-title">${cart.nombre_partida}</div>
        ${firma?`<span class="sbadge s-ok">✍️ Firmada FTO</span>`:''}
        ${!firma?`<button class="btn btn-ghost btn-xs" onclick="firmarCartillaFTO('${cartId}')">✍️ Firmar cartilla</button>`:''}
      </div>
      <table class="cartilla-tbl">
        <thead><tr><th>N°</th><th>Ítem</th><th>✓ FTO</th></tr></thead>
        <tbody>
          ${(cart.items||[]).map((item,i)=>`
            <tr><td class="text-mono" style="color:var(--acc);font-size:11px">${i+1}</td>
            <td>${item.descripcion}</td>
            <td><div class="chk" onclick="this.classList.toggle('checked');this.textContent=this.classList.contains('checked')?'✓':''"></div></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }
  return html||`<div class="text-muted">Sin cartillas asociadas</div>`;
}

function firmarCartillaFTO(cartId) {
  toast('ok',`Cartilla ${cartId} firmada digitalmente por FTO`);
}

function recalcFTO(partidaId, val, total) {
  const pct=Math.min(100,Math.max(0,parseFloat(val)||0));
  const el=document.getElementById(`fto-val-${partidaId}`);
  if (el) el.textContent=(total*pct/100).toLocaleString('es-CL',{minimumFractionDigits:3})+' UF';
}

async function aprobarFTO(propId) {
  const prop=S.propuestas.find(p=>p.id===propId); if(!prop) return;
  const ajustes=(prop.items||[]).map(item=>({
    partida_id:item.partida_id,
    pct_aprobado:parseFloat(document.getElementById(`fto-pct-${item.partida_id}`)?.value||item.pct_propuesto||0)
  }));
  await S.resolverFTO(propId,'aprobar','Aprobado por FTO',ajustes);
  App._render('revision-fto'); App._render('historial-fto'); App._updateBadges();
}

function abrirRechazarFTO(propId) {
  document.getElementById('genModalTitle').textContent='❌ Rechazar Propuesta';
  document.getElementById('genModalBody').innerHTML=`
    <div class="fg"><label class="flbl">Motivo <span style="color:var(--danger)">*</span></label>
    <textarea class="finp" id="fto-rech-motivo" rows="3" placeholder="Detalle el incumplimiento..."></textarea></div>
    <div class="flex-row">
      <button class="btn btn-danger" onclick="submitRechazarFTO('${propId}')">Confirmar Rechazo</button>
      <button class="btn btn-ghost" onclick="closeModal('genModal')">Cancelar</button>
    </div>`;
  openModal('genModal');
}

async function submitRechazarFTO(propId) {
  const m=document.getElementById('fto-rech-motivo')?.value||'';
  if (!m.trim()){toast('warn','Ingresa el motivo');return;}
  await S.resolverFTO(propId,'rechazar',m,[]);
  closeModal('genModal'); App._render('revision-fto'); App._updateBadges();
}

// ═══════════════════════════════════════════
//  FTO — HISTORIAL
// ═══════════════════════════════════════════
function renderHistorialFTO() {
  const hist=S.propuestas.filter(p=>p.estado==='aprobada');
  return `
    <div class="ph"><div><div class="ph-h1">📜 Historial de <span>Aprobaciones</span></div></div></div>
    ${hist.length===0?`<div class="empty-state"><div class="ei">📜</div><div class="et">Sin historial</div></div>`:''}
    <div class="card"><div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Propuesta</th><th>Fecha aprobación</th><th>Partidas</th><th>Firma Digital</th></tr></thead>
      <tbody>
        ${hist.map(p=>`<tr>
          <td class="text-mono" style="font-size:10px">${p.id}</td>
          <td>${formatDate(p.fecha_resolucion)}</td>
          <td>${p.items?.length||0}</td>
          <td class="text-mono" style="font-size:10px;color:var(--ok)">${p.firma_digital||'-'}</td>
        </tr>`).join('')}
      </tbody>
    </table></div></div>`;
}

// ═══════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════
function _agruparSecs(partidas) {
  const m={};
  for (const p of partidas) {
    const s=p.codigo_item.split('.')[0];
    if (!m[s]) m[s]=[];
    m[s].push(p);
  }
  return m;
}
function _grpName(s) {
  return {1:'Gastos adicionales, obras prov. y trabajos previos',2:'Obras de construcción',
          3:'Instalaciones y terminaciones',4:'Obras exteriores',5:'Urbanización',6:'Misceláneos'}[s]||`Sección ${s}`;
}
function _avAnterior(partidaId) {
  const aprs=S.propuestas.filter(p=>p.estado==='aprobada'&&p.ajustes_fto?.length);
  for (const p of [...aprs].reverse()) {
    const aj=(p.ajustes_fto||[]).find(a=>a.partida_id===partidaId);
    if (aj) return aj.pct_aprobado;
  }
  return 0;
}
function _estadoAdm(partidaId, vivFilter) {
  const disp=S.getPartidasDisponiblesCobro().some(v=>v.partida_id===partidaId);
  if (disp) {
    const alerta=S.alertas.find(a=>a.partida_id===partidaId&&!a.gestionada);
    return alerta?'alerta':'disponible';
  }
  const ver=S.verificaciones.find(v=>v.partida_id===partidaId&&v.estado==='verificada');
  if (!ver) return 'pendiente';
  return 'sin_cert';
}
function _sb(pg,n) {
  const el=document.getElementById(`badge-${pg}`);
  if (el){el.textContent=n;el.style.display=n>0?'':'none';}
}
function _demoName(a) {
  return {maestro:'José Ramos',supervisor:'Carmen García',jefe:'Luis Pérez',
          autocontrol:'Ana Molina',admin:'Roberto Silva',fto:'María Vega'}[a]||'Usuario';
}
function _rolDesc(k) {
  return {maestro:'Ejecuta en terreno',supervisor:'Verifica en terreno',jefe:'Coordina avances',
          autocontrol:'Control de calidad',admin:'Gestiona pagos',fto:'Fiscaliza SERVIU'}[k]||'';
}

// ── CAPTURA DE FOTOS ──
function capturarFoto(gridId, ctx) {
  const inp=document.createElement('input');
  inp.type='file'; inp.accept='image/*,video/*'; inp.capture='environment';
  inp.onchange=(e)=>{
    const file=e.target.files[0]; if(!file) return;
    const url=URL.createObjectURL(file);
    _fotosTemp.push(url);
    const grid=document.getElementById(gridId); if(!grid) return;
    const add=grid.querySelector('.photo-add');
    const div=document.createElement('div');
    div.className='photo-thumb';
    div.innerHTML=`<img src="${url}" style="width:100%;height:100%;object-fit:cover"><button class="pdel" onclick="this.parentElement.remove()">×</button>`;
    grid.insertBefore(div,add);
    toast('ok','Foto adjuntada');
    const sb=document.getElementById('btn-submit-maestro');
    if(sb) sb.disabled=false;
  };
  inp.click();
}
