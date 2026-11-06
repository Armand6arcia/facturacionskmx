const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const solution = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '.gemini', 'antigravity', 'brain', '0d7b51a7-7d92-49cc-bcc9-d72ec8b0afb1', 'scratch', 'solution.json'), 'utf8'));
const { bases, baseWeights } = solution;

const productMeta = [
  { sku: "SK-COSRX-001", name: "COSRX Advanced Snail 96 Mucin Power Essence 100ml", brand: "COSRX", barcode: "8809416470009", mapped: true, claveProdServ: "53131602", hsCode: "3304.99.01" },
  { sku: "SK-COSRX-002", name: "COSRX Low pH Good Morning Gel Cleanser 150ml", brand: "COSRX", barcode: "8809416470016", mapped: true, claveProdServ: "53131613", hsCode: "3304.99.01" },
  { sku: "SK-COSRX-003", name: "COSRX BHA Blackhead Power Liquid 100ml", brand: "COSRX", barcode: "8809416470023", mapped: true, claveProdServ: "53131602", hsCode: "3304.99.01" },
  { sku: "SK-COSRX-004", name: "COSRX Oil-Free Ultra-Moisturizing Lotion 100ml", brand: "COSRX", barcode: "8809416470030", mapped: true, claveProdServ: "53131602", hsCode: "3304.99.01" },
  { sku: "SK-BEAUTY-005", name: "Beauty of Joseon Relief Sun Rice + Probiotics 50ml", brand: "Beauty of Joseon", barcode: "8809657114977", mapped: true, claveProdServ: "53131631", hsCode: "3304.99.02" },
  { sku: "SK-BEAUTY-006", name: "Beauty of Joseon Glow Serum Propolis + Niacinamide 30ml", brand: "Beauty of Joseon", barcode: "8809657114984", mapped: true, claveProdServ: "53131602", hsCode: "3304.99.01" },
  { sku: "SK-BEAUTY-007", name: "Beauty of Joseon Dynasty Cream 50ml", brand: "Beauty of Joseon", barcode: "8809657114991", mapped: true, claveProdServ: "53131602", hsCode: "3304.99.01" },
  { sku: "SK-BEAUTY-008", name: "Beauty of Joseon Ginseng Essence Water 150ml", brand: "Beauty of Joseon", barcode: "8809657115004", mapped: true, claveProdServ: "53131602", hsCode: "3304.99.01" },
  { sku: "SK-ANUA-009", name: "Anua Heartleaf 77% Soothing Toner 250ml", brand: "Anua", barcode: "8809640730108", mapped: true, claveProdServ: "53131602", hsCode: "3304.99.01" },
  { sku: "SK-ANUA-010", name: "Anua Heartleaf Pore Control Cleansing Oil 200ml", brand: "Anua", barcode: "8809640730115", mapped: true, claveProdServ: "53131613", hsCode: "3304.99.01" },
  { sku: "SK-ANUA-011", name: "Anua Peach 70% Niacin Serum 30ml", brand: "Anua", barcode: "8809640730122", mapped: true, claveProdServ: "53131602", hsCode: "3304.99.01" },
  { sku: "SK-ROUND-012", name: "Round Lab Birch Juice Moisturizing Sun Cream 50ml", brand: "Round Lab", barcode: "8809657115011", mapped: true, claveProdServ: "53131631", hsCode: "3304.99.02" },
  { sku: "SK-ROUND-013", name: "Round Lab 1025 Dokdo Toner 200ml", brand: "Round Lab", barcode: "8809657115028", mapped: true, claveProdServ: "53131602", hsCode: "3304.99.01" },
  { sku: "SK-ROUND-014", name: "Round Lab 1025 Dokdo Cleanser 150ml", brand: "Round Lab", barcode: "8809657115035", mapped: true, claveProdServ: "53131613", hsCode: "3304.99.01" },
  { sku: "SK-SKIN10-015", name: "SKIN1004 Madagascar Centella Ampoule 100ml", brand: "SKIN1004", barcode: "8809576261011", mapped: true, claveProdServ: "53131602", hsCode: "3304.99.01" },
  { sku: "SK-SKIN10-016", name: "SKIN1004 Madagascar Centella Hyalu-Cica Water-Fit Sun Serum 50ml", brand: "SKIN1004", barcode: "8809576261028", mapped: true, claveProdServ: "53131631", hsCode: "3304.99.02" },
  { sku: "SK-TORRID-017", name: "Torriden DIVE-IN Low Molecular Hyaluronic Acid Serum 50ml", brand: "Torriden", barcode: "8809657115042", mapped: true, claveProdServ: "53131602", hsCode: "3304.99.01" },
  { sku: "SK-TORRID-018", name: "Torriden DIVE-IN Soothing Cream 100ml", brand: "Torriden", barcode: "8809657115059", mapped: true, claveProdServ: "53131602", hsCode: "3304.99.01" },
  // 7 UNMAPPED PRODUCTS (claveProdServ = null in seed for demo)
  { sku: "SK-MEDIH-019", name: "Mediheal Tea Tree Essential Mask 10pk", brand: "Mediheal", barcode: "8809416470047", mapped: false, claveProdServ: null, hsCode: "3304.99.03" },
  { sku: "SK-MEDIH-020", name: "Mediheal Collagen Essential Mask 10pk", brand: "Mediheal", barcode: "8809416470054", mapped: false, claveProdServ: null, hsCode: "3304.99.03" },
  { sku: "SK-MIXSO-021", name: "Mixsoon Bean Essence 50ml", brand: "Mixsoon", barcode: "8809657115066", mapped: false, claveProdServ: null, hsCode: "3304.99.01" },
  { sku: "SK-MIXSO-022", name: "Mixsoon Centella Asiatica Essence 100ml", brand: "Mixsoon", barcode: "8809657115073", mapped: false, claveProdServ: null, hsCode: "3304.99.01" },
  { sku: "SK-HARUH-023", name: "Haruharu Wonder Black Rice Hyaluronic Toner 150ml", brand: "Haruharu Wonder", barcode: "8809657115080", mapped: false, claveProdServ: null, hsCode: "3304.99.01" },
  { sku: "SK-HARUH-024", name: "Haruharu Wonder Black Rice Deep Cleansing Oil 150ml", brand: "Haruharu Wonder", barcode: "8809657115097", mapped: false, claveProdServ: null, hsCode: "3304.99.01" },
  { sku: "SK-PROMO-025", name: "K-Beauty Deluxe Sample Kit (PROMO)", brand: "K-Beauty Lab", barcode: "8809541379468", mapped: false, claveProdServ: null, hsCode: "3304.99.99" }
];

