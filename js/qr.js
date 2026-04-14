// ================================================================
//  FISCHECK R02 — QR Scanner Module
// ================================================================

const QRScanner = {
  stream: null,
  interval: null,
  onResult: null,

  // Abre cámara y escanea
  async open(containerId, onResult) {
    this.onResult = onResult;
    const wrap = document.getElementById(containerId);
    if (!wrap) return;
    wrap.innerHTML = `
      <div id="qr-video-wrap" style="border-radius:8px;overflow:hidden;background:#000;position:relative">
        <video id="qr-video" autoplay playsinline style="width:100%;display:block;max-height:260px;object-fit:cover"></video>
        <div id="qr-overlay" style="position:absolute;inset:0;border:3px solid var(--acc);border-radius:8px;pointer-events:none"></div>
        <div style="position:absolute;bottom:8px;left:0;right:0;text-align:center;font-size:11px;color:#fff;text-shadow:0 1px 3px #000">
          Apunta al código QR de la vivienda
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" style="margin-top:8px;width:100%" onclick="QRScanner.close(); QRScanner.showManual('${containerId}')">
        ✏️ Ingresar manualmente
      </button>
    `;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      const video = document.getElementById('qr-video');
      video.srcObject = this.stream;
      await video.play();
      this._startScan(video, containerId);
    } catch(e) {
      console.warn('Cámara no disponible:', e.message);
      this.showManual(containerId);
    }
  },

  _startScan(video, containerId) {
    const canvas = document.createElement('canvas');
    this.interval = setInterval(() => {
      if (!video.videoWidth) return;
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // jsQR debe estar cargado globalmente
      if (typeof jsQR === 'undefined') {
        // fallback: simulación
        this.close();
        this.showManual(containerId);
        return;
      }
      const code = jsQR(imgData.data, imgData.width, imgData.height);
      if (code && code.data) {
        this.close();
        this._handleResult(code.data, containerId);
      }
    }, 300);
  },

  async _handleResult(qrData, containerId) {
    // Validar QR contra base de datos
    const vivienda = await S.validarQR(qrData);
    if (!vivienda) {
      toast('danger', 'QR inválido o no pertenece a este proyecto');
      this.showManual(containerId);
      return;
    }
    toast('ok', `QR válido · ${vivienda.id} · Bloque ${vivienda.bloque}`);
    if (this.onResult) this.onResult(vivienda);
  },

  close() {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  },

  showManual(containerId) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;
    const opts = (S.viviendas || []).map(v =>
      `<option value="${v.qr_id}">[${v.id}] ${v.bloque} · Piso ${v.piso}</option>`
    ).join('');
    wrap.innerHTML = `
      <div class="fg">
        <label class="flbl">Seleccionar vivienda (demo sin cámara)</label>
        <select class="finp" id="qr-manual-sel">
          <option value="">-- Elige vivienda --</option>
          ${opts}
        </select>
      </div>
      <button class="btn btn-pri btn-sm" onclick="QRScanner._confirmarManual('${containerId}')">
        Confirmar
      </button>
      <button class="btn btn-ghost btn-sm" onclick="QRScanner.open('${containerId}', QRScanner.onResult)">
        📷 Intentar cámara
      </button>
    `;
  },

  async _confirmarManual(containerId) {
    const sel = document.getElementById('qr-manual-sel');
    if (!sel?.value) { toast('warn','Selecciona una vivienda'); return; }
    const vivienda = await S.validarQR(sel.value);
    if (!vivienda) { toast('danger','Vivienda no encontrada'); return; }
    toast('ok', `Vivienda: ${vivienda.id} · ${vivienda.bloque}`);
    if (this.onResult) this.onResult(vivienda);
  },

  // Genera QR físico (abre ventana con QR imprimible)
  generatePrintable(vivienda) {
    const win = window.open('','_blank','width=400,height=500');
    win.document.write(`
      <!DOCTYPE html><html><head><title>QR ${vivienda.id}</title>
      <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
      <style>body{font-family:sans-serif;text-align:center;padding:30px}h2{font-size:18px}p{font-size:12px;color:#666}</style>
      </head><body>
      <h2>${vivienda.id}</h2>
      <p>${vivienda.bloque} · Piso ${vivienda.piso}</p>
      <canvas id="qrc"></canvas>
      <p style="font-family:monospace;font-size:10px">${vivienda.qr_id}</p>
      <script>
        QRCode.toCanvas(document.getElementById('qrc'), '${vivienda.qr_id}',
          {width:240,margin:2}, function(){});
      <\/script>
      </body></html>
    `);
  }
};
