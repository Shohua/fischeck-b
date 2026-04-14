// ================================================================
//  FISCHECK R03 — State & DB Adapter
// ================================================================

const SUPA = {
  url: '',   // ← pega tu URL
  key: '',   // ← pega tu anon key
  client: null,
  ready: false,
  init() {
    if (!this.url || !this.key) return false;
    try {
      this.client = window.supabase?.createClient(this.url, this.key);
      this.ready = !!this.client;
    } catch(e) { this.ready = false; }
    return this.ready;
  }
};

const S = {
  actor: null, user: null, proyecto: null,
  partidas: [], cartillas: [], viviendas: [],
  reportes: [], supervisiones: [], verificaciones: [],
  propuestas: [], notificaciones: [], alertas: [],
  observacionesHistorial: [],
  cartillaProgress: {},   // {supId: {itemId: bool}}
  avanceManual: {},       // {partida_id: pct}
  _init: false,

  async boot() {
    if (this._init) return;
    this._init = true;
    SUPA.init();
    await this._loadJSON();
    try {
      const s = localStorage.getItem('fc_cart_progress');
      if (s) this.cartillaProgress = JSON.parse(s);
      const am = localStorage.getItem('fc_avance_manual');
      if (am) this.avanceManual = JSON.parse(am);
    } catch(e) {}
  },

  async _loadJSON() {
    try {
      const [pR, cR] = await Promise.all([fetch('./data/partidas.json'), fetch('./data/cartillas.json')]);
      this.partidas  = await pR.json();
      this.cartillas = await cR.json();
    } catch(e) { this.partidas = []; this.cartillas = []; }
  },

  // ── CARTILLA PROGRESS ──
  saveCartillaProgress(supId, itemId, checked) {
    if (!this.cartillaProgress[supId]) this.cartillaProgress[supId] = {};
    this.cartillaProgress[supId][itemId] = checked;
    try { localStorage.setItem('fc_cart_progress', JSON.stringify(this.cartillaProgress)); } catch(e) {}
    if (SUPA.ready) {
      SUPA.client.from('cartilla_progress').upsert(
        { supervision_id: supId, item_id: itemId, checked, actor_id: this.user?.id,
          vivienda_id: this.supervisiones.find(s=>s.id===supId)?.vivienda_id,
          updated_at: new Date().toISOString() },
        { onConflict: 'supervision_id,item_id' }
      ).then(()=>{});
    }
  },
  getCartillaProgress(supId) { return this.cartillaProgress[supId] || {}; },

  // ── AVANCE MANUAL ADMIN ──
  setAvanceManual(partidaId, pct) {
    this.avanceManual[partidaId] = pct;
    try { localStorage.setItem('fc_avance_manual', JSON.stringify(this.avanceManual)); } catch(e) {}
    if (SUPA.ready) {
      SUPA.client.from('partidas_proyecto').upsert(
        { proyecto_id: this.proyecto?.id, partida_id: partidaId, avance_actual: pct, manual: true },
        { onConflict: 'proyecto_id,partida_id' }
      ).then(()=>{});
    }
  },

  // ── PROYECTO ──
  async crearProyecto(data) {
    const p = {
      id: 'PROY-' + Date.now(),
      nombre: data.nombre, codigo: data.codigo,
      num_viviendas: parseInt(data.num_viviendas),
      monto_total_uf: parseFloat(data.monto_total_uf) || 0,
      fecha_inicio: data.fecha_inicio, fecha_termino: data.fecha_termino,
      created_at: new Date().toISOString()
    };
    if (SUPA.ready) {
      const { data: d, error } = await SUPA.client.from('proyectos').insert(p).select().single();
      if (error) throw error;
      this.proyecto = d;
      await this._generarViviendas(d.id, p.num_viviendas);
    } else {
      this.proyecto = p;
      this.viviendas = this._genVivs(p.id, p.num_viviendas);
    }
    return this.proyecto;
  },

  async cargarProyecto(id) {
    if (!SUPA.ready) return;
    const { data } = await SUPA.client.from('proyectos').select('*').eq('id', id).single();
    this.proyecto = data;
    const { data: vivs } = await SUPA.client.from('viviendas').select('*').eq('proyecto_id', id).order('numero');
    this.viviendas = vivs || [];
    await this._cargarDatosProyecto(id);
  },

  async _cargarDatosProyecto(proyId) {
    if (!SUPA.ready) return;
    const vivIds = this.viviendas.map(v => v.id);
    if (!vivIds.length) return;
    const [rR,sR,vR,prR,nR,aR,oR,cpR,amR] = await Promise.all([
      SUPA.client.from('reportes').select('*').in('vivienda_id', vivIds).order('timestamp',{ascending:false}),
      SUPA.client.from('supervisiones').select('*').in('vivienda_id', vivIds).order('timestamp',{ascending:false}),
      SUPA.client.from('verificaciones').select('*').in('vivienda_id', vivIds).order('timestamp',{ascending:false}),
      SUPA.client.from('propuestas').select('*').eq('proyecto_id', proyId).order('fecha',{ascending:false}),
      SUPA.client.from('notificaciones').select('*').order('created_at',{ascending:false}).limit(60),
      SUPA.client.from('alertas').select('*').eq('proyecto_id', proyId).eq('gestionada', false),
      SUPA.client.from('observaciones_historial').select('*').in('vivienda_id', vivIds).order('timestamp',{ascending:false}),
      SUPA.client.from('cartilla_progress').select('*').in('vivienda_id', vivIds),
      SUPA.client.from('partidas_proyecto').select('*').eq('proyecto_id', proyId)
    ]);
    this.reportes = rR.data||[]; this.supervisiones = sR.data||[];
    this.verificaciones = vR.data||[]; this.propuestas = prR.data||[];
    this.notificaciones = nR.data||[]; this.alertas = aR.data||[];
    this.observacionesHistorial = oR.data||[];
    for (const cp of (cpR.data||[])) {
      if (!this.cartillaProgress[cp.supervision_id]) this.cartillaProgress[cp.supervision_id] = {};
      this.cartillaProgress[cp.supervision_id][cp.item_id] = cp.checked;
    }
    for (const am of (amR.data||[])) {
      if (am.manual) this.avanceManual[am.partida_id] = am.avance_actual;
    }
  },

  async _generarViviendas(proyId, n) {
    const vivs = this._genVivs(proyId, n);
    if (SUPA.ready) await SUPA.client.from('viviendas').insert(vivs);
    this.viviendas = vivs;
  },

  _genVivs(proyId, n) {
    return Array.from({length: n}, (_, i) => ({
      id: `VIV-${String(i+1).padStart(3,'0')}`,
      numero: i+1,
      qr_id: `QR-${genHex()}`,
      proyecto_id: proyId,
      estado: 'activa'
    }));
  },

  // ── QR ──
  async validarQR(qrId) {
    if (SUPA.ready) {
      const { data } = await SUPA.client.from('viviendas').select('*').eq('qr_id', qrId).single();
      if (!data) return null;
      if (this.proyecto && data.proyecto_id !== this.proyecto.id) return null;
      return data;
    }
    return this.viviendas.find(v => v.qr_id === qrId) || null;
  },

  // ── REPORTES ──
  async crearReporte(viviendaId, partidaId, foto, comentario, actorRol) {
    // Resolver reporte previo rechazado si existe
    const prevRech = this.reportes.find(r =>
      r.vivienda_id === viviendaId && r.partida_id === partidaId && r.estado === 'pendiente_correccion');
    const r = {
      id: 'RPT-' + Date.now(), vivienda_id: viviendaId, partida_id: partidaId,
      actor_id: this.user?.id, actor_rol: actorRol || this.actor,
      foto_url: foto || null, comentario: comentario || '',
      estado: 'pendiente_supervision',
      reporte_previo_id: prevRech?.id || null,
      timestamp: new Date().toISOString(), geoloc: null
    };
    if (SUPA.ready) {
      const { data, error } = await SUPA.client.from('reportes').insert(r).select().single();
      if (error) throw error;
      if (prevRech) {
        await SUPA.client.from('reportes').update({estado:'resuelto_por_nuevo'}).eq('id', prevRech.id);
        prevRech.estado = 'resuelto_por_nuevo';
      }
      this.reportes.unshift(data);
      await this._notifDB('supervisor','Nueva partida reportada',`${this._pN(partidaId)} · ${viviendaId}`,'info');
      await this._crearAlerta('info',`Nuevo reporte: ${this._pN(partidaId)}`,viviendaId,partidaId,'maestro','');
      return data;
    }
    if (prevRech) prevRech.estado = 'resuelto_por_nuevo';
    this.reportes.unshift(r);
    toast('ok', `Reporte enviado · ${this._pN(partidaId)}`);
    return r;
  },

  // ── SUPERVISIONES ──
  async supervisar(reporteId, decision, motivo, foto) {
    const rep = this.reportes.find(r => r.id === reporteId);
    if (!rep) throw new Error('Reporte no encontrado');
    const nuevoEst = decision === 'ok' ? 'supervisada_ok' : 'pendiente_correccion';
    const s = {
      id: 'SUP-' + Date.now(), reporte_id: reporteId,
      vivienda_id: rep.vivienda_id, partida_id: rep.partida_id,
      supervisor_id: this.user?.id, decision, motivo: motivo||'',
      foto_url: foto||null,
      estado: decision === 'ok' ? 'supervisada_ok' : 'con_observaciones',
      timestamp: new Date().toISOString()
    };
    if (SUPA.ready) {
      await SUPA.client.from('supervisiones').insert(s);
      await SUPA.client.from('reportes').update({estado: nuevoEst}).eq('id', reporteId);
      if (decision === 'ok') {
        await this._notifDB('autocontrol','Lista para verificar',`${this._pN(rep.partida_id)} · ${rep.vivienda_id}`,'info');
        await this._notifDB('jefe','Supervisión OK',`${this._pN(rep.partida_id)} · ${rep.vivienda_id}`,'ok');
        await this._crearAlerta('ok',`Sup OK: ${this._pN(rep.partida_id)}`,rep.vivienda_id,rep.partida_id,'supervisor','');
      } else {
        await this._notifDB('maestro','Partida rechazada',`${this._pN(rep.partida_id)} · ${rep.vivienda_id} · ${motivo}`,'danger');
        await this._notifDB('jefe','Observación de Supervisor',`${this._pN(rep.partida_id)} · ${rep.vivienda_id}`,'warn');
        await this._crearAlerta('warn',`Obs Supervisor: ${this._pN(rep.partida_id)} — ${motivo}`,rep.vivienda_id,rep.partida_id,'supervisor',motivo);
        await this._obsDB(rep.vivienda_id,rep.partida_id,'supervisor',motivo,s.id);
      }
    } else {
      rep.estado = nuevoEst; this.supervisiones.unshift(s);
      if (decision !== 'ok') {
        this.alertas.unshift({id:'ALT-'+Date.now(),tipo:'warn',proyecto_id:this.proyecto?.id,
          mensaje:`Obs Supervisor: ${this._pN(rep.partida_id)} — ${motivo}`,
          vivienda_id:rep.vivienda_id,partida_id:rep.partida_id,actor_origen:'supervisor',gestionada:false,timestamp:new Date().toISOString()});
        this.observacionesHistorial.unshift({id:'OBS-'+Date.now(),vivienda_id:rep.vivienda_id,
          partida_id:rep.partida_id,actor:'supervisor',observacion:motivo,ref_id:s.id,timestamp:new Date().toISOString()});
      }
    }
    toast(decision==='ok'?'ok':'warn', decision==='ok'?'Supervisión OK → Autocontrol notificado':'Observación registrada · Maestro notificado');
    return s;
  },

  // Supervisor reporta DIRECTAMENTE → va a autocontrol, no queda en pendientes
  async supervisorReportaDirecto(viviendaId, partidaId, foto, comentario) {
    const r = {
      id:'RPT-'+Date.now(), vivienda_id:viviendaId, partida_id:partidaId,
      actor_id:this.user?.id, actor_rol:'supervisor', foto_url:foto||null,
      comentario:comentario||'', estado:'supervisada_ok',
      timestamp:new Date().toISOString(), geoloc:null
    };
    const s = {
      id:'SUP-'+Date.now(), reporte_id:r.id, vivienda_id:viviendaId, partida_id:partidaId,
      supervisor_id:this.user?.id, decision:'ok',
      motivo:'Reportado directamente por Supervisor', foto_url:foto||null,
      estado:'supervisada_ok', timestamp:new Date().toISOString()
    };
    if (SUPA.ready) {
      const {data:rd} = await SUPA.client.from('reportes').insert(r).select().single();
      await SUPA.client.from('supervisiones').insert(s);
      this.reportes.unshift(rd||r); this.supervisiones.unshift(s);
      await this._notifDB('autocontrol','Supervisor reportó directo',`${this._pN(partidaId)} · ${viviendaId}`,'info');
      await this._notifDB('jefe','Supervisor reportó directo',`${this._pN(partidaId)} · ${viviendaId}`,'ok');
      await this._crearAlerta('ok',`Sup directo: ${this._pN(partidaId)}`,viviendaId,partidaId,'supervisor','');
    } else {
      this.reportes.unshift(r); this.supervisiones.unshift(s);
    }
    toast('ok',`Reporte directo → Autocontrol · ${this._pN(partidaId)}`);
    return {reporte:r, supervision:s};
  },

  // ── VERIFICACIONES AUTOCONTROL ──
  async verificarAutocontrol(supId, decision, motivo, checkItems, foto, docUrl) {
    const sup = this.supervisiones.find(s => s.id === supId);
    if (!sup) throw new Error('Supervisión no encontrada');
    const v = {
      id:'VER-'+Date.now(), supervision_id:supId,
      vivienda_id:sup.vivienda_id, partida_id:sup.partida_id,
      autocontrol_id:this.user?.id, decision, motivo:motivo||'',
      check_items:checkItems||[], foto_url:foto||null, doc_url:docUrl||null,
      estado: decision==='vob'?'verificada':'rechazada',
      timestamp:new Date().toISOString()
    };
    if (SUPA.ready) {
      const {data,error} = await SUPA.client.from('verificaciones').insert(v).select().single();
      if (error) throw error;
      await SUPA.client.from('supervisiones').update({estado:v.estado}).eq('id',supId);
      if (decision==='vob') {
        await this._recalcAvance(v.partida_id);
        await this._notifDB('admin','V°B° Autocontrol',`${this._pN(v.partida_id)} · ${v.vivienda_id}`,'ok');
        await this._notifDB('jefe','Verificado por Autocontrol',`${this._pN(v.partida_id)} · ${v.vivienda_id}`,'ok');
        await this._crearAlerta('ok',`V°B°: ${this._pN(v.partida_id)}`,v.vivienda_id,v.partida_id,'autocontrol','');
      } else {
        // Reactivar reporte a pendiente_correccion → maestro puede volver a reportar
        if (sup.reporte_id) await SUPA.client.from('reportes').update({estado:'pendiente_correccion'}).eq('id',sup.reporte_id);
        await this._notifDB('maestro','Rechazo Autocontrol',`${this._pN(v.partida_id)} · ${v.vivienda_id} · ${motivo}`,'danger');
        await this._notifDB('supervisor','Rechazo Autocontrol',`${this._pN(v.partida_id)} · ${v.vivienda_id} · ${motivo}`,'danger');
        await this._notifDB('jefe','Rechazo Autocontrol',`${this._pN(v.partida_id)} · ${v.vivienda_id}`,'danger');
        await this._crearAlerta('danger',`Rechazo Autocontrol: ${this._pN(v.partida_id)} — ${motivo}`,v.vivienda_id,v.partida_id,'autocontrol',motivo);
        await this._obsDB(v.vivienda_id,v.partida_id,'autocontrol',motivo,v.id);
      }
      this.verificaciones.unshift(data||v);
    } else {
      this.verificaciones.unshift(v);
      if (sup) sup.estado = v.estado;
      if (decision!=='vob' && sup.reporte_id) {
        const rp = this.reportes.find(r=>r.id===sup.reporte_id);
        if (rp) rp.estado = 'pendiente_correccion';
        this.alertas.unshift({id:'ALT-'+Date.now(),tipo:'danger',proyecto_id:this.proyecto?.id,
          mensaje:`Rechazo Autocontrol: ${this._pN(v.partida_id)} — ${motivo}`,
          vivienda_id:v.vivienda_id,partida_id:v.partida_id,actor_origen:'autocontrol',gestionada:false,timestamp:new Date().toISOString()});
        this.observacionesHistorial.unshift({id:'OBS-'+Date.now(),vivienda_id:v.vivienda_id,
          partida_id:v.partida_id,actor:'autocontrol',observacion:motivo,ref_id:v.id,timestamp:new Date().toISOString()});
      }
    }
    toast(decision==='vob'?'ok':'danger', decision==='vob'?'✅ V°B° registrado':'❌ Rechazo · Maestro y Supervisor notificados');
    return v;
  },

  // ── SUBIR DOC SIN QR ──
  async subirDocPendiente(supId, docUrl, docNombre) {
    const sup = this.supervisiones.find(s=>s.id===supId);
    if (!sup) return;
    sup.doc_url = docUrl; sup.doc_nombre = docNombre;
    if (SUPA.ready) {
      await SUPA.client.from('supervisiones').update({doc_url:docUrl,doc_nombre:docNombre}).eq('id',supId);
    }
    // Auto-check ítems documentales en cartilla
    const p = this.partidas.find(x=>x.partida_id===sup.partida_id);
    const cart = this.cartillas.find(c=>c.cartilla_id===p?.cartilla_id_asociada);
    if (cart) {
      for (const item of (cart.items||[])) {
        if (item.evidencia_documental) this.saveCartillaProgress(supId, item.item_id, true);
      }
    }
    toast('ok',`Documento subido · ${docNombre}`);
  },

  async _recalcAvance(partidaId) {
    if (!SUPA.ready) return;
    const {count} = await SUPA.client.from('verificaciones')
      .select('id',{count:'exact'}).eq('partida_id',partidaId).eq('estado','verificada');
    const total = this.viviendas.length || 1;
    const pct = Math.round((count/total)*100);
    await SUPA.client.from('partidas_proyecto')
      .upsert({proyecto_id:this.proyecto?.id,partida_id:partidaId,avance_actual:pct},
              {onConflict:'proyecto_id,partida_id'});
  },

  // ── ALERTAS ──
  async _crearAlerta(tipo, mensaje, vivId, partidaId, actorOrigen, motivo) {
    const a = {id:'ALT-'+Date.now(),tipo,mensaje,proyecto_id:this.proyecto?.id,
      vivienda_id:vivId,partida_id:partidaId,actor_origen:actorOrigen,
      motivo:motivo||'',gestionada:false,timestamp:new Date().toISOString()};
    if (SUPA.ready) await SUPA.client.from('alertas').insert(a);
    this.alertas.unshift(a);
  },

  async gestionarAlerta(alertaId) {
    const a = this.alertas.find(x=>x.id===alertaId);
    if (a) a.gestionada = true;
    if (SUPA.ready) await SUPA.client.from('alertas').update({gestionada:true}).eq('id',alertaId);
    this.alertas = this.alertas.filter(x=>x.id!==alertaId);
  },

  // ── OBS HISTORIAL ──
  async _obsDB(vivId, partidaId, actor, obs, refId) {
    const o={id:'OBS-'+Date.now(),vivienda_id:vivId,partida_id:partidaId,actor,observacion:obs,ref_id:refId,timestamp:new Date().toISOString()};
    if (SUPA.ready) await SUPA.client.from('observaciones_historial').insert(o);
    this.observacionesHistorial.unshift(o);
  },

  // ── NOTIFICACIONES ──
  async _notifDB(rol, titulo, desc, tipo) {
    const n={id:'N-'+Date.now(),destinatario_rol:rol,titulo,desc,tipo,leida:false,created_at:new Date().toISOString()};
    if (SUPA.ready) await SUPA.client.from('notificaciones').insert(n);
    this.notificaciones.unshift(n);
  },

  // ── PROPUESTAS ──
  async crearPropuesta(items) {
    const prop={id:'PROP-'+Date.now(),proyecto_id:this.proyecto?.id,admin_id:this.user?.id,
      items,estado:'pendiente_fto',fecha:new Date().toISOString(),hash:genHex()};
    if (SUPA.ready) {
      const {data,error}=await SUPA.client.from('propuestas').insert(prop).select().single();
      if (error) throw error;
      await this._notifDB('fto','Nueva propuesta de pago',`${items.length} partidas para revisión`,'info');
      this.propuestas.unshift(data);
      return data;
    }
    this.propuestas.unshift(prop);
    toast('ok',`Propuesta creada · ${items.length} partidas`);
    return prop;
  },

  async resolverFTO(propId, decision, comentario, ajustes) {
    const prop=this.propuestas.find(p=>p.id===propId);
    const firma=decision==='aprobar'?genHex():null;
    const upd={estado:decision==='aprobar'?'aprobada':'rechazada',firma_digital:firma,
      comentario_fto:comentario,ajustes_fto:ajustes||[],fecha_resolucion:new Date().toISOString()};
    if (SUPA.ready) {
      await SUPA.client.from('propuestas').update(upd).eq('id',propId);
      if (decision==='aprobar' && ajustes) {
        for (const aj of ajustes) {
          await SUPA.client.from('partidas_proyecto')
            .upsert({proyecto_id:this.proyecto?.id,partida_id:aj.partida_id,avance_anterior:aj.pct_aprobado},
                    {onConflict:'proyecto_id,partida_id'});
        }
      }
      await this._notifDB('admin',decision==='aprobar'?'Propuesta aprobada':'Propuesta rechazada',comentario,decision==='aprobar'?'ok':'danger');
    } else { if (prop) Object.assign(prop,upd); }
    toast(decision==='aprobar'?'ok':'danger',decision==='aprobar'?'✅ Aprobado con firma digital':'❌ Rechazado');
  },

  // ── HELPERS ──
  _pN(id) { return this.partidas.find(p=>p.partida_id===id)?.nombre || id || '-'; },

  getAvanceGlobalPartida(partidaId) {
    if (this.avanceManual[partidaId] !== undefined) return this.avanceManual[partidaId];
    const total = this.viviendas.length || 1;
    const ver = this.verificaciones.filter(v=>v.partida_id===partidaId&&v.estado==='verificada').length;
    return Math.round((ver/total)*100);
  },

  getAvancePartidaVivienda(partidaId, vivId) {
    if (this.verificaciones.find(v=>v.partida_id===partidaId&&v.vivienda_id===vivId&&v.estado==='verificada')) return 'verde';
    if (this.supervisiones.find(s=>s.partida_id===partidaId&&s.vivienda_id===vivId&&s.estado==='con_observaciones')) return 'naranjo';
    if (this.supervisiones.find(s=>s.partida_id===partidaId&&s.vivienda_id===vivId&&s.estado==='supervisada_ok')) return 'amarillo';
    if (this.reportes.find(r=>r.partida_id===partidaId&&r.vivienda_id===vivId&&r.estado!=='resuelto_por_nuevo')) return 'azul';
    return 'none';
  },

  getPartidasDisponiblesCobro() {
    return this.verificaciones.filter(v => {
      if (v.estado!=='verificada') return false;
      const p = this.partidas.find(x=>x.partida_id===v.partida_id);
      const cart = this.cartillas.find(c=>c.cartilla_id===p?.cartilla_id_asociada);
      if (cart?.documentos_solicitados) {
        const sup = this.supervisiones.find(s=>s.id===v.supervision_id);
        if (!v.doc_url && !sup?.doc_url) return false;
      }
      return true;
    });
  }
};