const items = bases.map((b, idx) => {
  const meta = productMeta[idx];
  const piQty = idx === 12 ? b.qty + 3 : b.qty; // line 12 has PI Qty = Invc Qty + 3
  const piNo = idx === 10 ? "PI2026-99" : "PI2026-01"; // line 10 has different PI No
  const purpose = idx === 24 ? "PROMO SAMPLE" : "COMMERCIAL SALE";
  const ref = idx === 24 ? "4pcs faltante" : "";
  const retailPrice = Number((b.price * 1.6).toFixed(2));
  const rate = Number((b.price * 1.25).toFixed(2));
  const cbm = Number(((b.qty * 0.0012)).toFixed(4));
  const weight = baseWeights[idx];

  return {
    piNo,
    sku: meta.sku,
    name: meta.name,
    brand: meta.brand,
    retailPrice,
    rate,
    wholesalePrice: b.price,
    piQty,
    invcQty: b.qty,
    amount: b.base,
    vat: b.iva,
    cbm,
    weight,
    purposeOfUse: purpose,
    reference: ref,
    barcode: `[ ${meta.barcode} ]`,
    cleanBarcode: meta.barcode,
    mapped: meta.mapped,
    claveProdServ: meta.claveProdServ,
    hsCode: meta.hsCode
  };
});

// Create samples directory
const samplesDir = path.join(__dirname, '..', 'samples');
if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
}

