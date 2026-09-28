import { describe, expect, it } from "vitest";
import { requerimiento, resumenPorModelo, totalPedido, utilidadPedido } from "./pedidos";
import type { Pedido, Producto } from "./tipos";

function pedido(cambios: Partial<Pedido> = {}): Pedido {
  return {
    id: "p1",
    fecha: "2026-09-28",
    cliente: "Equimag",
    cotizacionId: "",
    canastaId: "c1",
    canastaNombre: "Gran Reserva Navideña",
    nivel: "N4",
    cantidad: 60,
    precioCatalogo: 299.9,
    precioPactado: null,
    costoUnitario: 200.53198093220342,
    items: [],
    estado: "Confirmado",
    ...cambios,
  };
}

function producto(cod: string, caja: number, precio: number, proveedor = "Grazy"): Producto {
  return { id: cod, cod, nombre: cod, proveedor, categoria: "Abarrotes", caja, precio_caja: caja * precio, precio_unitario: precio, foto_url: "", capacidad: null, medidas: null };
}

describe("pedidos", () => {
  it("usa el precio pactado cuando existe y si no el de catálogo", () => {
    expect(totalPedido(pedido())).toBeCloseTo(60 * 299.9, 6);
    expect(totalPedido(pedido({ precioPactado: 300 }))).toBeCloseTo(18000, 6);
  });

  it("calcula la utilidad igual que la hoja PEDIDOS del Excel", () => {
    // Fila de ejemplo del Excel: Equimag, 60 canastas a S/ 300 pactado.
    expect(utilidadPedido(pedido({ precioPactado: 300 }))).toBeCloseTo(2993.5048728813545, 4);
  });

  it("resume por modelo separando estados y excluyendo anulados de venta y total", () => {
    const r = resumenPorModelo(
      [
        pedido({ estado: "Cotizado", cantidad: 10 }),
        pedido({ estado: "Confirmado", cantidad: 20 }),
        pedido({ estado: "Entregado", cantidad: 5 }),
        pedido({ estado: "Anulado", cantidad: 100 }),
      ],
      "confirmados"
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ cotizadas: 10, confirmadas: 20, entregadas: 5, total: 35, paraCompra: 25 });
    expect(resumenPorModelo([pedido({ estado: "Cotizado", cantidad: 10 })], "todo")[0].paraCompra).toBe(10);
  });

  it("calcula cajas a comprar, sobrante y costos como la hoja REQUERIMIENTO", () => {
    const items = [{ cod: "ABA-01", nombre: "CHOCOLATE", proveedor: "Grazy", precio_unitario: 0.9, cantidad: 3 }];
    const { lineas, proveedores } = requerimiento([pedido({ items })], [producto("ABA-01", 50, 0.9)], "confirmados");
    expect(lineas[0]).toMatchObject({ necesarias: 180, porCaja: 50, cajas: 4, recibes: 200, sobrante: 20 });
    expect(lineas[0].costoNecesario).toBeCloseTo(162, 6);
    expect(lineas[0].costoCompra).toBeCloseTo(180, 6);
    expect(proveedores).toEqual([{ proveedor: "Grazy", cajas: 4, costoCompra: expect.closeTo(180, 6) }]);
  });

  it("no cuenta pedidos cotizados ni anulados en la lista de compras por defecto", () => {
    const items = [{ cod: "ABA-01", nombre: "X", proveedor: "Grazy", precio_unitario: 1, cantidad: 1 }];
    const pedidos = [pedido({ estado: "Cotizado", items }), pedido({ estado: "Anulado", items })];
    expect(requerimiento(pedidos, [producto("ABA-01", 10, 1)], "confirmados").lineas).toHaveLength(0);
    expect(requerimiento(pedidos, [producto("ABA-01", 10, 1)], "todo").lineas[0].necesarias).toBe(60);
  });
});
