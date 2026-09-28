export type Producto = {
  id: string;
  cod: string;
  nombre: string;
  proveedor: string;
  categoria: string;
  caja: number;
  precio_caja: number;
  precio_unitario: number;
  foto_url: string;
};

export type ItemCanasta = {
  cod: string;
  nombre: string;
  proveedor: string;
  precio_unitario: number;
  cantidad: number;
};

export type OtroCosto = {
  concepto: string;
  monto: number;
};

export type EstadoCanasta = {
  id: string;
  nombre: string;
  codigo: string;
  cliente: string;
  fecha: string;
  unidades: number;
  validez: string;
  items: ItemCanasta[];
  otros: OtroCosto[];
  armado: number;
  armadoManual: boolean;
  nivel: string;
  costoFijo: number;
  margen: number;
  tipoMargen: "costo" | "venta";
  descuento: number;
  factura: boolean;
  fotoUrl: string;
};

export type Emisor = {
  id: string;
  razon: string;
  ruc: string;
  telefonos: string;
  correo: string;
  logoUrl: string;
  cajaFondoPath: string;
};

export type CanastaGuardada = EstadoCanasta & {
  creadaEn: string;
};

export type ItemCotizacion = {
  canastaId: string;
  nombre: string;
  nivel: string;
  cantidad: number;
  precioUnitario: number;
  items: ItemCanasta[];
  fotoUrl: string;
};

export type Cotizacion = {
  id: string;
  numeroCot: string;
  fecha: string;
  validez: string;
  empresa: string;
  ruc: string;
  contacto: string;
  cargo: string;
  correo: string;
  telefono: string;
  categoria: string;
  campana: string;
  condiciones: string;
  firmante: string;
  canastas: ItemCotizacion[];
};

export type CotizacionGuardada = Cotizacion & {
  creadaEn: string;
};

export const CONDICIONES_COTIZACION_DEFECTO =
  "Precios expresados en soles. Los precios unitarios incluyen IGV.\n" +
  "Validez de la oferta: 15 días calendario desde la fecha de emisión.\n" +
  "Forma de pago: crédito a 15 días luego de la entrega de las canastas.\n" +
  "Lugar de entrega: dentro de Lima Metropolitana.\n" +
  "Los productos están sujetos a la disponibilidad de stock de campaña. Ante el quiebre de algún producto, se reemplaza por otro de igual o mayor valor, previa coordinación con el cliente.";

export function nuevaCotizacion(): Cotizacion {
  return {
    id: "",
    numeroCot: "",
    fecha: hoy(),
    validez: "15 días calendario",
    empresa: "",
    ruc: "",
    contacto: "",
    cargo: "",
    correo: "",
    telefono: "",
    categoria: "Canastas navideñas",
    campana: "2026",
    condiciones: CONDICIONES_COTIZACION_DEFECTO,
    firmante: "",
    canastas: [],
  };
}

export const CATEGORIAS = [
  "Panetones",
  "Vinos y espumantes",
  "Chocolates y dulces",
  "Galletas y snacks",
  "Abarrotes",
  "Conservas",
  "Lácteos",
  "Gourmet",
  "Empaque y bases",
];

export function hoy(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export function nuevoEstado(): EstadoCanasta {
  return {
    id: "",
    nombre: "",
    codigo: "",
    cliente: "",
    fecha: hoy(),
    unidades: 1,
    validez: "15 días",
    items: [],
    otros: [],
    armado: 5,
    armadoManual: false,
    nivel: "",
    costoFijo: 0,
    margen: 30,
    tipoMargen: "costo",
    descuento: 0,
    factura: true,
    fotoUrl: "",
  };
}

export function nuevoEmisor(): Emisor {
  return { id: "", razon: "", ruc: "", telefonos: "", correo: "", logoUrl: "", cajaFondoPath: "" };
}
