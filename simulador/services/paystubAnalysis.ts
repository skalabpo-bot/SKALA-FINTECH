import { AnalysisResult, EntityType, FinancialData } from '../types';
import { analyzePaystubDocument } from './geminiService';
import { pdfToImages } from './pdfToImage';
import { calculateCapacity } from './calculatorService';

/** Mapea nombre de pagaduría → EntityType para el cálculo de ley (misma lógica que FinancialForm). */
export const inferEntityType = (name: string): EntityType => {
  const n = (name || '').toUpperCase();
  if (/\bCASUR\b|SUELDOS.*RETIRO.*POLIC|POLIC.*RETIRO/.test(n)) return 'CASUR';
  if (/\bCREMIL\b/.test(n)) return 'CREMIL';
  if (/MIN.*DEFENSA|MINDEFENSA|PENSIONADO.*MINDEFENSA/.test(n)) return 'MIN_DEFENSA';
  if (/SEGUROS ALFA|ALFA/.test(n)) return 'SEGUROS_ALFA';
  return 'GENERAL';
};

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const scaleSize = MAX_WIDTH / img.width;
        if (scaleSize < 1) { canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize; }
        else { canvas.width = img.width; canvas.height = img.height; }
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

/**
 * Re-lee un desprendible (imagen o PDF) con la IA y recalcula la CUOTA DISPONIBLE
 * (capacidad de ley) según la pagaduría. Reutilizable para el botón "Reintentar
 * cálculo del cupo".
 */
export async function recalcCuotaDisponible(
  file: File,
  pagaduria: string | undefined,
  smmlv: number
): Promise<AnalysisResult> {
  let images: { base64: string; mimeType: string }[];
  if (file.type === 'application/pdf') {
    images = await pdfToImages(file, 3, 3);
  } else {
    images = [{ base64: await compressImage(file), mimeType: 'image/jpeg' }];
  }
  const data: FinancialData = await analyzePaystubDocument(images);
  // La pagaduría seleccionada manda sobre el entityType que detectó la IA.
  const dataToUse = pagaduria ? { ...data, entityType: inferEntityType(pagaduria) } : data;
  return calculateCapacity(dataToUse, smmlv);
}
