import { describe, expect, it } from "vitest";
import { calcular, unidadesArmado, armadoSugerido } from "./calculo";
import { nuevoEstado } from "./tipos";
import type { EstadoCanasta } from "./tipos";

function estadoBase(cambios: Partial<EstadoCanasta> = {}): EstadoCanasta {
  return { ...nuevoEstado(), ...cambios };
}

describe("unidadesArmado", () => {
  it("suma cero cuando no hay productos", () => {
    expect(unidadesArmado([])).toBe(0);
  });

  it("suma las cantidades de todos los productos", () => {
    const items = [
      { cod: "A", nombre: "A", proveedor: "", precio_unitario: 1, cantidad: 3 },
      { cod: "B", nombre: "B", proveedor: "", precio_unitario: 1, cantidad: 5 },
    ];
    expect(unidadesArmado(items)).toBe(8);
  });
});

describe("armadoSugerido", () => {
  const itemsCon = (n: number) => [{ cod: "A", nombre: "A", proveedor: "", precio_unitario: 1, cantidad: n }];

  it("sugiere S/ 5 hasta 8 ítems", () => {
    expect(armadoSugerido(itemsCon(8))).toBe(5);
  });
  it("sugiere S/ 10 de 9 a 15 ítems", () => {
    expect(armadoSugerido(itemsCon(9))).toBe(10);
    expect(armadoSugerido(itemsCon(15))).toBe(10);
  });
  it("sugiere S/ 15 con 16 ítems o más", () => {
    expect(armadoSugerido(itemsCon(16))).toBe(15);
  });
});

describe("calcular", () => {
  it("calcula el precio y la utilidad sin IGV (caso de referencia)", () => {
    const st = estadoBase({
      items: [{ cod: "A", nombre: "Producto", proveedor: "Prov", precio_unitario: 100, cantidad: 1 }],
      otros: [],
      armado: 10,
      margen: 20,
      tipoMargen: "costo",
      descuento: 0,
      factura: false,
      unidades: 1,
    });
    const c = calcular(st);

    expect(c.itemsBase).toBeCloseTo(100, 6);
    expect(c.admin).toBeCloseTo(5.5, 6);
    expect(c.costo).toBeCloseTo(115.5, 6);
    expect(c.venta).toBeCloseTo(138.6, 6);
    expect(c.igv).toBe(0);
    expect(c.precioFinal).toBeCloseTo(138.6, 6);
    expect(c.utilidad).toBeCloseTo(23.1, 6);
    expect(c.ir).toBeCloseTo(2.31, 6);
    expect(c.utilidadNeta).toBeCloseTo(20.79, 6);
    expect(c.margenNeto).toBeCloseTo(15, 6);
    expect(c.totalFinal).toBeCloseTo(138.6, 6);
  });

  it("agrega el IGV cuando la canasta emite factura", () => {
    const st = estadoBase({
      items: [{ cod: "A", nombre: "Producto", proveedor: "Prov", precio_unitario: 118, cantidad: 1 }],
      armado: 0,
      margen: 0,
      tipoMargen: "costo",
      factura: true,
    });
    const c = calcular(st);

    // 118 con IGV incluido equivale a 100 sin IGV.
    expect(c.itemsBase).toBeCloseTo(100, 6);
    expect(c.igv).toBeGreaterThan(0);
    expect(c.precioCliente).toBeGreaterThan(c.venta);
  });

  it("aplica el descuento sobre el precio de lista antes del precio final", () => {
    const sinDescuento = calcular(estadoBase({
      items: [{ cod: "A", nombre: "P", proveedor: "", precio_unitario: 100, cantidad: 1 }],
      descuento: 0,
    }));
    const conDescuento = calcular(estadoBase({
      items: [{ cod: "A", nombre: "P", proveedor: "", precio_unitario: 100, cantidad: 1 }],
      descuento: 10,
    }));
    expect(conDescuento.precioFinal).toBeLessThan(sinDescuento.precioFinal);
    expect(conDescuento.montoDcto).toBeCloseTo(conDescuento.precioCliente * 0.1, 6);
  });

  it("nunca deja la utilidad neta negativa por el impuesto a la renta cuando hay pérdida", () => {
    const st = estadoBase({
      items: [{ cod: "A", nombre: "P", proveedor: "", precio_unitario: 10, cantidad: 1 }],
      margen: 0,
      descuento: 90,
      factura: false,
    });
    const c = calcular(st);
    expect(c.ir).toBe(0);
    expect(c.utilidadNeta).toBe(c.utilidad);
  });

  it("multiplica el precio final por el número de canastas", () => {
    const st = estadoBase({
      items: [{ cod: "A", nombre: "P", proveedor: "", precio_unitario: 50, cantidad: 1 }],
      unidades: 4,
    });
    const c = calcular(st);
    expect(c.unidades).toBe(4);
    expect(c.totalFinal).toBeCloseTo(c.precioFinal * 4, 6);
  });

  it("redondea las unidades hacia arriba de 1 como mínimo", () => {
    const st = estadoBase({ items: [{ cod: "A", nombre: "P", proveedor: "", precio_unitario: 10, cantidad: 1 }], unidades: 0 });
    expect(calcular(st).unidades).toBe(1);
  });
});
