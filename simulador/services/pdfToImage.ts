// Convierte un PDF a una o varias imágenes JPEG en base64 (una por página)
// usando pdfjs-dist. Necesario porque OpenAI/Groq no aceptan PDFs y Gemini
// inline_data con PDFs falla en algunos casos.

import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker — usa la versión CDN para no depender del bundler
// (más simple que copiarlo a /public)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface PdfImage {
  base64: string;
  mimeType: 'image/jpeg';
}

/**
 * Renderiza cada página del PDF a una imagen JPEG en base64.
 * @param file Archivo PDF
 * @param maxPages Límite de páginas a renderizar (default 3 — los desprendibles rara vez pasan)
 * @param scale Escala de render. 2 = aprox 144 dpi, buen balance lectura/peso.
 */
export async function pdfToImages(file: File, maxPages = 3, scale = 2): Promise<PdfImage[]> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages = Math.min(pdf.numPages, maxPages);
  const out: PdfImage[] = [];

  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo obtener contexto 2D del canvas');

    // Fondo blanco (PDFs transparentes se ven mejor para OCR)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

    // JPEG calidad 0.85 — bueno para OCR sin engordar
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.split(',')[1];
    out.push({ base64, mimeType: 'image/jpeg' });
  }

  return out;
}
