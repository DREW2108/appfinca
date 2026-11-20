-- ============================================================
-- BASE DE DATOS RELACIONAL POSTGRESQL PARA FINCA MACOYA (SUPABASE)
-- Ejecuta este script en Supabase: SQL Editor -> New Query -> Run
-- ============================================================

-- 1. TABLA: usuarios (Administración y Encargados)
create table if not exists public.usuarios (
    id uuid primary key default gen_random_uuid(),
    username text unique not null,
    password_hash text not null,
    salt text not null,
    role text not null default 'Encargado' check (role in ('Administrador', 'Encargado')),
    status text not null default 'Pendiente' check (status in ('Activo', 'Pendiente', 'Suspendido')),
    created_at timestamptz default timezone('utc'::text, now()) not null,
    authorized_by text,
    authorized_at timestamptz
);

-- 2. TABLA: productos (Catálogo de servicios y productos)
create table if not exists public.productos (
    id text primary key,
    nombre text not null,
    categoria text not null check (categoria in ('Alquiler', 'Bebida', 'Comida', 'Entrada')),
    precio_compra numeric(12, 2) default 0,
    precio_venta numeric(12, 2) default 0,
    stock_minimo integer default 0,
    estado text default 'Activo' check (estado in ('Activo', 'Inactivo'))
);

-- 3. TABLA: bebidas (Control de existencias y costos de bebidas)
create table if not exists public.bebidas (
    id uuid primary key default gen_random_uuid(),
    producto text unique not null,
    existencia_inicial integer default 0 check (existencia_inicial >= 0),
    unidades_compradas integer default 0 check (unidades_compradas >= 0),
    costo_unitario numeric(12, 2) default 0 check (costo_unitario >= 0),
    precio_venta numeric(12, 2) default 0 check (precio_venta >= 0),
    actualizado timestamptz default timezone('utc'::text, now()) not null
);

-- 4. TABLA: alquileres (Registro de alquiler de canoas)
create table if not exists public.alquileres (
    id uuid primary key default gen_random_uuid(),
    fecha date not null,
    canoa integer not null check (canoa between 1 and 10),
    dias integer not null check (dias > 0),
    tarifa_diaria numeric(12, 2) not null check (tarifa_diaria >= 0),
    total numeric(12, 2) not null check (total >= 0),
    registrado timestamptz default timezone('utc'::text, now()) not null,
    usuario text
);

-- 5. TABLA: entradas (Registro de entradas de turistas, particulares y vehículos)
create table if not exists public.entradas (
    id uuid primary key default gen_random_uuid(),
    fecha date not null,
    tipo_persona text not null check (tipo_persona in ('Turista', 'Particular')),
    turistas integer default 0 check (turistas >= 0),
    particulares integer default 0 check (particulares >= 0),
    vehiculos integer default 0 check (vehiculos >= 0),
    valor_turistas numeric(12, 2) default 0 check (valor_turistas >= 0),
    valor_particulares numeric(12, 2) default 0 check (valor_particulares >= 0),
    valor_vehiculos numeric(12, 2) default 0 check (valor_vehiculos >= 0),
    total numeric(12, 2) not null check (total >= 0),
    registrado timestamptz default timezone('utc'::text, now()) not null,
    usuario text
);

-- 6. TABLA: ventas (Registro de ventas de bebidas y comidas)
create table if not exists public.ventas (
    id uuid primary key default gen_random_uuid(),
    fecha date not null,
    producto text not null,
    categoria text not null check (categoria in ('Bebida', 'Comida')),
    unidades integer not null check (unidades > 0),
    precio_unitario numeric(12, 2) not null check (precio_unitario >= 0),
    costo_unitario numeric(12, 2) default 0 check (costo_unitario >= 0),
    total_venta numeric(12, 2) not null check (total_venta >= 0),
    costo_total numeric(12, 2) default 0 check (costo_total >= 0),
    ganancia numeric(12, 2) not null,
    registrado timestamptz default timezone('utc'::text, now()) not null,
    usuario text
);

