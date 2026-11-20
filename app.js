// ============================================================
// LÓGICA DE APLICACIÓN - FINCA MACOYA (HTML + JS + SUPABASE)
// ============================================================

// Variables de estado de sesión
let currentSession = JSON.parse(sessionStorage.getItem('macoyaSession') || 'null');
let activeUsername = currentSession ? currentSession.username : '';
let activeRole = currentSession ? currentSession.role : '';

const $ = id => document.getElementById(id);
const money = value => '$' + Number(value || 0).toLocaleString('es-CO');

function paintIcons() {
  if (window.lucide) lucide.createIcons();
}

function showNotice(id, message, error = false) {
  const node = $(id);
  if (!node) return;
  node.textContent = message || '';
  node.classList.toggle('error', Boolean(error));
}

function setBusy(button, busy, label) {
  if (!button) return;
  button.disabled = busy;
  button.classList.toggle('busy', busy);
  const span = button.querySelector('span');
  if (span && label) span.textContent = label;
}

// ------------------------------------------------------------
// TEMA VISUAL (CLARO / OSCURO)
// ------------------------------------------------------------
function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  localStorage.setItem('macoyaTheme', next);

  document.querySelectorAll('[data-theme-toggle] i').forEach(icon => {
    icon.setAttribute('data-lucide', next === 'dark' ? 'sun' : 'moon');
  });

  paintIcons();
}

function applySavedTheme() {
  const saved = localStorage.getItem('macoyaTheme') || 'light';
  document.documentElement.dataset.theme = saved;
  document.querySelectorAll('[data-theme-toggle] i').forEach(icon => {
    icon.setAttribute('data-lucide', saved === 'dark' ? 'sun' : 'moon');
  });
  paintIcons();
}

document.querySelectorAll('[data-theme-toggle]').forEach(button => {
  button.addEventListener('click', toggleTheme);
});

document.querySelectorAll('[data-password-toggle]').forEach(button => {
  button.addEventListener('click', () => {
    const input = $(button.dataset.passwordToggle);
    if (!input) return;
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    button.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
    button.querySelector('i').setAttribute('data-lucide', visible ? 'eye-off' : 'eye');
    paintIcons();
    input.focus();
  });
});

// ------------------------------------------------------------
// SEGURIDAD: HASH SHA-256 NATIVO (WEB CRYPTO API)
// ------------------------------------------------------------
async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + ':' + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return btoa(String.fromCharCode.apply(null, hashArray));
}

function normalizeUsername(value) {
  const username = String(value || '').trim();
  if (!/^[a-zA-Z0-9._-]{3,30}$/.test(username)) {
    throw new Error('El usuario debe tener entre 3 y 30 caracteres (letras, números, punto o guion).');
  }
  return username;
}

