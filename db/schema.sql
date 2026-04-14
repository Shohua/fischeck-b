-- ================================================================
--  FISCHECK R03 — Esquema completo Supabase (PostgreSQL)
--  Ejecutar en: Dashboard → SQL Editor → New Query → Run
-- ================================================================

create extension if not exists "uuid-ossp";

-- ── PROYECTOS ──
create table if not exists proyectos (
  id              text primary key,
  nombre          text not null,
  codigo          text unique not null,
  num_viviendas   int not null default 1,
  monto_total_uf  decimal(12,3) default 0,
  fecha_inicio    date not null,
  fecha_termino   date not null,
  created_at      timestamptz default now()
);

-- ── VIVIENDAS (solo numero, sin bloque ni piso) ──
create table if not exists viviendas (
  id          text primary key,   -- 'VIV-001'
  numero      int not null,
  qr_id       text unique not null,
  proyecto_id text references proyectos(id) on delete cascade,
  estado      text default 'activa'
);
create index if not exists idx_viviendas_qr on viviendas(qr_id);
create index if not exists idx_viviendas_proyecto on viviendas(proyecto_id);

-- ── PARTIDAS PROYECTO (avance por proyecto) ──
create table if not exists partidas_proyecto (
  id              uuid primary key default uuid_generate_v4(),
  proyecto_id     text references proyectos(id) on delete cascade,
  partida_id      text not null,
  avance_actual   decimal(5,2) default 0,
  avance_anterior decimal(5,2) default 0,
  manual          boolean default false,   -- true si fue editado manualmente por Admin
  unique(proyecto_id, partida_id)
);

-- ── REPORTES (Maestro y Supervisor) ──
create table if not exists reportes (
  id               text primary key,
  vivienda_id      text references viviendas(id),
  partida_id       text not null,
  actor_id         text,
  actor_rol        text,               -- maestro | supervisor
  foto_url         text,
  comentario       text,
  estado           text default 'pendiente_supervision',
  -- pendiente_supervision | supervisada_ok | pendiente_correccion | resuelto_por_nuevo
  reporte_previo_id text,              -- referencia al reporte rechazado que reemplaza
  timestamp        timestamptz default now(),
  geoloc           jsonb
);
create index if not exists idx_reportes_vivienda on reportes(vivienda_id);
create index if not exists idx_reportes_estado on reportes(estado);

-- ── SUPERVISIONES ──
create table if not exists supervisiones (
  id            text primary key,
  reporte_id    text references reportes(id),
  vivienda_id   text references viviendas(id),
  partida_id    text not null,
  supervisor_id text,
  decision      text not null,       -- ok | observaciones
  motivo        text,
  foto_url      text,
  doc_url       text,                -- documento subido sin QR
  doc_nombre    text,
  estado        text not null,       -- supervisada_ok | con_observaciones | verificada | rechazada
  timestamp     timestamptz default now()
);
create index if not exists idx_sups_vivienda on supervisiones(vivienda_id);
create index if not exists idx_sups_estado on supervisiones(estado);

-- ── VERIFICACIONES (Autocontrol) ──
create table if not exists verificaciones (
  id              text primary key,
  supervision_id  text references supervisiones(id),
  vivienda_id     text references viviendas(id),
  partida_id      text not null,
  autocontrol_id  text,
  decision        text not null,    -- vob | rechazar
  motivo          text,
  check_items     jsonb,            -- items marcados en la cartilla
  foto_url        text,
  doc_url         text,
  estado          text not null,    -- verificada | rechazada
  timestamp       timestamptz default now()
);
create index if not exists idx_vers_vivienda on verificaciones(vivienda_id);
create index if not exists idx_vers_estado on verificaciones(estado);
create index if not exists idx_vers_partida on verificaciones(partida_id);

-- ── PROGRESO DE CARTILLA (persiste checks) ──
create table if not exists cartilla_progress (
  id              uuid primary key default uuid_generate_v4(),
  supervision_id  text references supervisiones(id),
  vivienda_id     text references viviendas(id),
  item_id         text not null,
  checked         boolean default false,
  actor_id        text,
  updated_at      timestamptz default now(),
  unique(supervision_id, item_id)
);

-- ── ALERTAS (del jefe de terreno) ──
create table if not exists alertas (
  id           text primary key,
  tipo         text not null,        -- ok | warn | danger | info
  mensaje      text not null,
  proyecto_id  text references proyectos(id),
  vivienda_id  text references viviendas(id),
  partida_id   text,
  actor_origen text,                 -- supervisor | autocontrol | maestro
  motivo       text,
  gestionada   boolean default false,
  timestamp    timestamptz default now()
);
create index if not exists idx_alertas_proyecto on alertas(proyecto_id);
create index if not exists idx_alertas_gestionada on alertas(gestionada);