-- ============================================================
-- ÍNDICES PARA CONSULTAS ULTRA RÁPIDAS
-- ============================================================
create index if not exists idx_alquileres_fecha on public.alquileres (fecha);
create index if not exists idx_entradas_fecha on public.entradas (fecha);
create index if not exists idx_ventas_fecha on public.ventas (fecha);
create index if not exists idx_ventas_producto on public.ventas (producto);
create index if not exists idx_usuarios_username on public.usuarios (username);

-- ============================================================
-- PERMISOS DE TABLAS PARA LOS ROLES anon Y authenticated
-- ============================================================
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all routines in schema public to anon, authenticated;

alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant all on routines to anon, authenticated;

-- ============================================================
-- POLÍTICAS DE ACCESO (ROW LEVEL SECURITY)
-- ============================================================
alter table public.usuarios enable row level security;
alter table public.productos enable row level security;
alter table public.bebidas enable row level security;
alter table public.alquileres enable row level security;
alter table public.entradas enable row level security;
alter table public.ventas enable row level security;

-- Limpiar políticas previas si existieran
drop policy if exists "Anon full access usuarios" on public.usuarios;
drop policy if exists "Anon full access productos" on public.productos;
drop policy if exists "Anon full access bebidas" on public.bebidas;
drop policy if exists "Anon full access alquileres" on public.alquileres;
drop policy if exists "Anon full access entradas" on public.entradas;
drop policy if exists "Anon full access ventas" on public.ventas;

-- Crear políticas permisivas para acceso web
create policy "Anon full access usuarios" on public.usuarios for all using (true) with check (true);
create policy "Anon full access productos" on public.productos for all using (true) with check (true);
create policy "Anon full access bebidas" on public.bebidas for all using (true) with check (true);
create policy "Anon full access alquileres" on public.alquileres for all using (true) with check (true);
create policy "Anon full access entradas" on public.entradas for all using (true) with check (true);
create policy "Anon full access ventas" on public.ventas for all using (true) with check (true);

-- ============================================================
-- DATOS INICIALES / SEMILLA (CATÁLOGO Y BEBIDAS)
-- ============================================================
insert into public.bebidas (producto, existencia_inicial, unidades_compradas, costo_unitario, precio_venta)
values
    ('Gaseosa', 0, 0, 0, 0),
    ('Cerveza', 0, 0, 0, 0)
on conflict (producto) do nothing;

insert into public.productos (id, nombre, categoria, precio_compra, precio_venta, stock_minimo, estado)
values
    ('CAN-01', 'Canoa 1', 'Alquiler', 0, 20000, 0, 'Activo'),
    ('CAN-02', 'Canoa 2', 'Alquiler', 0, 20000, 0, 'Activo'),
    ('CAN-03', 'Canoa 3', 'Alquiler', 0, 20000, 0, 'Activo'),
    ('CAN-04', 'Canoa 4', 'Alquiler', 0, 40000, 0, 'Activo'),
    ('CAN-05', 'Canoa 5', 'Alquiler', 0, 40000, 0, 'Activo'),
    ('CAN-06', 'Canoa 6', 'Alquiler', 0, 40000, 0, 'Activo'),
    ('CAN-07', 'Canoa 7', 'Alquiler', 0, 40000, 0, 'Activo'),
    ('CAN-08', 'Canoa 8', 'Alquiler', 0, 40000, 0, 'Activo'),
    ('CAN-09', 'Canoa 9', 'Alquiler', 0, 40000, 0, 'Activo'),
    ('CAN-10', 'Canoa 10', 'Alquiler', 0, 40000, 0, 'Activo'),
    ('BEB-1', 'Gaseosa', 'Bebida', 0, 0, 0, 'Activo'),
    ('BEB-2', 'Cerveza', 'Bebida', 0, 0, 0, 'Activo'),
    ('COM-1', 'Desayuno', 'Comida', 0, 25000, 0, 'Activo'),
    ('COM-2', 'Almuerzo', 'Comida', 0, 25000, 0, 'Activo'),
    ('COM-3', 'Cena', 'Comida', 0, 25000, 0, 'Activo'),
    ('ENT-01', 'Entrada turista', 'Entrada', 0, 20000, 0, 'Activo'),
    ('ENT-02', 'Ingreso vehículo', 'Entrada', 0, 30000, 0, 'Activo'),
    ('ENT-03', 'Entrada particular', 'Entrada', 0, 10000, 0, 'Activo')
on conflict (id) do nothing;
