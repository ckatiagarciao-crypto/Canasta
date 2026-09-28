-- Esquema completo de la base de datos del Costeador de Canastas Navideñas.
-- Se corrió a mano en el SQL Editor de Supabase (proyecto real y de pruebas).
-- Se guarda aquí como referencia, para recrear el proyecto si hiciera falta.

create table productos (
  id uuid primary key default gen_random_uuid(),
  cod text unique not null,
  nombre text not null,
  proveedor text,
  categoria text,
  caja integer not null default 1,
  precio_caja numeric(10,2),
  precio_unitario numeric(10,2) not null,
  foto_url text,
  -- Solo para cajas y cestos (hoja CAJAS): cuántos productos entran y sus
  -- medidas en cm.
  capacidad integer,
  medidas text,
  created_at timestamptz not null default now()
);

create table emisor (
  id uuid primary key default gen_random_uuid(),
  razon text,
  ruc text,
  telefonos text,
  correo text,
  color text default 'verde',
  logo_url text,
  updated_at timestamptz not null default now()
);

create table canastas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  codigo text,
  cliente text,
  fecha date,
  unidades integer not null default 1,
  validez text,
  numero_cot text,
  ruc_cliente text,
  contacto text,
  telefono text,
  condiciones text,
  armado numeric(10,2) not null default 5,
  armado_manual boolean not null default false,
  nivel text,
  costo_fijo numeric(10,2) not null default 0,
  margen numeric(5,2) not null default 30,
  tipo_margen text not null default 'costo',
  descuento numeric(5,2) not null default 0,
  factura boolean not null default true,
  foto_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table canasta_items (
  id uuid primary key default gen_random_uuid(),
  canasta_id uuid not null references canastas(id) on delete cascade,
  cod text,
  nombre text not null,
  proveedor text,
  precio_unitario numeric(10,2) not null default 0,
  cantidad integer not null default 1
);

create table canasta_otros (
  id uuid primary key default gen_random_uuid(),
  canasta_id uuid not null references canastas(id) on delete cascade,
  concepto text,
  monto numeric(10,2) not null default 0
);

-- Una cotización agrupa varias canastas (cada una con su cantidad). El
-- contenido de cada canasta se guarda tal cual estaba al armar la
-- cotización (nombre, nivel, precio, productos y foto) en la columna
-- "canastas", para que la cotización no cambie si luego se edita o se
-- borra la canasta original en el historial.
create table cotizaciones (
  id uuid primary key default gen_random_uuid(),
  numero_cot text,
  fecha date,
  validez text,
  empresa text,
  ruc text,
  contacto text,
  cargo text,
  correo text,
  telefono text,
  categoria text,
  campana text,
  condiciones text,
  firmante text,
  canastas jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Registro de pedidos (hoja PEDIDOS del Excel): una fila por canasta y
-- cliente. Guarda el contenido de la canasta tal cual estaba al registrar
-- el pedido ("items"), para que la lista de compras no cambie si luego se
-- edita o borra la canasta original.
create table pedidos (
  id uuid primary key default gen_random_uuid(),
  fecha date,
  cliente text,
  cotizacion_id uuid references cotizaciones(id) on delete set null,
  canasta_id uuid,
  canasta_nombre text not null,
  nivel text,
  cantidad integer not null default 1,
  precio_catalogo numeric(10,2) not null default 0,
  precio_pactado numeric(10,2),
  costo_unitario numeric(12,4) not null default 0,
  factura boolean not null default true,
  items jsonb not null default '[]'::jsonb,
  estado text not null default 'Cotizado'
    check (estado in ('Cotizado', 'Confirmado', 'Entregado', 'Anulado')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table productos enable row level security;
alter table emisor enable row level security;
alter table canastas enable row level security;
alter table canasta_items enable row level security;
alter table canasta_otros enable row level security;
alter table cotizaciones enable row level security;
alter table pedidos enable row level security;

create policy "equipo autenticado usa productos" on productos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "equipo autenticado usa emisor" on emisor
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "equipo autenticado usa canastas" on canastas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "equipo autenticado usa canasta_items" on canasta_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "equipo autenticado usa canasta_otros" on canasta_otros
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "equipo autenticado usa cotizaciones" on cotizaciones
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "equipo autenticado usa pedidos" on pedidos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- IMPORTANTE: como el proyecto se creó con "Automatically expose new tables"
-- apagado (a propósito, para no dejar nada abierto sin querer), las tablas
-- quedan sin permiso para hablar por la Data API hasta correr esto. Sin este
-- paso, la aplicación se conecta pero recibe siempre listas vacías, sin
-- ningún mensaje de error.
grant select, insert, update, delete on productos to authenticated;
grant select, insert, update, delete on canastas to authenticated;
grant select, insert, update, delete on canasta_items to authenticated;
grant select, insert, update, delete on canasta_otros to authenticated;
grant select, insert, update, delete on emisor to authenticated;
grant select, insert, update, delete on cotizaciones to authenticated;
grant select, insert, update, delete on pedidos to authenticated;

-- El catálogo base va aparte, en lib/catalogoBase.ts (mismos datos, en
-- TypeScript). Si hay que volver a cargarlo a mano, usar ese archivo como
-- referencia para armar los INSERT.
