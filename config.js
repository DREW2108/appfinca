// ============================================================
// CONFIGURACION DE SUPABASE Y CONSTANTES DE NEGOCIO
// ============================================================

const SUPABASE_CONFIG = {
  url: 'https://ivyeduecvfpbxwxmjvdd.supabase.co',
  anonKey: 'sb_publishable_Rz55FT9-h7GOcp9WjYM8Vw_RWHohkjg'
};

// Limpieza automatica de URL
const cleanUrl = (SUPABASE_CONFIG.url || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

// 2. CONSTANTES DE TARIFAS Y NEGOCIO DE FINCA MACOYA
const APP_CONFIG = {
  canoeRates: { low: 20000, high: 40000 },
  touristRate: 20000,
  particularRate: 10000,
  vehicleRate: 30000,
  drinks: ['Gaseosa', 'Cerveza'],
  meals: ['Desayuno', 'Almuerzo', 'Cena'],
  mealRate: 25000
};

// Inicializacion de la instancia de base de datos
var db = null;
function getDb() {
  if (!db && window.supabase && typeof window.supabase.createClient === 'function' && cleanUrl && !cleanUrl.includes('TU-PROYECTO')) {
    db = window.supabase.createClient(cleanUrl, SUPABASE_CONFIG.anonKey);
  }
  return db;
}
getDb();