// ── GLOBALS ──
function genHex() { return [...Array(8)].map(()=>Math.floor(Math.random()*16).toString(16)).join(''); }
function formatDate(iso) {
  if (!iso) return '-';
  const d=new Date(iso);
  return d.toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'2-digit'})+' '+d.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});
}
function formatDateShort(iso) { return iso ? new Date(iso).toLocaleDateString('es-CL',{day:'2-digit',month:'short'}) : '-'; }
function formatUF(n) { return n==null?'-':Number(n).toLocaleString('es-CL',{minimumFractionDigits:3,maximumFractionDigits:3})+' UF'; }
function toast(tipo, msg) {
  const icons={ok:'✅',warn:'⚠️',danger:'❌',info:'ℹ️'};
  const tc=document.getElementById('toastCnt'); if(!tc) return;
  const div=document.createElement('div');
  div.className=`toast ${tipo}`;
  div.innerHTML=`<span>${icons[tipo]||'ℹ️'}</span><span style="flex:1">${msg}</span><button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
  tc.appendChild(div); setTimeout(()=>div.remove(),4500);
}
function openModal(id){document.getElementById(id)?.classList.add('open');}
function closeModal(id){document.getElementById(id)?.classList.remove('open');}
function switchTab(btn,panelId){
  const c=btn.closest('.card,.modal,.page-view');
  c?.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  c?.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(panelId)?.classList.add('active');
}
function ganttMonths(fi,ft){
  const s=new Date(fi),e=new Date(ft),m=[];
  const c=new Date(s.getFullYear(),s.getMonth(),1);
  while(c<=e){m.push({year:c.getFullYear(),month:c.getMonth(),label:c.toLocaleDateString('es-CL',{month:'short',year:'2-digit'})});c.setMonth(c.getMonth()+1);}
  return m;
}
function ganttBarStyle(idx,total,fi,ft){
  const s=new Date(fi),e=new Date(ft),step=(e-s)/(total||1);
  const bs=new Date(s.getTime()+idx*step),be=new Date(bs.getTime()+step*0.7);
  return {barStart:bs,barEnd:be};
}
function pctDayToWidth(td,bd){return Math.max(3,Math.round((bd/td)*100));}
function dayOffset(fi,bs,td){const d=(new Date(bs)-new Date(fi))/(1000*60*60*24);return Math.max(0,Math.round((d/td)*100));}