-- ── HISTORIAL DE OBSERVACIONES ──
create table if not exists observaciones_historial (
  id          text primary key,
  vivienda_id text references viviendas(id),
  partida_id  text not null,
  actor       text not null,          -- supervisor | autocontrol
  observacion text not null,
  ref_id      text,                   -- id de supervisión o verificación
  timestamp   timestamptz default now()
);
create index if not exists idx_obs_partida on observaciones_historial(partida_id, vivienda_id);

-- ── PROPUESTAS DE PAGO ──
create table if not exists propuestas (
  id               text primary key,
  proyecto_id      text references proyectos(id),
  admin_id         text,
  items            jsonb,              -- [{partida_id, pct_propuesto}]
  estado           text default 'pendiente_fto',
  -- pendiente_fto | aprobada | rechazada
  hash             text,
  firma_digital    text,
  fto_id           text,
  comentario_fto   text,
  ajustes_fto      jsonb,             -- [{partida_id, pct_aprobado}]
  fecha            timestamptz default now(),
  fecha_resolucion timestamptz
);
create index if not exists idx_prop_proyecto on propuestas(proyecto_id);
create index if not exists idx_prop_estado on propuestas(estado);

-- ── NOTIFICACIONES ──
create table if not exists notificaciones (
  id               uuid primary key default uuid_generate_v4(),
  destinatario_rol text not null,     -- maestro | supervisor | jefe | autocontrol | admin | fto
  titulo           text not null,
  desc             text,
  tipo             text,              -- ok | warn | danger | info
  leida            boolean default false,
  created_at       timestamptz default now()
);
create index if not exists idx_notif_rol on notificaciones(destinatario_rol);

-- ── QR LOGS (trazabilidad de escaneos) ──
create table if not exists qr_logs (
  id          uuid primary key default uuid_generate_v4(),
  qr_id       text,
  vivienda_id text references viviendas(id),
  actor_id    text,
  actor_rol   text,
  accion      text,
  timestamp   timestamptz default now()
);

-- ================================================================
--  VISTAS
-- ================================================================

create or replace view v_avance_viviendas as
select
  v.id, v.numero, v.proyecto_id,
  count(distinct ver.id) filter (where ver.estado='verificada')  as partidas_verificadas,
  count(distinct s.id)   filter (where s.estado='con_observaciones') as observaciones_activas
from viviendas v
left join verificaciones ver on ver.vivienda_id=v.id
left join supervisiones s   on s.vivienda_id=v.id
group by v.id, v.numero, v.proyecto_id;

create or replace view v_partidas_cobro as
select
  ver.id as verificacion_id,
  ver.vivienda_id, ver.partida_id, ver.timestamp,
  ver.doc_url,
  case when s.doc_url is not null or ver.doc_url is not null then true else false end as tiene_doc
from verificaciones ver
left join supervisiones s on s.id=ver.supervision_id
where ver.estado='verificada';

-- ================================================================
--  STORAGE (ejecutar en Supabase Dashboard → Storage)
-- ================================================================
-- 1. Crear bucket 'evidencias' → Public: true
-- 2. Carpetas sugeridas:
--    evidencias/reportes/     → fotos Maestro y Supervisor
--    evidencias/autocontrol/  → documentos Autocontrol
--    evidencias/propuestas/   → PDFs firmados
--
-- Policy para INSERT (cualquier usuario autenticado):
-- insert into storage.policies ... (configurar desde UI)

-- ================================================================
--  REALTIME (habilitar desde Dashboard → Database → Replication)
-- ================================================================
-- Tablas recomendadas para realtime:
-- reportes, supervisiones, verificaciones, notificaciones, alertas

-- ================================================================
--  ROW LEVEL SECURITY (cuando tengas auth real)
-- ================================================================
-- alter table reportes enable row level security;
-- alter table supervisiones enable row level security;
-- alter table verificaciones enable row level security;
-- alter table propuestas enable row level security;
-- alter table alertas enable row level security;
-- alter table notificaciones enable row level security;
-- alter table cartilla_progress enable row level security;
--
-- Ejemplo policy básica (todos leen, solo autenticados escriben):
-- create policy "allow_read" on reportes for select using (true);
-- create policy "allow_insert" on reportes for insert with check (auth.role()='authenticated');

-- ================================================================
--  DATOS INICIALES
-- ================================================================
-- Las partidas y cartillas se leen desde partidas.json y cartillas.json
-- (archivos estáticos en el cliente, no se necesita cargar a DB)
--
-- Opcionalmente puedes cargarlas con:
--   node scripts/seed-json.js
