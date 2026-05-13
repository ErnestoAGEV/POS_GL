// Ticket printer service using node-thermal-printer (ESC/POS)
// Falls back to text formatting when no printer is connected

import ThermalPrinter from "node-thermal-printer";

const { printer: Printer, types: PrinterTypes } = ThermalPrinter;

interface PrinterConfig {
  type: "epson" | "star";
  interface: string; // e.g., "tcp://192.168.1.100", "COM3", "\\\\localhost\\printer"
  width: number; // characters per line (default 48 for 80mm)
}

interface TicketSaleData {
  folio: string;
  fecha: string;
  sucursal: string;
  terminal: string;
  cajero: string;
  items: Array<{
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    subtotal: number;
  }>;
  subtotal: number;
  descuento: number;
  iva: number;
  total: number;
  pagos: Array<{
    formaPago: string;
    monto: number;
  }>;
  cambio?: number;
  clienteNombre?: string;
}

const FORMA_PAGO_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  credito: "Credito",
  vale_despensa: "Vale Despensa",
  tarjeta_regalo: "T. Regalo",
};

let printerConfig: PrinterConfig | null = null;

export function setPrinterConfig(config: PrinterConfig | null) {
  printerConfig = config;
}

export function getPrinterConfig(): PrinterConfig | null {
  return printerConfig;
}

