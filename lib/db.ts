import { createClient } from "@/lib/supabase/client";
import { CATALOGO_BASE } from "@/lib/catalogoBase";
import type { CanastaGuardada, Emisor, EstadoCanasta, Producto } from "@/lib/tipos";

export async function listarProductos(): Promise<Producto[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("productos").select("*").order("cod");
  if (error) throw error;
  return data as Producto[];
}

export async function crearProducto(p: Omit<Producto, "id">): Promise<Producto> {
  const supabase = createClient();
  const { data, error } = await supabase.from("productos").insert(p).select().single();
  if (error) throw error;
  return data as Producto;
}

export async function actualizarProducto(id: string, cambios: Partial<Producto>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("productos").update(cambios).eq("id", id);
  if (error) throw error;
}

export async function eliminarProducto(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("productos").delete().eq("id", id);
  if (error) throw error;
}

export async function restaurarCatalogoBase(): Promise<Producto[]> {
  const supabase = createClient();
  const { error: errDel } = await supabase.from("productos").delete().neq("cod", "__ninguno__");
  if (errDel) throw errDel;
  const { data, error } = await supabase.from("productos").insert(CATALOGO_BASE).select();
  if (error) throw error;
  return data as Producto[];
}

type FilaCanasta = {
  id: string;
  nombre: string;
  codigo: string | null;
  cliente: string | null;
  fecha: string | null;
  unidades: number;
  validez: string | null;
  numero_cot: string | null;
  ruc_cliente: string | null;
  contacto: string | null;
  telefono: string | null;
  condiciones: string | null;
  armado: number;
  armado_manual: boolean;
  margen: number;
  tipo_margen: "costo" | "venta";
  descuento: number;
  factura: boolean;
  foto_url: string | null;
  created_at: string;
  canasta_items: { cod: string | null; nombre: string; proveedor: string | null; precio_unitario: number; cantidad: number }[];
  canasta_otros: { concepto: string | null; monto: number }[];
};

function filaACanasta(f: FilaCanasta): CanastaGuardada {
  return {
    id: f.id,
    nombre: f.nombre ?? "",
    codigo: f.codigo ?? "",
    cliente: f.cliente ?? "",
    fecha: f.fecha ?? "",
    unidades: f.unidades ?? 1,
    validez: f.validez ?? "",
    numeroCot: f.numero_cot ?? "",
    rucCliente: f.ruc_cliente ?? "",
    contacto: f.contacto ?? "",
    telefono: f.telefono ?? "",
    condiciones: f.condiciones ?? "",
    items: (f.canasta_items ?? []).map((i) => ({
      cod: i.cod ?? "",
      nombre: i.nombre,
      proveedor: i.proveedor ?? "",
      precio_unitario: Number(i.precio_unitario),
      cantidad: Number(i.cantidad),
    })),
    otros: (f.canasta_otros ?? []).map((o) => ({ concepto: o.concepto ?? "", monto: Number(o.monto) })),
    armado: Number(f.armado),
    armadoManual: f.armado_manual,
    margen: Number(f.margen),
    tipoMargen: f.tipo_margen,
    descuento: Number(f.descuento),
    factura: f.factura,
    fotoUrl: f.foto_url ?? "",
    creadaEn: f.created_at,
  };
}

export async function listarCanastas(): Promise<CanastaGuardada[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("canastas")
    .select("*, canasta_items(*), canasta_otros(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as FilaCanasta[]).map(filaACanasta);
}

export async function guardarCanasta(st: EstadoCanasta): Promise<string> {
  const supabase = createClient();
  const fila = {
    nombre: st.nombre,
    codigo: st.codigo,
    cliente: st.cliente,
    fecha: st.fecha || null,
    unidades: Math.max(1, Math.round(Number(st.unidades) || 1)),
    validez: st.validez,
    numero_cot: st.numeroCot,
    ruc_cliente: st.rucCliente,
    contacto: st.contacto,
    telefono: st.telefono,
    condiciones: st.condiciones,
    armado: st.armado,
    armado_manual: st.armadoManual,
    margen: st.margen,
    tipo_margen: st.tipoMargen,
    descuento: st.descuento,
    factura: st.factura,
    foto_url: st.fotoUrl || null,
  };

  let canastaId = st.id;
  if (canastaId) {
    const { error } = await supabase.from("canastas").update(fila).eq("id", canastaId);
    if (error) throw error;
    await supabase.from("canasta_items").delete().eq("canasta_id", canastaId);
    await supabase.from("canasta_otros").delete().eq("canasta_id", canastaId);
  } else {
    const { data, error } = await supabase.from("canastas").insert(fila).select("id").single();
    if (error) throw error;
    canastaId = data.id as string;
  }

  if (st.items.length) {
    const { error } = await supabase.from("canasta_items").insert(
      st.items.map((i) => ({
        canasta_id: canastaId,
        cod: i.cod,
        nombre: i.nombre,
        proveedor: i.proveedor,
        precio_unitario: i.precio_unitario,
        cantidad: i.cantidad,
      }))
    );
    if (error) throw error;
  }
  if (st.otros.length) {
    const { error } = await supabase.from("canasta_otros").insert(
      st.otros.map((o) => ({ canasta_id: canastaId, concepto: o.concepto, monto: o.monto }))
    );
    if (error) throw error;
  }

  return canastaId;
}

export async function eliminarCanasta(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("canastas").delete().eq("id", id);
  if (error) throw error;
}

export async function obtenerEmisor(): Promise<Emisor> {
  const supabase = createClient();
  const { data, error } = await supabase.from("emisor").select("*").limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return { id: "", razon: "", ruc: "", telefonos: "", correo: "", color: "verde", logoUrl: "" };
  return {
    id: data.id,
    razon: data.razon ?? "",
    ruc: data.ruc ?? "",
    telefonos: data.telefonos ?? "",
    correo: data.correo ?? "",
    color: (data.color as "verde" | "azul") ?? "verde",
    logoUrl: data.logo_url ?? "",
  };
}

export async function guardarEmisor(e: Emisor): Promise<Emisor> {
  const supabase = createClient();
  const fila = { razon: e.razon, ruc: e.ruc, telefonos: e.telefonos, correo: e.correo, color: e.color, logo_url: e.logoUrl || null };
  if (e.id) {
    const { error } = await supabase.from("emisor").update(fila).eq("id", e.id);
    if (error) throw error;
    return e;
  }
  const { data, error } = await supabase.from("emisor").insert(fila).select().single();
  if (error) throw error;
  return { ...e, id: data.id };
}
