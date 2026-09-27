export type Nivel = {
  codigo: string;
  nombre: string;
  desde: number;
  hasta: number;
  margen: number;
  costoFijo: number;
};

// Los cuatro niveles de canasta, con su margen y su costo fijo por canasta
// (alquiler y gastos operativos), tal como están en PARAMETROS del Excel de
// costeo 2026.
export const NIVELES: Nivel[] = [
  { codigo: "N1", nombre: "Estándar Institucional", desde: 50, hasta: 75, margen: 22, costoFijo: 5 },
  { codigo: "N2", nombre: "Selección Corporativa", desde: 76, hasta: 120, margen: 25, costoFijo: 6.25 },
  { codigo: "N3", nombre: "Edición Empresarial", desde: 125, hasta: 189, margen: 25, costoFijo: 8.25 },
  { codigo: "N4", nombre: "Edición Premier", desde: 200, hasta: 350, margen: 25, costoFijo: 13.75 },
];

export function nivelPorCodigo(codigo: string): Nivel | undefined {
  return NIVELES.find((n) => n.codigo === codigo);
}