function todayStr(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

// ------------------------------------------------------------
// CONTROL DE VISTAS (LOGIN / APP PRINCIPAL)
// ------------------------------------------------------------
function setAuthMode(registerMode, canRequestAccess = false) {
  $('registerForm').hidden = !registerMode;
  $('loginForm').hidden = registerMode;
  $('authTitle').textContent = registerMode ? 'Crea tu cuenta' : 'Qué bueno verte';
  $('authDescription').textContent = registerMode
    ? 'Crea tu cuenta para solicitar acceso a Macoya.'
    : 'Inicia sesión para entrar al panel de tu finca.';
  $('requestAccessButton').hidden = registerMode || !canRequestAccess;

  showNotice('authMessage', '');
  paintIcons();
}

function showApp(username, role) {
  activeUsername = username;
  activeRole = role || 'Encargado';

  $('activeUsername').textContent = username;
  $('helloUsername').textContent = username;
  $('activeRole').textContent = activeRole;

  document.querySelectorAll('.admin-only').forEach(node => {
    node.hidden = activeRole !== 'Administrador';
  });

  document.querySelectorAll('.seller-only').forEach(node => {
    node.hidden = !['Administrador', 'Encargado'].includes(activeRole);
  });

  $('authScreen').hidden = true;
  $('appShell').hidden = false;

  document.querySelectorAll('input[type="date"]').forEach(input => {
    if (!input.value) input.value = todayStr();
  });

  paintIcons();
  refresh();
}

function showLogin(message = '') {
  sessionStorage.removeItem('macoyaSession');
  currentSession = null;
  activeUsername = '';
  activeRole = '';

  $('appShell').hidden = true;
  $('authScreen').hidden = false;

  setAuthMode(false, true);
  showNotice('authMessage', message);
}

// ------------------------------------------------------------
// VERIFICAR CONEXIÓN Y ESTADO INICIAL
// ------------------------------------------------------------
async function checkSupabaseReady() {
  if (!db && typeof getDb === 'function') {
    getDb();
  }
  if (!db) {
    showNotice(
      'authMessage',
      '⚠️ Atención: Debes configurar tu URL y Clave de Supabase en "config.js" para que la aplicación funcione.',
      true
    );
    return false;
  }
  return true;
}

async function initializeAuth() {
  applySavedTheme();

  if (!(await checkSupabaseReady())) {
    setAuthMode(false, false);
    return;
  }

  try {
    // Verificar si hay usuarios creados en la base de datos
    const { count, error } = await db
      .from('usuarios')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error al consultar usuarios en Supabase:', error);
      showNotice('authMessage', 'Error de conexión con Supabase: ' + error.message, true);
      return;
    }

    const needsRegistration = count === 0;

    // Si tenemos una sesión guardada, validarla contra Supabase
    if (currentSession && currentSession.username) {
      const { data: user, error: userErr } = await db
        .from('usuarios')
        .select('*')
        .eq('username', currentSession.username)
        .maybeSingle();

      if (!userErr && user && user.status === 'Activo') {
        showApp(user.username, user.role);
        return;
      } else {
        sessionStorage.removeItem('macoyaSession');
        currentSession = null;
      }
    }

    setAuthMode(needsRegistration, count > 0);
  } catch (err) {
    showNotice('authMessage', err.message, true);
  }
}

// ------------------------------------------------------------
// REGISTRO DE USUARIOS
// ------------------------------------------------------------
$('registerForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!(await checkSupabaseReady())) return;

  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form));

  setBusy(button, true, 'Creando cuenta…');

  try {
    const username = normalizeUsername(data.username);
    const password = String(data.password || '');
    const confirmation = String(data.confirmPassword || '');

    if (password.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres.');
    }
    if (password !== confirmation) {
      throw new Error('Las contraseñas no coinciden.');
    }

    // Comprobar si el usuario ya existe
    const { data: existingUser } = await db
      .from('usuarios')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingUser) {
      throw new Error('Ese nombre de usuario ya está ocupado.');
    }

    // Contar usuarios para saber si es el primer usuario (administrador)
    const { count } = await db
      .from('usuarios')
      .select('*', { count: 'exact', head: true });

    const isFirst = count === 0;
    const salt = crypto.randomUUID();
    const hash = await hashPassword(password, salt);

    const newUser = {
      username,
      password_hash: hash,
      salt,
      role: isFirst ? 'Administrador' : 'Encargado',
      status: isFirst ? 'Activo' : 'Pendiente',
      authorized_by: isFirst ? 'Sistema' : null,
      authorized_at: isFirst ? new Date().toISOString() : null
    };

    const { error: insertError } = await db
      .from('usuarios')
      .insert([newUser]);

    if (insertError) throw insertError;

    setBusy(button, false, 'Crear cuenta');
    form.reset();
    $('loginUsername').value = username;
    setAuthMode(false, true);

    showNotice(
      'authMessage',
      isFirst
        ? '¡Cuenta administradora creada con éxito! Ahora inicia sesión.'
        : 'Solicitud enviada. Podrás iniciar sesión cuando un administrador apruebe tu cuenta.'
    );

    $('loginPassword').focus();
  } catch (err) {
    setBusy(button, false, 'Crear cuenta');
    showNotice('authMessage', err.message, true);
  }
});

$('requestAccessButton').addEventListener('click', () => {
  setAuthMode(true, true);
  $('registerNote').textContent = 'Solicitarás acceso como encargado. Un administrador debe aprobar la cuenta.';
});

