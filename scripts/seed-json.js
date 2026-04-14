// ================================================================
//  FISCHECK R02 — Seed script
//  node scripts/seed-json.js
// ================================================================
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs'), path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://TU_PROYECTO.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'TU_SERVICE_ROLE_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log('🌱 FISCHECK R02 · Iniciando seed...\n');

  const partidas  = JSON.parse(fs.readFileSync(path.join(__dirname,'../data/partidas.json'),'utf8'));
  const cartillas = JSON.parse(fs.readFileSync(path.join(__dirname,'../data/cartillas.json'),'utf8'));

  // partidas y cartillas se cargan en memoria del cliente (JSON estático)
  // Solo necesitamos crear la estructura base en Supabase

  console.log(`✅ ${partidas.length} partidas listas (se leen desde JSON en cliente)`);
  console.log(`✅ ${cartillas.length} cartillas listas (se leen desde JSON en cliente)`);
  console.log('\n📋 Para iniciar la app:');
  console.log('  1. Crea un proyecto desde la app (botón 📁)');
  console.log('  2. Las viviendas se generan automáticamente');
  console.log('  3. Selecciona tu rol y comienza\n');
}

seed().catch(console.error);
