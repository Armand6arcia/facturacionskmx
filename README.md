# FACTURA SKMX - MVP Demostrativo CFDI 4.0

Sistema demostrativo para la lectura automática de comprobantes de compra/exportación internos, revisión ágil en 30 segundos, mapeo inteligente de catálogos SAT y timbrado simulado de **CFDI 4.0** en México.

---

## 🚀 Inicio Rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo (sincroniza SQLite y carga el seed automáticamente)
npm run dev
```

Abre en tu navegador: [http://localhost:3000](http://localhost:3000)

Para ejecutar la suite completa de pruebas unitarias y de integración:
```bash
npm test
```

---

## 🎯 Problema que resuelve
Hoy el equipo captura a mano cada producto (con productos nuevos y precios diferenciados por cliente) en la plataforma de facturación. Con Factura SKMX:
1. **Arrastras el archivo** (`.xls` en tabla HTML o binario).
2. **Revisas en 30 segundos** (alertas rojas bloqueantes vs advertencias contables).
3. **Mapeas productos nuevos una sola vez** y el sistema los recuerda para siempre.
4. **Timbras el CFDI 4.0** según el tipo de comprobante (Cliente específico, Público General, Extranjero o Carta Porte).

---

## 📦 Stack Tecnológico
- **Frontend & Backend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Base de Datos**: SQLite con Prisma ORM (`dev.db`)
- **Parsers de Archivos**:
  - `cheerio`: Lectura robusta por nombre de columna para tablas HTML exportadas como `.xls`.
  - `xlsx` (SheetJS): Lectura de formularios binarios (`InvoiceIntg.xls`).
- **Motor de Impuestos**: Cálculo estricto conforme a reglas del SAT con redondeo a 2 decimales por partida y validación con tolerancia de $0.05 MXN.
- **Arquitectura PAC Desacoplada**: Interfaz `PacClient` con implementación `MockPacClient`. Listo para cambiar a Factura.com u otro PAC en producción mediante la variable de entorno `PAC_PROVIDER=facturacom` sin modificar el código de la aplicación.
- **Pruebas Automatizadas**: Vitest (`tax.test.ts`, `parser.test.ts`, `integration.test.ts`).

---

## 🧪 Archivos de Muestra Incluidos (`/samples`)

1. **`samples/IN00491311.xls` (Formato Principal - HTML Table)**:
   - 25 líneas de cosméticos K-Beauty.
   - Total de piezas: **401**
   - Peso total: **60.166 kg**
   - Subtotal calculado: **$75,982.59 MXN**
   - IVA trasladado (16% por línea): **$12,157.19 MXN**
   - Total exacto: **$88,139.78 MXN**
   *(Nota: 16% plano sobre el subtotal daría 12,157.21; la diferencia de 2 centavos proviene del redondeo reglamentario por partida del SAT, calculado de forma exacta).*
   - Códigos de barras limpios (remueve `[ ]` y espacios).
   - Incluye fila `Total` desalineada para comprobar que el sistema la ignora y recalcula.
   - Incluye líneas de prueba con `Purpose Of Use: "PROMO SAMPLE"`, notas en `Reference: "4pcs faltante"`, y variaciones de cantidad.

2. **`samples/InvoiceIntg.xls` (Formato Respaldo - Excel Binario)**:
   - Formato de formulario con metadatos en encabezados (`No. : IN-2026-0889`, `Date : 11-03-2026`, `BUSINESS TYPE : MX-DOMESTIC (+IVA)`, `PAYMENT TERMS : T.T IN ADVANCE`).
   - Importes brutos con IVA incluido.

> 💡 **En la pantalla principal dispones de dos botones de carga rápida con un solo clic** para probar ambos archivos al instante.

---

## 📋 Flujo de Demostración Paso a Paso (Flujo en 2 Pasos)

1. **Carga**: Haz clic en el botón *"Cargar IN00491311.xls"* en la pantalla de inicio o arrastra un archivo.
2. **Paso 1: Revisión y Corrección del Documento**:
   - Observa la columna izquierda con las 25 partidas, mostrando `WholeSale Price` como precio de factura y `Rate` en gris como referencia informativa.
   - En la columna derecha verás el resumen con los totales exactos ($75,982.59 / $12,157.19 / $88,139.78) y la validación de tolerancia.
   - Aparece la alerta roja: **"7 producto(s) nuevo(s) sin clave SAT"**.
   - Haz clic en *"Resolver 7 productos ahora"*, pulsa *"Sugerir clave"* (asigna del catálogo demo) y *"Confirmar y guardar"* (queda guardado de forma permanente).
   - Pulsa el botón: **"Continuar al Paso 2: Datos de Facturación ➜"**.
3. **Paso 2: Cliente, Condiciones de Pago y Facturación**:
   - **Buscar o agregar cliente**: Busca *"Kocare Beauty"* (RFC `EKU9003173C9`) o pulsa *"Agregar nuevo cliente"*. Al seleccionarlo se muestran sus datos fiscales (C.P., régimen fiscal, uso CFDI).
   - **Tipo de Factura**: Elige entre Cliente específico, Público general nacional, Extranjero o Carta Porte.
   - **Forma de Pago**: Viene preseleccionada por default en **"03 - Transferencia electrónica de fondos"** (editable).
   - **Método de Pago**: `"PUE - Pago en una sola exhibición"`.
   - **Botón Facturar**: Una vez seleccionada la información del cliente, se activa el botón azul **"Facturar CFDI 4.0"**.
4. **Simulación de Falla del PAC (Opcional)**:
   - Activa el interruptor *"Simular falla del PAC (503)"* y pulsa *"Facturar CFDI 4.0"*: observa el mensaje de error del PAC y cómo la bitácora registra el reintento sin duplicar timbres.
   - Desactiva el interruptor y vuelve a presionar *"Facturar CFDI 4.0"*.
5. **Visor de CFDI 4.0**:
   - Se muestra la representación impresa de la factura con la marca de agua **"DEMO – SIN VALIDEZ FISCAL"**, folio fiscal UUID simulado, cadena original y sellos.
   - Pulsa *"Descargar XML 4.0"* para inspeccionar el XML generado con namespaces formales del SAT.
   - Pulsa *"Imprimir / Guardar PDF"* para ver la versión impresa limpia.
   - Prueba la *"Cancelación simulada"* eligiendo el motivo `02`.
6. **Control de Duplicados (Idempotencia)**:
   - Vuelve a la pantalla principal e intenta subir el mismo archivo `IN00491311.xls`: el sistema detecta que ya fue timbrado previamente y bloquea duplicar el folio fiscal.
7. **Historial y Bitácora**:
   - Entra a *"Historial y Bitácora"* para auditar todos los comprobantes emitidos y la traza de eventos del sistema.

---

## 🔒 Reglas de Negocio Implementadas

- **Detección por Contenido**: Inspecciona los buffers binarios (`D0 CF 11 E0` o etiquetas HTML `<table`), sin fiarse de la extensión `.xls`.
- **Alertas Rojas (Bloquean timbrado)**:
  - SKU sin clave SAT mapeada.
  - Cliente no seleccionado o con datos fiscales incompletos.
  - Descuadre de totales superior a la tolerancia de $0.05 MXN.
  - Documento ya timbrado previamente (por número y hash SHA-256).
- **Alertas Amarillas (Requieren confirmar / advertencias contables)**:
  - Partida con precio 0.00 o "PROMO" (permite seleccionar: 100% descuento, excluir o facturar normal).
  - Observaciones en columna `Reference` (ej. "4pcs faltante").
  - Variación entre `PI Qty` e `Invc Qty`.
  - Múltiples números de PI en el mismo archivo.
  - Fecha con formato ambiguo (MM-DD-AAAA).
  - Fecha de emisión con más de 72 horas de antigüedad.
  - Aviso de comercio exterior en facturas para extranjeros.
- **Carta Porte 3.1**: CFDI de traslado con precargado automático de peso bruto (60.166 kg) y bultos, con selector de plantillas reutilizables (vehículo, placas, operador).

---

## 📁 Estructura del Código

```text
src/
├── app/
│   ├── api/                   # Endpoints: upload, documentos, productos-sat, timbrar, cancelar, historial
│   ├── factura/[id]/          # Visor CFDI 4.0, descarga XML y cancelación simulada
│   ├── historial/             # Tabla de facturas y bitácora de auditoría
│   ├── revisar/[id]/          # Pantalla de revisión en 2 columnas y alertas
│   ├── layout.tsx             # Layout global con barra de navegación
│   └── page.tsx               # Pantalla de carga, selector de tipo de factura y dropzone
├── components/
│   ├── navigation.tsx         # Barra superior persistente con banner DEMO
│   ├── new-client-modal.tsx   # Alta rápida de clientes
│   └── sku-resolver-modal.tsx # Modal de sugerencia y guardado de claves SAT
├── lib/
│   ├── alerts/checker.ts      # Motor de reglas y severidad de alertas (Rojas vs Amarillas)
│   ├── pac/                   # PacClient, MockPacClient y factory desacoplado
│   ├── parsers/               # Detector de formato, parser HTML (cheerio) y binario (xlsx)
│   ├── prisma.ts              # Cliente Singleton de Prisma
│   └── tax/calculator.ts      # Motor de impuestos por partida y tolerancia fiscal
└── tests/
    ├── parser.test.ts         # Pruebas de extracción de HTML y Binario
    ├── tax.test.ts            # Pruebas de redondeo por línea y tolerancia de 0.05
    └── integration.test.ts    # Prueba integral del flujo completo de timbrado
```

