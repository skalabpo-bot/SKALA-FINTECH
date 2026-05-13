import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { VEHICREDI_COORDS, DERIVED_COORDS, FieldCoord } from './vehicrediCoords';

const TEMPLATE_URL = '/templates/vehicredi.pdf';

const parseDate = (value: string): { dd: string; mm: string; aa: string } => {
  if (!value) return { dd: '', mm: '', aa: '' };
  // Acepta YYYY-MM-DD o DD/MM/YYYY o DD-MM-YYYY
  let dd = '', mm = '', aa = '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    [aa, mm, dd] = value.split('T')[0].split('-');
  } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(value)) {
    const parts = value.split(/[\/\-]/);
    dd = parts[0].padStart(2, '0');
    mm = parts[1].padStart(2, '0');
    aa = parts[2];
  }
  // Solo 2 últimos dígitos del año si es de 4
  if (aa.length === 4) aa = aa.slice(2);
  return { dd, mm, aa };
};

const drawText = (page: any, text: string, coord: FieldCoord, font: any) => {
  const size = coord.size ?? 9;
  let str = String(text ?? '');
  // Sanitizar caracteres no soportados por StandardFonts (los Standard 14 son WinAnsi, soportan tildes ASCII básico)
  // pdf-lib lanza error si encuentra un caracter fuera del encoding. Reemplazo los más comunes.
  str = str
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–|—/g, '-')
    .replace(/…/g, '...');
  // Truncar si maxWidth está definido (estimación rápida usando width del font)
  if (coord.maxWidth) {
    while (str && font.widthOfTextAtSize(str, size) > coord.maxWidth) {
      str = str.slice(0, -1);
    }
  }
  page.drawText(str, { x: coord.x, y: coord.y, size, font, color: rgb(0, 0, 0) });
};

const drawCheckmark = (page: any, coord: FieldCoord, font: any) => {
  page.drawText('X', { x: coord.x, y: coord.y, size: coord.size ?? 10, font, color: rgb(0, 0, 0) });
};

/**
 * Genera el PDF VehiCredi prellenado con los datos del formulario.
 * Devuelve un Blob descargable.
 */
export async function generateVehicrediPdf(
  data: Record<string, any>,
  options: { debug?: boolean } = {}
): Promise<Blob> {
  // 1. Cargar plantilla
  const resp = await fetch(TEMPLATE_URL);
  if (!resp.ok) {
    throw new Error(`No se pudo cargar la plantilla VehiCredi (${resp.status}). Verifica que /public/templates/vehicredi.pdf exista.`);
  }
  const templateBytes = await resp.arrayBuffer();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  // 2. Iterar el mapa de coordenadas y dibujar cada campo
  const allCoords = { ...VEHICREDI_COORDS, ...DERIVED_COORDS };
  for (const [fieldName, coord] of Object.entries(allCoords)) {
    const pageIdx = coord.page - 1;
    if (pageIdx < 0 || pageIdx >= pages.length) continue;
    const page = pages[pageIdx];

    // Resolver valor — campos derivados
    let value: any;
    if (fieldName === 'titular_nombre_clausula' || fieldName === 'titular_nombre_extracto') {
      value = `${data.nombres || ''} ${data.apellidos || ''} ${data.segundoApellido || ''}`.trim();
    } else if (fieldName === 'titular_cedula_clausula' || fieldName === 'titular_cedula_extracto') {
      value = data.numeroDocumento || '';
    } else {
      value = data[fieldName];
    }

    if (value === undefined || value === null || value === '') {
      // En debug, dibujar un punto rojo para visualizar dónde iría
      if (options.debug) {
        page.drawText('•', { x: coord.x, y: coord.y, size: 8, font, color: rgb(1, 0, 0) });
      }
      continue;
    }

    if (coord.type === 'checkbox') {
      if (String(value) === String(coord.checkIfEquals)) {
        drawCheckmark(page, coord, font);
      }
      continue;
    }

    if (coord.type === 'split-date' && coord.dd && coord.mm && coord.aa) {
      const { dd, mm, aa } = parseDate(String(value));
      if (dd) drawText(page, dd, { ...coord, ...coord.dd }, font);
      if (mm) drawText(page, mm, { ...coord, ...coord.mm }, font);
      if (aa) drawText(page, aa, { ...coord, ...coord.aa }, font);
      continue;
    }

    drawText(page, String(value), coord, font);
  }

  // 3. Serializar
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/** Helper que descarga el PDF generado en el navegador. */
export async function downloadVehicrediPdf(data: Record<string, any>, filename?: string): Promise<void> {
  const blob = await generateVehicrediPdf(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const ced = (data.numeroDocumento || 'sin-cedula').replace(/\D/g, '');
  a.download = filename || `VehiCredi_${ced}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
