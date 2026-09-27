import { describe, expect, it } from "vitest";
import { calcular, unidadesArmado, armadoSugerido, RENTA } from "./calculo";
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

  it("sugiere S/ 5 hasta 12 ítems", () => {
    expect(armadoSugerido(itemsCon(12))).toBe(5);
  });
  it("sugiere S/ 10 de 13 a 18 ítems", () => {
    expect(armadoSugerido(itemsCon(13))).toBe(10);
    expect(armadoSugerido(itemsCon(18))).toBe(10);
  });
  it("sugiere S/ 15 con 19 ítems o más", () => {
    expect(armadoSugerido(itemsCon(19))).toBe(15);
  });
});

describe("calcular", () => {
  it("calcula el costo con el alquiler del nivel dentro de la base del gasto administrativo", () => {
    const st = estadoBase({
      items: [{ cod: "A", nombre: "Producto", proveedor: "", precio_unitario: 100, cantidad: 1 }],
      armado: 10,
      costoFijo: 8,
      margen: 20,
      tipoMargen: "costo",
      descuento: 0,
      factura: false,
    });
    const c = calcular(st);

    expect(c.itemsBase).toBeCloseTo(100, 6);
    expect(c.alquiler).toBe(8);
    // El 3.5% se calcula sobre insumos + armado + alquiler, no solo insumos + armado.
    expect(c.admin).toBeCloseTo((100 + 10 + 8) * 0.035, 6);
    expect(c.costo).toBeCloseTo(100 + 10 + 8 + c.admin, 6);
  });

  it("sube la venta lo justo para conservar el margen a pesar del impuesto (tratamiento SUMA)", () => {
    const st = estadoBase({
      items: [{ cod: "A", nombre: "Producto", proveedor: "", precio_unitario: 200, cantidad: 1 }],
      armado: 15,
      costoFijo: 6.25,
      margen: 25,
      tipoMargen: "costo",
      factura: false,
    });
    const c = calcular(st);

    // La venta (antes de IGV, antes de redondear) debe ser exactamente
    // costo*(1+margen) subido por el impuesto a la renta, para que el
    // margen puesto se cumpla pase lo que pase con el impuesto.
    expect(c.venta).toBeCloseTo((c.costo * 1.25) / (1 - RENTA), 6);
  });

  it("calcula la utilidad neta como la utilidad menos el impuesto a la renta", () => {
    const st = estadoBase({
      items: [{ cod: "A", nombre: "Producto", proveedor: "", precio_unitario: 150, cantidad: 1 }],
      armado: 10,
      costoFijo: 5,
      margen: 22,
      factura: true,
    });
    const c = calcular(st);
    expect(c.ir).toBeCloseTo(c.ventaFinal * RENTA, 6);
    expect(c.utilidadNeta).toBeCloseTo(c.utilidad - c.ir, 6);
  });

  it("redondea el precio final al sol entero hacia arriba y le resta 10 céntimos", () => {
    const st = estadoBase({
      items: [{ cod: "A", nombre: "Producto", proveedor: "", precio_unitario: 100, cantidad: 1 }],
      armado: 0,
      costoFijo: 0,
      margen: 0,
      tipoMargen: "costo",
      descuento: 0,
      factura: false,
    });
    const c = calcular(st);
    // costo = 100 + 3.5 (admin) = 103.5; venta = 103.5 / (1 - 0.015) = 105.076...
    // redondeado al sol de arriba (106) y menos 10 céntimos = 105.90
    expect(c.precioFinal).toBeCloseTo(105.9, 6);
  });

  it("agrega el IGV cuando la canasta emite factura", () => {
    const st = estadoBase({
      items: [{ cod: "A", nombre: "Producto", proveedor: "Prov", precio_unitario: 118, cantidad: 1 }],
      armado: 0,
      costoFijo: 0,
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
  });

  it("cobra el impuesto a la renta (RER) sobre la venta incluso si hay pérdida", () => {
    const st = estadoBase({
      items: [{ cod: "A", nombre: "P", proveedor: "", precio_unitario: 10, cantidad: 1 }],
      armado: 5,
      margen: 0,
      descuento: 90,
      factura: false,
    });
    const c = calcular(st);
    expect(c.ir).toBeGreaterThan(0);
    expect(c.ir).toBeCloseTo(c.ventaFinal * RENTA, 6);
    expect(c.utilidadNeta).toBeCloseTo(c.utilidad - c.ir, 6);
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
