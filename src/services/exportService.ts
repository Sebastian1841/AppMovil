// services/exportService.ts
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

type FuelEvent = {
  id?: string | number;
  liters?: number;
  timestamp?: string;
  ibutton?: string | null;
  ibuttonName?: string | null;
  address?: string | null;
};

type FuelReport = {
  totalLiters: number;
  totalEvents: number;
  firstEvent?: string | null;
  lastEvent?: string | null;
};

const LOGO_MODULE = require('../../assets/logo.png');

const COLORS = {
  navy: '#102372',
  navyDark: '#0B195A',
  text: '#1D292F',
  muted: '#66727A',
  border: '#D7DEE6',
  tableHead: '#F5F7FA',
  white: '#FFFFFF',
  orange: '#FF6600',
  orangeSoft: '#FFF4EC',
  navySoft: '#EFF3FF',
};

let logoDataUriPromise: Promise<string | null> | null = null;

function downloadOnWeb(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return '0';

  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function formatLiters(value: unknown) {
  return `${formatNumber(value)} L`;
}

function formatDateTime(value: unknown) {
  if (!value) return '-';

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function formatDateDash(value: unknown) {
  if (!value) return '-';

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();

  return `${day}-${month}-${year}`;
}

function inferMimeType(uri: string) {
  const normalized = uri.toLowerCase();

  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg';
  if (normalized.endsWith('.webp')) return 'image/webp';
  return 'image/png';
}

async function uriToDataUri(uri: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();

      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return `data:${inferMimeType(uri)};base64,${base64}`;
  } catch {
    return null;
  }
}

async function getLogoDataUri(): Promise<string | null> {
  if (!logoDataUriPromise) {
    logoDataUriPromise = (async () => {
      try {
        const asset = Asset.fromModule(LOGO_MODULE);

        if (Platform.OS !== 'web') {
          await asset.downloadAsync();
        }

        const uri = asset.localUri || asset.uri;
        if (!uri) return null;

        return await uriToDataUri(uri);
      } catch {
        return null;
      }
    })();
  }

  return logoDataUriPromise;
}

function buildPdfHtml(params: {
  title: string;
  deviceName?: string;
  identifier?: string;
  dateFrom: string;
  dateTo: string;
  report: FuelReport;
  events: FuelEvent[];
  logoDataUri?: string | null;
}) {
  const {
    title,
    deviceName,
    identifier,
    dateFrom,
    dateTo,
    report,
    events,
    logoDataUri,
  } = params;

  const deviceLabel = deviceName || identifier || 'Sin nombre';
  const generatedAt = formatDateDash(new Date().toISOString());

  const rows = events.length
    ? events
        .map(
          (event, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(formatDateTime(event.timestamp || '-'))}</td>
              <td>${escapeHtml(formatLiters(event.liters ?? 0))}</td>
              <td>${escapeHtml(event.ibutton || '-')}</td>
              <td>${escapeHtml(event.ibuttonName || '-')}</td>
              <td class="cell-address">${escapeHtml(event.address || '-')}</td>
            </tr>
          `
        )
        .join('')
    : `
      <tr>
        <td colspan="6" class="empty-state">Sin descargas para el rango seleccionado.</td>
      </tr>
    `;

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <title>${escapeHtml(title)}</title>

        <style>
          @page {
            margin: 0;
          }

          * {
            box-sizing: border-box;
          }

          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: Arial, Helvetica, sans-serif;
            color: ${COLORS.text};
            font-size: 12px;
          }

          .page {
            width: 100%;
          }

          .header {
            width: 100%;
            margin: 0;
            padding: 14px 18px 11px;
            background: linear-gradient(135deg, ${COLORS.navyDark} 0%, ${COLORS.navy} 100%);
            color: ${COLORS.white};
            border-bottom: 3px solid ${COLORS.orange};
          }

          .header-inner {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 18px;
            width: 100%;
          }

          .header-left {
            flex: 1 1 auto;
            min-width: 0;
            display: flex;
            align-items: center;
            gap: 14px;
          }

          .logo-inline-wrap {
            flex: 0 0 76px;
            width: 76px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .logo-inline {
            display: block;
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
          }

          .header-copy {
            flex: 1 1 auto;
            min-width: 0;
          }

          .title-row {
            min-width: 0;
          }

          .title-kicker {
            margin: 0 0 3px 0;
            font-size: 8.6px;
            font-weight: 700;
            line-height: 1.05;
            color: #ffcfac;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .title-main {
            margin: 0;
            font-size: 18px;
            font-weight: 700;
            line-height: 1.03;
            letter-spacing: -0.025em;
            color: ${COLORS.white};
          }

          .device-line {
            margin-top: 8px;
            font-size: 10px;
            line-height: 1.2;
          }

          .summary-line {
            margin-top: 4px;
            font-size: 9.2px;
            line-height: 1.25;
            color: rgba(255, 255, 255, 0.84);
            max-width: 560px;
          }

          .meta-label {
            font-weight: 700;
            color: #ffb580;
          }

          .meta-value {
            color: ${COLORS.white};
            margin-left: 6px;
          }

          .header-right {
            flex: 0 0 220px;
            text-align: right;
            padding-top: 8px;
          }

          .range-label {
            font-size: 8.4px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #ffb580;
          }

          .range-value {
            margin-top: 4px;
            font-size: 10.4px;
            font-weight: 700;
            line-height: 1.22;
            color: ${COLORS.white};
          }

          .content {
            padding: 16px 18px 24px;
          }

          .section {
            margin-top: 0;
          }

          .summary-grid {
            display: flex;
            gap: 10px;
            width: 100%;
            margin: 0 auto;
          }

          .summary-card {
            flex: 1 1 0;
            min-width: 0;
            border: 1px solid ${COLORS.border};
            border-radius: 14px;
            padding: 12px 14px 10px;
            background: ${COLORS.white};
            vertical-align: top;
          }

          .summary-card.primary {
            background: linear-gradient(180deg, ${COLORS.navySoft} 0%, #ffffff 100%);
          }

          .summary-card.accent {
            background: linear-gradient(180deg, ${COLORS.orangeSoft} 0%, #ffffff 100%);
          }

          .summary-label {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: ${COLORS.muted};
            margin-bottom: 6px;
            font-weight: 700;
          }

          .summary-value-card {
            font-size: 18px;
            font-weight: 700;
            line-height: 1.15;
            color: ${COLORS.navy};
          }

          .summary-value-card.orange {
            color: ${COLORS.orange};
          }

          .summary-helper {
            margin-top: 4px;
            font-size: 10px;
            color: ${COLORS.muted};
            line-height: 1.3;
          }

          .section-header {
            width: 100%;
            max-width: 100%;
            margin: 18px auto 10px;
          }

          .section-title {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
            color: ${COLORS.navy};
          }

          .section-subtitle {
            margin: 4px 0 0;
            font-size: 10px;
            color: ${COLORS.muted};
          }

          .table-wrap {
            border: 1px solid ${COLORS.border};
            border-radius: 14px;
            overflow: hidden;
            width: 100%;
            margin: 0 auto;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin: 0 auto;
          }

          col.col-index { width: 40px; }
          col.col-date { width: 126px; }
          col.col-liters { width: 78px; }
          col.col-ibutton { width: 84px; }
          col.col-name { width: 116px; }
          col.col-address { width: auto; }

          thead th {
            background: ${COLORS.tableHead};
            color: ${COLORS.navy};
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 10px 9px;
            border-bottom: 1px solid ${COLORS.border};
            text-align: left;
          }

          tbody td {
            padding: 9px;
            font-size: 10px;
            vertical-align: top;
            border-top: 1px solid #f0f3f7;
            word-break: break-word;
            white-space: normal;
          }

          tbody tr:nth-child(even) td {
            background: #fcfdff;
          }

          th:last-child,
          td:last-child,
          .cell-address {
            padding-right: 14px;
          }

          .empty-state {
            text-align: center;
            padding: 22px 12px !important;
            color: ${COLORS.muted};
          }

          .footer {
            margin-top: 12px;
            text-align: right;
            font-size: 9px;
            color: ${COLORS.muted};
          }
        </style>
      </head>

      <body>
        <div class="page">
          <div class="header">
            <div class="header-inner">
              <div class="header-left">
                ${
                  logoDataUri
                    ? `
                  <div class="logo-inline-wrap">
                    <img class="logo-inline" src="${logoDataUri}" alt="Logo" />
                  </div>
                `
                    : ''
                }

                <div class="header-copy">
                  <div class="title-row">
                    <p class="title-kicker">Reporte de descargas</p>
                    <h1 class="title-main">${escapeHtml(title)}</h1>
                  </div>

                  <div class="device-line">
                    <span class="meta-label">Dispositivo:</span>
                    <span class="meta-value">${escapeHtml(deviceLabel)}</span>
                  </div>

                  <div class="summary-line">
                    Resumen ejecutivo de descargas registradas generado el ${escapeHtml(generatedAt)}
                  </div>
                </div>
              </div>

              <div class="header-right">
                <div class="range-label">Rango</div>
                <div class="range-value">${escapeHtml(formatDateDash(dateFrom))} a ${escapeHtml(formatDateDash(dateTo))}</div>
              </div>
            </div>
          </div>

          <div class="content">
            <div class="section">
              <div class="summary-grid">
                <div class="summary-card primary">
                  <div class="summary-label">Total litros</div>
                  <div class="summary-value-card orange">${escapeHtml(formatLiters(report.totalLiters))}</div>
                  <div class="summary-helper">Volumen acumulado del período.</div>
                </div>

                <div class="summary-card.accent">
                  <div class="summary-label">Descargas</div>
                  <div class="summary-value-card">${escapeHtml(formatNumber(report.totalEvents))}</div>
                  <div class="summary-helper">Cantidad total registrada.</div>
                </div>
              </div>
            </div>

            <div class="section-header">
              <p class="section-title">Detalle de descargas</p>
              <p class="section-subtitle">
                Fecha, volumen, identificación y dirección de cada registro.
              </p>
            </div>

            <div class="table-wrap">
              <table>
                <colgroup>
                  <col class="col-index" />
                  <col class="col-date" />
                  <col class="col-liters" />
                  <col class="col-ibutton" />
                  <col class="col-name" />
                  <col class="col-address" />
                </colgroup>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha</th>
                    <th>Litros</th>
                    <th>IButton</th>
                    <th>Nombre IButton</th>
                    <th>Dirección</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </div>

            <div class="footer">
              Documento generado automáticamente.
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function drawMetricCard(params: {
  doc: jsPDF;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  value: string;
  helper?: string;
  fillColor: [number, number, number];
  valueColor: [number, number, number];
  borderColor?: [number, number, number];
}) {
  const {
    doc,
    x,
    y,
    w,
    h,
    label,
    value,
    helper,
    fillColor,
    valueColor,
    borderColor = [215, 222, 230],
  } = params;

  doc.setFillColor(...fillColor);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(x, y, w, h, 10, 10, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(102, 114, 122);
  doc.text(label.toUpperCase(), x + 12, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...valueColor);
  doc.text(value, x + 12, y + 32, {
    maxWidth: w - 24,
  });

  if (helper) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(102, 114, 122);
    doc.text(helper, x + 12, y + 45, {
      maxWidth: w - 24,
    });
  }
}

export async function exportFuelCsv(params: {
  filename: string;
  events: FuelEvent[];
}) {
  const { filename, events } = params;

  const csv = Papa.unparse(
    events.map((event) => ({
      fecha: event.timestamp ?? '',
      litros: event.liters ?? 0,
      ibutton: event.ibutton ?? '',
      nombre_ibutton: event.ibuttonName ?? '',
      direccion: event.address ?? '',
    })),
    {
      header: true,
      skipEmptyLines: true,
    }
  );

  if (Platform.OS === 'web') {
    downloadOnWeb(csv, filename, 'text/csv;charset=utf-8;');
    return;
  }

  const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!baseDir) {
    throw new Error('No se encontró un directorio disponible para guardar el CSV.');
  }

  const fileUri = `${baseDir}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Exportar CSV',
      UTI: 'public.comma-separated-values-text',
    });
  }

  return fileUri;
}

