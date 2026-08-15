@AGENTS.md

# Costeador de Canastas Navideñas

Herramienta interna para armar canastas navideñas, calcular su precio con margen
e impuestos, generar la cotización en PDF y el costeo en Excel, y guardar un
historial compartido. La usan tres personas del equipo, todas con la misma
visibilidad sobre catálogo, canastas e historial.

## Decisiones fijas (no las cambies sin que la dueña del proyecto lo pida)

- **Gratuito**: todo el stack usa capas gratuitas (Supabase, hosting). Si algo
  requiere pasar a un plan pago, pregúntale a la dueña primero.
- **Datos compartidos**: las tres usuarias ven y editan el mismo catálogo, las
  mismas canastas y el mismo historial. No hay datos privados por usuaria.
- **Login real y cerrado**: solo las cuentas creadas a mano en el panel de
  Supabase (Authentication > Users) pueden entrar. No hay pantalla de
  registro público en la aplicación, y así debe seguir.
- **La app guarda datos de clientes** (RUC, contacto, teléfono) en cada
  cotización. Por eso el ambiente de prueba y la revisión de seguridad antes
  de publicar cambios grandes no son opcionales.

## Stack

- Next.js (App Router) + React + TypeScript.
- Supabase para base de datos y autenticación. Cliente en `lib/supabase/`.
- `jspdf` para la cotización en PDF, `exceljs` para el costeo en Excel.
- Sin Tailwind: el diseño vive en `app/globals.css` como CSS plano, con las
  variables de color del prototipo original. No mezclar utilidades de
  Tailwind con esas clases.

## Dónde está cada cosa

- `lib/calculo.ts`: toda la fórmula de precio (costo, margen, IGV, impuesto a
  la renta, descuento). Es la única fuente de verdad del cálculo — si algo
  cambia en la fórmula del negocio, cambia aquí y en ningún otro lado.
- `lib/db.ts`: todas las lecturas y escrituras a Supabase (productos,
  canastas, emisor).
- `lib/tipos.ts`: los tipos de datos del negocio, en español, y los valores
  por defecto de una canasta nueva.
- `components/Costeador.tsx`: la aplicación completa (las cuatro pestañas).
- `lib/pdf.ts` / `lib/excel.ts`: generación de archivos descargables.
- `app/login`, `app/cuenta`: login y cambio de contraseña.

## Pruebas

`npm test` corre las pruebas de `lib/calculo.ts` con Vitest. Un hook de
pre-commit (Husky, en `.husky/pre-commit`) las corre solas antes de cada
commit — si fallan, el commit no se hace. Si agregas una regla de negocio
nueva al cálculo, agrégale su prueba en `lib/calculo.test.ts`.

## Antes de publicar un cambio grande

1. `npm run lint` y `npm test` deben pasar (el hook ya obliga esto último).
2. Probar el cambio en el ambiente de prueba, no directo en producción.
3. Correr `/code-review` y `/security-review`.
