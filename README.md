# FISCHECK R03
### Sistema Digital de Control de Avance de Obra — Revisión 03

---

## Cambios R03

### General
- **Trazabilidad completa**: rechazo de Supervisor o Autocontrol reactiva al Maestro (`estado: pendiente_correccion` → puede re-reportar). El nuevo reporte marca el anterior como `resuelto_por_nuevo`.
- **Viviendas simplificadas**: solo `numero`, sin bloque ni piso.
- **Sin dashboards** en ningún actor.
- **Flujo visual** (① ② ③) eliminado de Maestro, Supervisor y Autocontrol.
- **Progreso de cartilla persiste** (localStorage + Supabase).

### Maestro
- Flujo: QR → partida → foto → enviar. Aparece aviso si tiene partidas rechazadas pendientes de corrección.

### Supervisor
- QR **obligatorio** para aprobar/rechazar en pantalla Pendientes.
- Reporte directo va directo a Autocontrol (no aparece en pendientes).
- Observaciones notifican automáticamente al Maestro y al Jefe.

### Jefe de Terreno
- Alertas con botón **OK ✓** para gestionar/desaparecer.
- 3 pestañas: Alertas activas | Historial observaciones | V°B° registrados.
- Alertas positivas (V°B°) también aparecen para trazabilidad.

### Autocontrol
- QR **obligatorio** para V°B° y rechazo.
- **Subir certificado sin QR** desde botón en pendientes (auto-check en cartilla).
- Cartilla con historial de observaciones previas.
- Botón **☑️ Marcar todas**.
- Guardar avance de cartilla (persiste entre sesiones).
- Al rechazar: observación obligatoria + historial visible.
- Cartilla módulo: QR requerido para entrar.
- Vista de cartilla muestra si FTO la firmó.

### Administrador
- Tabla con columna **Av. Actual % editable** (Admin puede modificar manualmente).
- Totales: contrato / avance actual / avance anterior / diferencia en UF y %.
- Columna **Estado** con íconos (✅ disponible / ⏳ pendiente / 📎 falta cert / ⚠️ alerta).

### FTO
- **Pagadas desaparecen** de pantalla de Estados de Pago (van a Historial).
- Cartillas agrupadas por partida.
- Puede firmar cartilla individualmente.
- Reducir % propuesto por ítem.

---

## Estructura

```
fischeck-r03/
├── index.html
├── css/styles.css
├── js/
│   ├── state.js      ← Estado + Supabase adapter completo
│   ├── qr.js         ← Lector QR real (jsQR) + manual fallback
│   └── app.js        ← Todos los renders R03
├── data/
│   ├── partidas.json
│   └── cartillas.json
├── db/
│   └── schema.sql    ← Esquema completo PostgreSQL/Supabase
├── scripts/
│   └── seed-json.js
└── README.md
```

---

## Correr localmente

```bash
cd fischeck-r03
npx serve .
# Abre http://localhost:3000
```

---

## Conectar Supabase

### 1. Crear proyecto en supabase.com (gratis)

### 2. Ejecutar esquema
Dashboard → SQL Editor → New query → pegar `db/schema.sql` → **Run**

### 3. Crear bucket de storage
Dashboard → Storage → **New bucket**
- Nombre: `evidencias`
- Public: ✅

### 4. Obtener credenciales
Dashboard → Settings → API
- `Project URL`: `https://xxxx.supabase.co`
- `anon public`: `eyJhbGci...`

### 5. Pegar en js/state.js
```javascript
const SUPA = {
  url: 'https://TU_PROYECTO.supabase.co',
  key: 'eyJhbGci...',
```

### 6. Activar CDN en index.html
Descomentar la línea:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### 7. (Opcional) Habilitar Realtime
Dashboard → Database → Replication → Activar tablas:
`reportes`, `supervisiones`, `verificaciones`, `notificaciones`, `alertas`

---

## QR físico

Al crear el proyecto:
1. Abre **📁 → Imprimir QRs**
2. Clic en cada vivienda → se abre ventana con el QR para imprimir/plastificar

El QR contiene el `qr_id` de la vivienda. jsQR lo lee en tiempo real con la cámara.

---

## Flujo de estados de una partida

```
Maestro reporta
    ↓
PENDIENTE_SUPERVISION
    ↓ [Supervisor escanea QR]
    ├─ OK → SUPERVISADA_OK → Autocontrol pendiente
    └─ OBS → PENDIENTE_CORRECCION → Maestro puede re-reportar
                ↓ [Autocontrol escanea QR]
                ├─ V°B° → VERIFICADA → Admin puede incluir en propuesta
                └─ RECHAZADA → PENDIENTE_CORRECCION → Maestro puede re-reportar

Supervisor puede también reportar directo → va a SUPERVISADA_OK (sin pasar por pendientes)
```

---

## Colores Gantt

| Color | Estado |
|-------|--------|
| ⬜ Sin color | Sin iniciar |
| 🔵 Azul | Iniciada (reporte Maestro) |
| 🟡 Amarillo | Supervisada OK |
| 🟠 Naranjo | Con observación |
| 🟢 Verde | Verificada por Autocontrol |

---

## Trazabilidad

Cada acción queda registrada con:
- `actor_id` + `actor_rol`
- `timestamp`
- `vivienda_id` + `partida_id`
- `foto_url` / `doc_url`
- Notificación al destinatario
- Alerta para Jefe de Terreno
- Historial de observaciones separado