// 1. Generate IN00491311.xls (HTML format)
let html = `<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>Commercial Invoice IN00491311</title>
<style>
table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
th { background-color: #f2f2f2; font-weight: bold; }
.num { text-align: right; }
</style>
</head>
<body>
<h2>COMMERCIAL INVOICE: IN00491311</h2>
<table>
<thead>
<tr>
  <th>PI No</th>
  <th>SKU</th>
  <th>Product Name</th>
  <th>Brand</th>
  <th>Retail Price</th>
  <th>Rate</th>
  <th>WholeSale Price</th>
  <th>PI Qty</th>
  <th>Invc Qty</th>
  <th>Amount</th>
  <th>VAT</th>
  <th>CBM</th>
  <th>Weight(kg)</th>
  <th>Purpose Of Use</th>
  <th>Reference</th>
  <th>Barcode</th>
</tr>
</thead>
<tbody>\n`;

for (const it of items) {
  html += `<tr>
  <td>${it.piNo}</td>
  <td>${it.sku}</td>
  <td>${it.name}</td>
  <td>${it.brand}</td>
  <td class="num">${it.retailPrice.toFixed(2)}</td>
  <td class="num">${it.rate.toFixed(2)}</td>
  <td class="num">${it.wholesalePrice.toFixed(2)}</td>
  <td class="num">${it.piQty}</td>
  <td class="num">${it.invcQty}</td>
  <td class="num">${it.amount.toFixed(2)}</td>
  <td class="num">${it.vat.toFixed(2)}</td>
  <td class="num">${it.cbm.toFixed(4)}</td>
  <td class="num">${it.weight.toFixed(3)}</td>
  <td>${it.purposeOfUse}</td>
  <td>${it.reference}</td>
  <td>${it.barcode}</td>
</tr>\n`;
}

// Add intentionally misaligned Total row
html += `<tr class="total-row">
  <td colspan="7"><b>Total</b></td>
  <td class="num"><b>404</b></td>
  <td class="num"><b>401</b></td>
  <td class="num"><b>75982.59</b></td>
  <td class="num"><b>12157.19</b></td>
  <td colspan="5"></td>
</tr>
</tbody>
</table>
</body>
</html>`;

fs.writeFileSync(path.join(samplesDir, 'IN00491311.xls'), html, 'utf8');
console.log("Successfully created samples/IN00491311.xls");

// 2. Generate InvoiceIntg.xls (Binary Excel format)
const wsData = [
  ["COMMERCIAL INVOICE / INTEGRATED FORM"],
  ["No. : IN-2026-0889", "", "", "", "Date : 11-03-2026"],
  ["SOLD TO / BILL TO : KOCARE BEAUTY S.A. DE C.V."],
  ["BUSINESS TYPE : MX-DOMESTIC (+IVA)"],
  ["PAYMENT TERMS : T.T IN ADVANCE"],
  ["REMARK : URGENT AIR SHIPMENT"],
  [],
  ["IDX", "SKU", "DESCRIPTION", "BRAND", "HS CODE", "BARCODE", "Q'TY", "PRICE", "AMOUNT"]
];

let sumBinAmount = 0;
let sumBinQty = 0;

for (let i = 0; i < items.length; i++) {
  const it = items[i];
  const grossAmount = Number((it.amount + it.vat).toFixed(2));
  sumBinAmount += grossAmount;
  sumBinQty += it.invcQty;
  wsData.push([
    i + 1,
    it.sku,
    it.name,
    it.brand,
    it.hsCode,
    it.cleanBarcode,
    it.invcQty,
    it.wholesalePrice,
    grossAmount
  ]);
}

wsData.push(["TOTAL", "", "", "", "", "", sumBinQty, "", Number(sumBinAmount.toFixed(2))]);

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(wsData);
XLSX.utils.book_append_sheet(wb, ws, "Invoice");
XLSX.writeFile(wb, path.join(samplesDir, 'InvoiceIntg.xls'), { bookType: 'xls' });
console.log("Successfully created samples/InvoiceIntg.xls");

// Also save items.json for seed
fs.writeFileSync(path.join(__dirname, '..', 'prisma', 'sample_items.json'), JSON.stringify(items, null, 2));
console.log("Successfully saved prisma/sample_items.json");