// ------------------------------------------------------------
// INICIO DE SESIÓN
// ------------------------------------------------------------
$('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!(await checkSupabaseReady())) return;

  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form));

  setBusy(button, true, 'Ingresando…');

  try {
    const username = normalizeUsername(data.username);
    const password = String(data.password || '');

    const { data: user, error } = await db
      .from('usuarios')
      .select('*')
      .ilike('username', username)
      .maybeSingle();

    if (error || !user) {
      throw new Error('Usuario o contraseña incorrectos.');
    }

    const calculatedHash = await hashPassword(password, user.salt);
    if (calculatedHash !== user.password_hash) {
      throw new Error('Usuario o contraseña incorrectos.');
    }

    if (user.status === 'Pendiente') {
      throw new Error('Tu cuenta está pendiente de aprobación por un administrador.');
    }
    if (user.status !== 'Activo') {
      throw new Error('Tu cuenta está suspendida. Contacta a un administrador.');
    }

    currentSession = {
      id: user.id,
      username: user.username,
      role: user.role
    };
    sessionStorage.setItem('macoyaSession', JSON.stringify(currentSession));

    setBusy(button, false, 'Iniciar sesión');
    form.reset();
    showApp(user.username, user.role);
  } catch (err) {
    setBusy(button, false, 'Iniciar sesión');
    showNotice('authMessage', err.message, true);
  }
});

$('logoutButton').addEventListener('click', () => {
  showLogin('Has cerrado sesión exitosamente.');
});

// ------------------------------------------------------------
// NAVEGACIÓN ENTRE PESTAÑAS
// ------------------------------------------------------------
document.querySelectorAll('.nav button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav button').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));

    button.classList.add('active');
    const targetPage = $('page-' + button.dataset.page);
    if (targetPage) targetPage.classList.add('active');

    if (button.dataset.page === 'existencias') refresh();
    if (button.dataset.page === 'usuarios') loadUsers();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// ------------------------------------------------------------
