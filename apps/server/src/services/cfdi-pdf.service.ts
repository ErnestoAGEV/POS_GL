/**
 * CFDI PDF Generation Service
 *
 * Generates a representation impresa (PDF) of the CFDI.
 * Currently generates an HTML template that can be converted to PDF
 * via a headless browser or wkhtmltopdf in production.
 *
 * For production, install and use: puppeteer, pdfkit, or wkhtmltopdf
 */

export interface PdfInvoiceData {
  uuid: string;
  serie: string;
  folio: string;
  fecha: string;
  emisor: {
    rfc: string;
    nombre: string;
    regimenFiscal: string;
  };
  receptor: {
    rfc: string;
    nombre: string;
    usoCfdi: string;
    domicilioFiscal: string;
  };
  conceptos: Array<{
    descripcion: string;
    cantidad: number;
    claveUnidad: string;
    valorUnitario: number;
    importe: number;
    descuento: number;
  }>;
  subtotal: number;
  descuento: number;
  iva: number;
  total: number;
  formaPago: string;
  metodoPago: string;
  selloSat: string;
  noCertificadoSat: string;
  cadenaOriginal: string;
}

/**
 * Generate HTML representation of invoice (stub for PDF)
 *
 * In production, pipe this HTML to puppeteer.page.pdf() or wkhtmltopdf
 * to get a proper PDF binary.
 */
export function generateInvoiceHtml(data: PdfInvoiceData): string {
  const conceptosRows = data.conceptos
    .map(
      (c) => `
      <tr>
        <td>${c.cantidad}</td>
        <td>${c.claveUnidad}</td>
        <td>${c.descripcion}</td>
        <td class="num">$${c.valorUnitario.toFixed(2)}</td>
        <td class="num">$${c.descuento.toFixed(2)}</td>
        <td class="num">$${c.importe.toFixed(2)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura ${data.serie}-${data.folio}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 20px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #22c55e; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { font-size: 18px; color: #22c55e; }
    .header .fiscal { text-align: right; font-size: 10px; color: #666; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .info-box { border: 1px solid #ddd; border-radius: 6px; padding: 10px; }
    .info-box h3 { font-size: 10px; text-transform: uppercase; color: #666; margin-bottom: 6px; letter-spacing: 0.5px; }
    .info-box p { margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    thead { background: #f0f0f0; }
    th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #eee; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .totals { margin-left: auto; width: 250px; }
    .totals tr td { padding: 4px 8px; }
    .totals tr:last-child { font-weight: bold; font-size: 14px; border-top: 2px solid #22c55e; }
    .fiscal-section { border-top: 1px solid #ddd; padding-top: 12px; margin-top: 16px; font-size: 9px; color: #666; }
    .uuid { font-family: monospace; font-size: 11px; color: #22c55e; font-weight: bold; }
    .qr-placeholder { width: 100px; height: 100px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #999; }
    .stamp-row { display: flex; gap: 16px; align-items: flex-start; }
    .stamp-data { flex: 1; word-break: break-all; }
    .footer { text-align: center; margin-top: 20px; font-size: 9px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>FACTURA</h1>
      <p><strong>${data.serie}-${data.folio}</strong></p>
      <p>Fecha: ${data.fecha}</p>
    </div>
    <div class="fiscal">
      <p>CFDI 4.0</p>
      <p>Forma de Pago: ${data.formaPago}</p>
      <p>Metodo de Pago: ${data.metodoPago}</p>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>Emisor</h3>
      <p><strong>${data.emisor.nombre}</strong></p>
      <p>RFC: ${data.emisor.rfc}</p>
      <p>Regimen: ${data.emisor.regimenFiscal}</p>
    </div>
    <div class="info-box">
      <h3>Receptor</h3>
      <p><strong>${data.receptor.nombre}</strong></p>
      <p>RFC: ${data.receptor.rfc}</p>
      <p>Uso CFDI: ${data.receptor.usoCfdi}</p>
      <p>Domicilio: ${data.receptor.domicilioFiscal}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Cant.</th>
        <th>Unidad</th>
        <th>Descripcion</th>
        <th class="num">P. Unit.</th>
        <th class="num">Desc.</th>
        <th class="num">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${conceptosRows}
    </tbody>
  </table>

  <table class="totals">
    <tr><td>Subtotal</td><td class="num">$${data.subtotal.toFixed(2)}</td></tr>
    ${data.descuento > 0 ? `<tr><td>Descuento</td><td class="num">-$${data.descuento.toFixed(2)}</td></tr>` : ""}
    <tr><td>IVA (16%)</td><td class="num">$${data.iva.toFixed(2)}</td></tr>
    <tr><td>TOTAL</td><td class="num">$${data.total.toFixed(2)}</td></tr>
  </table>

  <div class="fiscal-section">
    <p class="uuid">UUID: ${data.uuid}</p>
    <div class="stamp-row">
      <div class="qr-placeholder">QR Code</div>
      <div class="stamp-data">
        <p><strong>Sello SAT:</strong> ${data.selloSat.substring(0, 60)}...</p>
        <p><strong>No. Certificado SAT:</strong> ${data.noCertificadoSat}</p>
        <p><strong>Cadena Original:</strong> ${data.cadenaOriginal.substring(0, 100)}...</p>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Este documento es una representacion impresa de un CFDI</p>
  </div>
</body>
</html>`;
}
