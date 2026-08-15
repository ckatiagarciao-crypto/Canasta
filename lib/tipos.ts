export type Producto = {
  id: string;
  cod: string;
  nombre: string;
  proveedor: string;
  categoria: string;
  caja: number;
  precio_caja: number;
  precio_unitario: number;
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
  numeroCot: string;
  rucCliente: string;
  contacto: string;
  telefono: string;
  condiciones: string;
  items: ItemCanasta[];
  otros: OtroCosto[];
  armado: number;
  armadoManual: boolean;
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
  color: "verde" | "azul";
  logoUrl: string;
};

export type CanastaGuardada = EstadoCanasta & {
  creadaEn: string;
};

export const CATEGORIAS = [
  "Panetones",
  "Vinos y espumantes",
  "Licores",
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
    numeroCot: "",
    rucCliente: "",
    contacto: "",
    telefono: "",
    condiciones:
      "Precio incluye IGV\nCotización válida por 7 días\nPago contra entrega\nIncluye el delivery",
    items: [],
    otros: [],
    armado: 5,
    armadoManual: false,
    margen: 30,
    tipoMargen: "costo",
    descuento: 0,
    factura: true,
    fotoUrl: "",
  };
}

export function nuevoEmisor(): Emisor {
  return { id: "", razon: "", ruc: "", telefonos: "", correo: "", color: "verde", logoUrl: "" };
}