export async function exportFuelPdf(params: {
  filename: string;
  title: string;
  deviceName?: string;
  identifier?: string;
  dateFrom: string;
  dateTo: string;
  report: FuelReport;
  events: FuelEvent[];
}) {
  const { filename, title, deviceName, identifier, dateFrom, dateTo, report, events } = params;
  const logoDataUri = await getLogoDataUri();
  const deviceLabel = deviceName || identifier || 'Sin nombre';

  if (Platform.OS === 'web') {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 18;

    const headerX = 0;
    const headerY = 0;
    const headerPadX = 18;
    const headerPadY = 11;
    const rightBlockWidth = 220;
    const logoBoxW = 68;
    const logoBoxH = 55;
    const titleGap = logoDataUri ? 14 : 0;

    const contentX = headerPadX + (logoDataUri ? logoBoxW + titleGap : 0);
    const contentRightX = pageWidth - headerPadX;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    const titleMaxWidth = Math.max(180, pageWidth - contentX - rightBlockWidth - 20);
    const titleLines = doc.splitTextToSize(title, titleMaxWidth);

    const copyTopY = headerPadY + 12;
    const kickerY = copyTopY + 1;
    const titleY = copyTopY + 19;
    const titleLineHeight = 13.5;
    const titleBlockHeight = Math.max(13.5, titleLines.length * titleLineHeight);
    const titleBottomY = titleY + titleBlockHeight;
    const deviceY = titleBottomY + 8;
    const summaryY = deviceY + 12;
    const copyBottomY = summaryY + 2;

    const rangeLabelY = copyTopY + 3;
    const rangeValueY = copyTopY + 18;

    const headerHeight = Math.max(96, copyBottomY + 10);

    const logoX = headerPadX;
    const logoY = copyTopY + (copyBottomY - copyTopY - logoBoxH) / 2;

    doc.setFillColor(11, 25, 90);
    doc.rect(headerX, headerY, pageWidth, headerHeight, 'F');

    doc.setFillColor(255, 102, 0);
    doc.rect(headerX, headerHeight - 3, pageWidth, 3, 'F');

    if (logoDataUri) {
      try {
        const imageFormat = logoDataUri.includes('image/jpeg') ? 'JPEG' : 'PNG';
        const props = doc.getImageProperties(logoDataUri);
        const ratio = props.width / props.height;

        let drawW = logoBoxW;
        let drawH = logoBoxH;

        if (ratio >= 1) {
          drawH = drawW / ratio;
          if (drawH > logoBoxH) {
            drawH = logoBoxH;
            drawW = drawH * ratio;
          }
        } else {
          drawW = drawH * ratio;
          if (drawW > logoBoxW) {
            drawW = logoBoxW;
            drawH = drawW / ratio;
          }
        }

        const imageX = logoX + (logoBoxW - drawW) / 2;
        const imageY = logoY + (logoBoxH - drawH) / 2;

        doc.addImage(logoDataUri, imageFormat, imageX, imageY, drawW, drawH);
      } catch {
        // sin logo si falla
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.6);
    doc.setTextColor(255, 207, 172);
    doc.text('REPORTE DE DESCARGAS', contentX, kickerY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text(titleLines, contentX, titleY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.1);
    doc.setTextColor(255, 181, 128);
    doc.text('Dispositivo:', contentX, deviceY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.4);
    doc.setTextColor(255, 255, 255);
    doc.text(deviceLabel, contentX + 62, deviceY, {
      maxWidth: Math.max(110, titleMaxWidth - 52),
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(225, 230, 240);
    doc.text(
      `Resumen ejecutivo de descargas registradas generado el ${formatDateDash(new Date().toISOString())}`,
      contentX,
      summaryY,
      { maxWidth: titleMaxWidth }
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 181, 128);
    doc.text('RANGO', contentRightX, rangeLabelY, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.2);
    doc.setTextColor(255, 255, 255);
    doc.text(`${formatDateDash(dateFrom)} a ${formatDateDash(dateTo)}`, contentRightX, rangeValueY, {
      align: 'right',
      maxWidth: rightBlockWidth,
    });

    const colIndexW = 24;
    const colDateW = 90;
    const colLitersW = 58;
    const colIbuttonW = 66;
    const colNameW = 90;
    const colAddressW = 170;

    const tableWidth =
      colIndexW +
      colDateW +
      colLitersW +
      colIbuttonW +
      colNameW +
      colAddressW;

    const tableLeft = (pageWidth - tableWidth) / 2;

    const cardsY = headerHeight + 12;
    const cardGap = 10;
    const cardWidth = (tableWidth - cardGap) / 2;
    const cardHeight = 56;

    drawMetricCard({
      doc,
      x: tableLeft,
      y: cardsY,
      w: cardWidth,
      h: cardHeight,
      label: 'Total litros',
      value: formatLiters(report.totalLiters),
      helper: 'Volumen acumulado del período.',
      fillColor: [239, 243, 255],
      valueColor: [255, 102, 0],
    });

    drawMetricCard({
      doc,
      x: tableLeft + cardWidth + cardGap,
      y: cardsY,
      w: cardWidth,
      h: cardHeight,
      label: 'Descargas',
      value: formatNumber(report.totalEvents),
      helper: 'Cantidad total registrada.',
      fillColor: [255, 244, 236],
      valueColor: [16, 35, 114],
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(16, 35, 114);
    doc.text('Detalle de descargas', tableLeft, cardsY + 82);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(102, 114, 122);
    doc.text(
      'Fecha, volumen, identificación y dirección de cada registro.',
      tableLeft,
      cardsY + 95,
      { maxWidth: tableWidth }
    );

    autoTable(doc, {
      startY: cardsY + 105,
      tableWidth,
      head: [['#', 'Fecha', 'Litros', 'IButton', 'Nombre IButton', 'Dirección']],
      body: events.length
        ? events.map((event, index) => [
            String(index + 1),
            formatDateTime(event.timestamp || '-'),
            formatLiters(event.liters ?? 0),
            event.ibutton || '-',
            event.ibuttonName || '-',
            event.address || '-',
          ])
        : [['', 'Sin descargas para el rango seleccionado.', '', '', '', '']],
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8.2,
        cellPadding: 5.5,
        textColor: [29, 41, 47],
        lineColor: [215, 222, 230],
        lineWidth: 1,
        overflow: 'linebreak',
        valign: 'top',
      },
      headStyles: {
        fillColor: [245, 247, 250],
        textColor: [16, 35, 114],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [252, 253, 255],
      },
      columnStyles: {
        0: { cellWidth: colIndexW, halign: 'center' },
        1: { cellWidth: colDateW },
        2: { cellWidth: colLitersW },
        3: { cellWidth: colIbuttonW },
        4: { cellWidth: colNameW },
        5: { cellWidth: colAddressW },
      },
      margin: {
        left: tableLeft,
        right: tableLeft,
        bottom: 34,
      },
      didDrawPage: () => {
        const footerY = pageHeight - 16;

        doc.setDrawColor(215, 222, 230);
        doc.line(marginX, footerY - 8, pageWidth - marginX, footerY - 8);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(102, 114, 122);
        doc.text('Documento generado automáticamente.', marginX, footerY);

        const pageText = `Página ${doc.getNumberOfPages()}`;
        doc.text(pageText, pageWidth - marginX, footerY, {
          align: 'right',
        });
      },
    });

    doc.save(filename);
    return;
  }

  const html = buildPdfHtml({
    title,
    deviceName,
    identifier,
    dateFrom,
    dateTo,
    report,
    events,
    logoDataUri,
  });

  const { uri } = await Print.printToFileAsync({ html });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Exportar PDF',
      UTI: '.pdf',
    });
  }

  return uri;
}