// GESTIÓN DE USUARIOS (SÓLO ADMINISTRADOR)
// ------------------------------------------------------------
async function loadUsers() {
  if (activeRole !== 'Administrador') return;
  $('usersRows').innerHTML = '<tr><td colspan="5">Cargando usuarios desde Supabase…</td></tr>';

  try {
    const { data: users, error } = await db
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    $('usersRows').innerHTML = (users || []).map(user => {
      let action = '';

      if (user.status === 'Pendiente') {
        action = `<button class="action-button approve-button" data-action="approve" data-user="${user.id}">Aprobar</button>`;
      } else if (user.username !== activeUsername) {
        const actionName = user.status === 'Activo' ? 'suspend' : 'activate';
        const label = user.status === 'Activo' ? 'Suspender' : 'Reactivar';
        action = `<button class="action-button suspend-button" data-action="${actionName}" data-user="${user.id}">${label}</button>`;
      }

      const dateStr = user.created_at ? new Date(user.created_at).toISOString().slice(0, 10) : '—';

      return `<tr>
        <td>${escapeHtml(user.username)}</td>
        <td>${escapeHtml(user.role)}</td>
        <td><span class="status-pill ${user.status === 'Pendiente' ? 'pending' : user.status === 'Activo' ? 'active' : 'suspended'}">${escapeHtml(user.status)}</span></td>
        <td>${escapeHtml(dateStr)}</td>
        <td>${action || '—'}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="5">No hay usuarios registrados.</td></tr>';

    $('usersMsg').textContent = '';
  } catch (err) {
    $('usersMsg').textContent = 'Error al cargar usuarios: ' + err.message;
  }
}

$('usersRows').addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  button.disabled = true;
  const action = button.dataset.action;
  const userId = button.dataset.user;

  try {
    if (action === 'approve') {
      const { error } = await db
        .from('usuarios')
        .update({
          status: 'Activo',
          authorized_by: activeUsername,
          authorized_at: new Date().toISOString()
        })
        .eq('id', userId);
      if (error) throw error;
    } else {
      const nextStatus = action === 'suspend' ? 'Suspendido' : 'Activo';
      const { error } = await db
        .from('usuarios')
        .update({ status: nextStatus })
        .eq('id', userId);
      if (error) throw error;
    }

    loadUsers();
  } catch (err) {
    $('usersMsg').textContent = err.message;
    button.disabled = false;
  }
});

// ------------------------------------------------------------
// FILTROS DE FECHA Y RANGOS
// ------------------------------------------------------------
function period(which) {
  const now = new Date();
  const start = new Date(now);

  if (which === 'week') start.setDate(now.getDate() - 6);
  if (which === 'month') start.setDate(1);

  $('from').value = todayStr(start);
  $('to').value = todayStr(now);
  refresh();
}

// ------------------------------------------------------------
// CARGA Y ACTUALIZACIÓN DEL DASHBOARD (MÉTRICAS Y GRÁFICAS)
// ------------------------------------------------------------
async function refresh() {
  if (!currentSession || !db) return;

  $('loadMsg').textContent = 'Cargando datos en tiempo real…';

  try {
    const fromDate = $('from').value || '1970-01-01';
    const toDate = $('to').value || '2099-12-31';

    // Consultas concurrentes en Supabase para máxima velocidad
    const [
      rentalsRes,
      entriesRes,
      salesRes,
      drinksRes,
      allSalesRes
    ] = await Promise.all([
      db.from('alquileres').select('*').gte('fecha', fromDate).lte('fecha', toDate),
      db.from('entradas').select('*').gte('fecha', fromDate).lte('fecha', toDate),
      db.from('ventas').select('*').gte('fecha', fromDate).lte('fecha', toDate),
      db.from('bebidas').select('*'),
      db.from('ventas').select('producto, unidades') // Todas las ventas para existencias
    ]);

    if (rentalsRes.error) throw rentalsRes.error;
    if (entriesRes.error) throw entriesRes.error;
    if (salesRes.error) throw salesRes.error;
    if (drinksRes.error) throw drinksRes.error;
    if (allSalesRes.error) throw allSalesRes.error;

    const rentals = rentalsRes.data || [];
    const entries = entriesRes.data || [];
    const sales = salesRes.data || [];
    const drinks = drinksRes.data || [];
    const allSales = allSalesRes.data || [];

    // 1. Alquileres de canoas
    const rentalCount = rentals.length;
    const rentalTotal = rentals.reduce((acc, r) => acc + Number(r.total || 0), 0);

    // 2. Entradas a la finca
    const entryTourists = entries.reduce((acc, e) => acc + Number(e.turistas || 0), 0);
    const entryParticulars = entries.reduce((acc, e) => acc + Number(e.particulares || 0), 0);
    const entryVehicles = entries.reduce((acc, e) => acc + Number(e.vehiculos || 0), 0);
    const touristTotal = entries.reduce((acc, e) => acc + Number(e.valor_turistas || 0), 0);
    const particularTotal = entries.reduce((acc, e) => acc + Number(e.valor_particulares || 0), 0);
    const vehicleTotal = entries.reduce((acc, e) => acc + Number(e.valor_vehiculos || 0), 0);
    const entryTotal = entries.reduce((acc, e) => acc + Number(e.total || 0), 0);

    // 3. Ventas de bebidas y comidas
    const beverageSales = sales.filter(s => APP_CONFIG.drinks.includes(s.producto));
    const mealSales = sales.filter(s => APP_CONFIG.meals.includes(s.producto));

    const beverageTotal = beverageSales.reduce((acc, s) => acc + Number(s.total_venta || 0), 0);
    const beverageProfit = beverageSales.reduce((acc, s) => acc + Number(s.ganancia || 0), 0);
    const mealTotal = mealSales.reduce((acc, s) => acc + Number(s.total_venta || 0), 0);
    const salesTotal = sales.reduce((acc, s) => acc + Number(s.total_venta || 0), 0);

    const sodaUnits = beverageSales
      .filter(s => s.producto === 'Gaseosa')
      .reduce((acc, s) => acc + Number(s.unidades || 0), 0);
    const beerUnits = beverageSales
      .filter(s => s.producto === 'Cerveza')
      .reduce((acc, s) => acc + Number(s.unidades || 0), 0);

    const mealCounts = APP_CONFIG.meals.map(name => ({
      name,
      units: mealSales
        .filter(s => s.producto === name)
        .reduce((acc, s) => acc + Number(s.unidades || 0), 0)
    }));

    // Desglose de productos vendidos
    const productBreakdown = [...APP_CONFIG.drinks, ...APP_CONFIG.meals].map(name => {
      const prodSales = sales.filter(s => s.producto === name);
      return {
        name,
        units: prodSales.reduce((acc, s) => acc + Number(s.unidades || 0), 0),
        total: prodSales.reduce((acc, s) => acc + Number(s.total_venta || 0), 0),
        cost: prodSales.reduce((acc, s) => acc + Number(s.costo_total || 0), 0),
        profit: prodSales.reduce((acc, s) => acc + Number(s.ganancia || 0), 0)
      };
    });

    // Control de inventario y existencias actuales
    const inventory = APP_CONFIG.drinks.map(name => {
      const row = drinks.find(d => d.producto === name) || {
        existencia_inicial: 0,
        unidades_compradas: 0
      };
      const sold = allSales
        .filter(s => s.producto === name)
        .reduce((acc, s) => acc + Number(s.unidades || 0), 0);

      const initial = Number(row.existencia_inicial || 0);
      const purchased = Number(row.unidades_compradas || 0);
      return {
        name,
        initial,
        purchased,
        sold,
        stock: initial + purchased - sold
      };
    });

    const totalIngresos = rentalTotal + entryTotal + salesTotal;
    const totalGanancia = rentalTotal + entryTotal + mealTotal + beverageProfit;

    // Pintar valores en el Dashboard
    $('total').textContent = money(totalIngresos);
    $('profit').textContent = money(totalGanancia);

    $('rentTotal').textContent = money(rentalTotal);
    $('canoeDetail').textContent = rentalCount + ' alquileres de canoa';

    $('entryTotal').textContent = money(entryTotal);
    $('entryDetail').textContent =
      'Turistas: ' + entryTourists + ' · Particulares: ' + entryParticulars + ' · Vehículos: ' + entryVehicles;

    $('drinkTotal').textContent = money(beverageTotal);
    $('drinkDetail').textContent = 'Cervezas: ' + beerUnits + ' · Gaseosas: ' + sodaUnits;
    $('drinkProfit').textContent = 'Ganancia real: ' + money(beverageProfit);

    $('mealTotal').textContent = money(mealTotal);
    $('mealDetail').textContent = mealCounts.map(item => item.name + ': ' + item.units).join(' · ');

    $('touristTotal').textContent = money(touristTotal + particularTotal);
    $('touristDetail').textContent =
      'Turistas: ' + entryTourists + ' (' + money(touristTotal) + ') · Particulares: ' + entryParticulars + ' (' + money(particularTotal) + ')';

    $('vehicleTotal').textContent = money(vehicleTotal);
    $('vehicleDetail').textContent = entryVehicles + ' vehículos registrados';

    // Gráfica de barras de ingresos por categoría
    const chartData = [
      { label: 'Canoas', value: rentalTotal },
      { label: 'Entradas', value: entryTotal },
      { label: 'Bebidas', value: beverageTotal },
      { label: 'Comidas', value: mealTotal }
    ];
    const maxValue = Math.max(1, ...chartData.map(item => item.value));

    $('chartRows').innerHTML = chartData.map(item => {
      const width = item.value === 0 ? 0 : Math.max(2, (item.value / maxValue) * 100);
      return `<div class="chart-row">
        <span class="chart-label">${item.label}</span>
        <div class="chart-track"><div class="chart-bar" style="width:${width}%"></div></div>
        <span class="chart-value">${money(item.value)}</span>
      </div>`;
    }).join('');

    // Tabla de ganancias por producto
    $('productSalesRows').innerHTML = productBreakdown.map(item => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${item.units}</td>
        <td>${money(item.total)}</td>
        <td>${money(item.cost)}</td>
        <td>${money(item.profit)}</td>
      </tr>
    `).join('') || '<tr><td colspan="5">Sin ventas en este periodo.</td></tr>';

    // Tabla de existencias de inventario
    $('inventoryRows').innerHTML = inventory.map(item => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${item.initial}</td>
        <td>${item.purchased}</td>
        <td>${item.sold}</td>
        <td class="stock">${item.stock}</td>
      </tr>
    `).join('');

    $('loadMsg').textContent = '';
    paintIcons();
  } catch (err) {
    console.error('Error al cargar dashboard:', err);
    $('loadMsg').textContent = 'Error al actualizar datos: ' + err.message;
  }
}

// ------------------------------------------------------------
// REGISTRO DE FORMULARIOS EN SUPABASE
// ------------------------------------------------------------

// 1. Alquiler de Canoas
$('rentalForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"], button:not([type])');
  const msg = $('rentalMsg');
  const data = Object.fromEntries(new FormData(form));

  msg.textContent = 'Guardando en Supabase…';
  msg.className = 'message';
  if (button) button.disabled = true;

  try {
    const canoe = Number(data.canoe);
    const days = Number(data.days);
    const date = data.date;

    if (canoe < 1 || canoe > 10 || !Number.isInteger(canoe)) {
      throw new Error('Selecciona una canoa del 1 al 10.');
    }
    if (days < 1 || !Number.isInteger(days)) {
      throw new Error('Los días deben ser un número entero mayor que cero.');
    }

    const rate = canoe <= 3 ? APP_CONFIG.canoeRates.low : APP_CONFIG.canoeRates.high;
    const total = rate * days;

    const { error } = await db.from('alquileres').insert([{
      fecha: date,
      canoa: canoe,
      dias: days,
      tarifa_diaria: rate,
      total: total,
      usuario: activeUsername
    }]);

    if (error) throw error;

    msg.textContent = 'Alquiler guardado con éxito. Total: ' + money(total);
    form.reset();
    form.querySelectorAll('input[type="date"]').forEach(inp => inp.value = todayStr());
    refresh();
  } catch (err) {
    msg.className = 'message error';
    msg.textContent = err.message;
  } finally {
    if (button) button.disabled = false;
  }
});

// 2. Registro de Entradas (Turistas / Particulares / Vehículos)
$('entryForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"], button:not([type])');
  const msg = $('entryMsg');
  const data = Object.fromEntries(new FormData(form));

  msg.textContent = 'Guardando entrada…';
  msg.className = 'message';
  if (button) button.disabled = true;

  try {
    const personType = String(data.personType || 'Turista');
    const people = Number(data.people || 0);
    const vehicles = Number(data.vehicles || 0);
    const date = data.date;

    if (people < 0 || vehicles < 0 || (people + vehicles === 0)) {
      throw new Error('Ingresa al menos una persona o vehículo con cantidades válidas.');
    }

    const tourists = personType === 'Turista' ? people : 0;
    const particulars = personType === 'Particular' ? people : 0;
    const touristTotal = tourists * APP_CONFIG.touristRate;
    const particularTotal = particulars * APP_CONFIG.particularRate;
    const vehicleTotal = vehicles * APP_CONFIG.vehicleRate;
    const total = touristTotal + particularTotal + vehicleTotal;

    const { error } = await db.from('entradas').insert([{
      fecha: date,
      tipo_persona: personType,
      turistas: tourists,
      particulares: particulars,
      vehiculos: vehicles,
      valor_turistas: touristTotal,
      valor_particulares: particularTotal,
      valor_vehiculos: vehicleTotal,
      total: total,
      usuario: activeUsername
    }]);

    if (error) throw error;

    msg.textContent = 'Entrada guardada con éxito. Total: ' + money(total);
    form.reset();
    form.querySelectorAll('input[type="date"]').forEach(inp => inp.value = todayStr());
    refresh();
  } catch (err) {
    msg.className = 'message error';
    msg.textContent = err.message;
  } finally {
    if (button) button.disabled = false;
  }
});

// 3. Inventario de Bebidas (Compras y Precios)
$('inventoryForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"], button:not([type])');
  const msg = $('inventoryMsg');
  const data = Object.fromEntries(new FormData(form));

  msg.textContent = 'Actualizando inventario…';
  msg.className = 'message';
  if (button) button.disabled = true;

  try {
    const name = String(data.product);
    const purchased = Number(data.purchased || 0);
    const initial = Number(data.initial || 0);
    const cost = Number(data.cost || 0);
    const price = Number(data.price || 0);

    if (!APP_CONFIG.drinks.includes(name)) {
      throw new Error('Selecciona un producto válido.');
    }

    // Consultar registro actual en Supabase
    const { data: currentDrink } = await db
      .from('bebidas')
      .select('*')
      .eq('producto', name)
      .maybeSingle();

    if (!currentDrink) {
      const { error } = await db.from('bebidas').insert([{
        producto: name,
        existencia_inicial: initial,
        unidades_compradas: purchased,
        costo_unitario: cost,
        precio_venta: price,
        actualizado: new Date().toISOString()
      }]);
      if (error) throw error;
    } else {
      const { error } = await db.from('bebidas').update({
        existencia_inicial: Number(currentDrink.existencia_inicial || 0) + initial,
        unidades_compradas: Number(currentDrink.unidades_compradas || 0) + purchased,
        costo_unitario: cost || currentDrink.costo_unitario,
        precio_venta: price || currentDrink.precio_venta,
        actualizado: new Date().toISOString()
      }).eq('id', currentDrink.id);
      if (error) throw error;
    }

    msg.textContent = 'Inventario actualizado correctamente en Supabase.';
    form.reset();
    refresh();
  } catch (err) {
    msg.className = 'message error';
    msg.textContent = err.message;
  } finally {
    if (button) button.disabled = false;
  }
});

// 4. Registro de Ventas (Bebidas y Comidas)
$('saleForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"], button:not([type])');
  const msg = $('saleMsg');
  const data = Object.fromEntries(new FormData(form));

  msg.textContent = 'Registrando venta…';
  msg.className = 'message';
  if (button) button.disabled = true;

  try {
    const name = String(data.product);
    const units = Number(data.units);
    const date = data.date;

    if (units < 1 || !Number.isInteger(units)) {
      throw new Error('La cantidad vendida debe ser un número entero mayor que cero.');
    }

    let total = 0;
    let cost = 0;
    let profit = 0;
    let category = '';

    if (APP_CONFIG.meals.includes(name)) {
      category = 'Comida';
      total = units * APP_CONFIG.mealRate;
      cost = 0;
      profit = total;
    } else if (APP_CONFIG.drinks.includes(name)) {
      category = 'Bebida';

      // Obtener costo y precio de la bebida
      const { data: drink, error: drinkErr } = await db
        .from('bebidas')
        .select('*')
        .eq('producto', name)
        .maybeSingle();

      if (drinkErr || !drink) {
        throw new Error('Configura primero los costos y existencias del producto en Inventario.');
      }

      // Validar unidades disponibles
      const { data: pastSales } = await db
        .from('ventas')
        .select('unidades')
        .eq('producto', name);

      const totalSold = (pastSales || []).reduce((acc, s) => acc + Number(s.unidades || 0), 0);
      const available = Number(drink.existencia_inicial || 0) + Number(drink.unidades_compradas || 0) - totalSold;

      if (units > available) {
        throw new Error(`No hay suficientes unidades. Disponibles en bodega: ${available}.`);
      }

      const unitPrice = Number(drink.precio_venta || 0);
      const unitCost = Number(drink.costo_unitario || 0);

      total = units * unitPrice;
      cost = units * unitCost;
      profit = total - cost;
    } else {
      throw new Error('Producto no reconocido.');
    }

    const { error: saleErr } = await db.from('ventas').insert([{
      fecha: date,
      producto: name,
      categoria: category,
      unidades: units,
      precio_unitario: APP_CONFIG.meals.includes(name) ? APP_CONFIG.mealRate : (total / units),
      costo_unitario: APP_CONFIG.meals.includes(name) ? 0 : (cost / units),
      total_venta: total,
      costo_total: cost,
      ganancia: profit,
      usuario: activeUsername
    }]);

    if (saleErr) throw saleErr;

    msg.textContent = `Venta guardada. Total: ${money(total)} (Ganancia: ${money(profit)})`;
    form.reset();
    form.querySelectorAll('input[type="date"]').forEach(inp => inp.value = todayStr());
    refresh();
  } catch (err) {
    msg.className = 'message error';
    msg.textContent = err.message;
  } finally {
    if (button) button.disabled = false;
  }
});

// Inicialización de la aplicación al cargar la página
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input[type="date"]').forEach(input => {
    input.value = todayStr();
  });
  initializeAuth();
  paintIcons();
});