function pad(text: string, width: number, align: "left" | "right" = "left"): string {
  if (text.length >= width) return text.substring(0, width);
  const spaces = width - text.length;
  return align === "right" ? " ".repeat(spaces) + text : text + " ".repeat(spaces);
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatTicketText(data: TicketSaleData, width = 48): string {
  const lines: string[] = [];
  const sep = "-".repeat(width);

  // Header
  lines.push(pad(data.sucursal, width, "left"));
  lines.push(sep);
  lines.push(`Folio: ${data.folio}`);
  lines.push(`Fecha: ${new Date(data.fecha).toLocaleString()}`);
  lines.push(`Terminal: ${data.terminal}`);
  lines.push(`Cajero: ${data.cajero}`);
  if (data.clienteNombre) {
    lines.push(`Cliente: ${data.clienteNombre}`);
  }
  lines.push(sep);

  // Column headers
  const qtyW = 6;
  const priceW = 10;
  const totalW = 10;
  const nameW = width - qtyW - priceW - totalW;
  lines.push(
    pad("Prod", nameW) +
    pad("Cant", qtyW, "right") +
    pad("P.Unit", priceW, "right") +
    pad("Importe", totalW, "right")
  );
  lines.push(sep);

  // Items
  for (const item of data.items) {
    const nombre = item.nombre.length > nameW ? item.nombre.substring(0, nameW) : item.nombre;
    lines.push(
      pad(nombre, nameW) +
      pad(String(item.cantidad), qtyW, "right") +
      pad(formatMoney(item.precioUnitario), priceW, "right") +
      pad(formatMoney(item.subtotal), totalW, "right")
    );
    if (item.descuento > 0) {
      lines.push(pad(`  Desc: -${formatMoney(item.descuento)}`, width));
    }
  }

  lines.push(sep);

  // Totals
  const labelW = width - 14;
  lines.push(pad("Subtotal:", labelW, "right") + pad(formatMoney(data.subtotal), 14, "right"));
  if (data.descuento > 0) {
    lines.push(pad("Descuento:", labelW, "right") + pad(`-${formatMoney(data.descuento)}`, 14, "right"));
  }
  lines.push(pad("IVA:", labelW, "right") + pad(formatMoney(data.iva), 14, "right"));
  lines.push(sep);
  lines.push(pad("TOTAL:", labelW, "right") + pad(formatMoney(data.total), 14, "right"));
  lines.push(sep);

  // Payments
  lines.push("Forma de pago:");
  for (const pago of data.pagos) {
    const label = FORMA_PAGO_LABELS[pago.formaPago] || pago.formaPago;
    lines.push(pad(`  ${label}:`, labelW, "right") + pad(formatMoney(pago.monto), 14, "right"));
  }
  if (data.cambio !== undefined && data.cambio > 0) {
    lines.push(pad("  Cambio:", labelW, "right") + pad(formatMoney(data.cambio), 14, "right"));
  }

  lines.push(sep);
  lines.push(pad("Gracias por su compra!", width, "left"));
  lines.push("");

  return lines.join("\n");
}

export async function printTicket(data: TicketSaleData): Promise<{ success: boolean; text: string; error?: string }> {
  const text = formatTicketText(data);

  if (!printerConfig) {
    return { success: true, text };
  }

  try {
    const printerType = printerConfig.type === "star" ? PrinterTypes.STAR : PrinterTypes.EPSON;

    const p = new Printer({
      type: printerType,
      interface: printerConfig.interface,
      width: printerConfig.width || 48,
    });

    const isConnected = await p.isPrinterConnected();
    if (!isConnected) {
      return { success: false, text, error: "Impresora no conectada" };
    }

    // Header
    p.alignCenter();
    p.bold(true);
    p.println(data.sucursal);
    p.bold(false);
    p.drawLine();
    p.alignLeft();
    p.println(`Folio: ${data.folio}`);
    p.println(`Fecha: ${new Date(data.fecha).toLocaleString()}`);
    p.println(`Terminal: ${data.terminal}`);
    p.println(`Cajero: ${data.cajero}`);
    if (data.clienteNombre) {
      p.println(`Cliente: ${data.clienteNombre}`);
    }
    p.drawLine();

    // Items
    for (const item of data.items) {
      p.println(item.nombre);
      p.tableCustom([
        { text: `  ${item.cantidad} x ${formatMoney(item.precioUnitario)}`, align: "LEFT", width: 0.6 },
        { text: formatMoney(item.subtotal), align: "RIGHT", width: 0.4 },
      ]);
      if (item.descuento > 0) {
        p.println(`  Desc: -${formatMoney(item.descuento)}`);
      }
    }

    p.drawLine();

    // Totals
    p.tableCustom([
      { text: "Subtotal:", align: "LEFT", width: 0.6 },
      { text: formatMoney(data.subtotal), align: "RIGHT", width: 0.4 },
    ]);
    if (data.descuento > 0) {
      p.tableCustom([
        { text: "Descuento:", align: "LEFT", width: 0.6 },
        { text: `-${formatMoney(data.descuento)}`, align: "RIGHT", width: 0.4 },
      ]);
    }
    p.tableCustom([
      { text: "IVA:", align: "LEFT", width: 0.6 },
      { text: formatMoney(data.iva), align: "RIGHT", width: 0.4 },
    ]);
    p.drawLine();
    p.bold(true);
    p.tableCustom([
      { text: "TOTAL:", align: "LEFT", width: 0.6 },
      { text: formatMoney(data.total), align: "RIGHT", width: 0.4 },
    ]);
    p.bold(false);
    p.drawLine();

    // Payment
    p.println("Forma de pago:");
    for (const pago of data.pagos) {
      const label = FORMA_PAGO_LABELS[pago.formaPago] || pago.formaPago;
      p.tableCustom([
        { text: `  ${label}:`, align: "LEFT", width: 0.6 },
        { text: formatMoney(pago.monto), align: "RIGHT", width: 0.4 },
      ]);
    }
    if (data.cambio !== undefined && data.cambio > 0) {
      p.tableCustom([
        { text: "  Cambio:", align: "LEFT", width: 0.6 },
        { text: formatMoney(data.cambio), align: "RIGHT", width: 0.4 },
      ]);
    }

    p.drawLine();
    p.alignCenter();
    p.println("Gracias por su compra!");
    p.cut();

    await p.execute();
    return { success: true, text };
  } catch (err: any) {
    return { success: false, text, error: err.message || "Error de impresion" };
  }
}
