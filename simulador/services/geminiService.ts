
import { GoogleGenAI, Type } from "@google/genai";
import { FinancialData, ClientData } from "../types";

// CONSTANTES DE LÍMITE
const MAX_RPM = 15;
const STORAGE_KEY = 'gemini_usage_logs';

// ---------------------------------------------------------------------------
// 🔑 API KEYS — leídas desde variables de entorno (nunca hardcodeadas)
// ---------------------------------------------------------------------------
const API_KEYS: string[] = [
  import.meta.env.VITE_GEMINI_API_KEY,
  import.meta.env.VITE_GEMINI_API_KEY_2,
  import.meta.env.VITE_GEMINI_API_KEY_3,
].filter(Boolean);
// ---------------------------------------------------------------------------

const KEY_EXHAUSTED_STORAGE = 'gemini_exhausted_keys';

/** Marca una key como agotada por 1 hora */
const markKeyExhausted = (key: string) => {
  try {
    const exhausted: Record<string, number> = JSON.parse(localStorage.getItem(KEY_EXHAUSTED_STORAGE) || '{}');
    exhausted[key] = Date.now() + 60 * 60 * 1000; // 1 hora
    localStorage.setItem(KEY_EXHAUSTED_STORAGE, JSON.stringify(exhausted));
  } catch (_) {}
};

/** Devuelve la primera key disponible (no agotada) */
const getApiKey = (): string | undefined => {
  // 1. Variable de entorno
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env?.API_KEY) {
      // @ts-ignore
      return process.env.API_KEY;
    }
  } catch (_) {}

  // 2. Rotar entre keys configuradas, saltando las agotadas
  try {
    const exhausted: Record<string, number> = JSON.parse(localStorage.getItem(KEY_EXHAUSTED_STORAGE) || '{}');
    const now = Date.now();
    for (const key of API_KEYS) {
      if (key && (!exhausted[key] || exhausted[key] < now)) return key;
    }
  } catch (_) {}

  // 3. Fallback: devolver la primera key sin importar estado
  return API_KEYS.find(k => !!k);
};

/** Devuelve todas las keys disponibles (no agotadas) para rotación */
const getAvailableKeysArray = (): string[] => {
  // 1. Variable de entorno tiene prioridad
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env?.API_KEY) {
      // @ts-ignore
      return [process.env.API_KEY];
    }
  } catch (_) {}

  // 2. Filtrar keys no agotadas
  try {
    const exhausted: Record<string, number> = JSON.parse(localStorage.getItem(KEY_EXHAUSTED_STORAGE) || '{}');
    const now = Date.now();
    const available = API_KEYS.filter(k => k && (!exhausted[k] || exhausted[k] < now));
    if (available.length > 0) return available;
  } catch (_) {}

  // 3. Fallback: todas las keys configuradas
  return API_KEYS.filter(k => !!k);
};

/**
 * Utilería para rastrear el uso de la API localmente (Frontend side)
 * y mostrarlo en la UI.
 */
export const getRateLimitStatus = () => {
  try {
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const now = Date.now();
    // Filtrar logs más viejos de 60 segundos
    const recentLogs = logs.filter((timestamp: number) => now - timestamp < 60000);
    
    // Si hubo limpieza, actualizar storage
    if (recentLogs.length !== logs.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentLogs));
    }

    return {
      used: recentLogs.length,
      limit: MAX_RPM,
      remaining: Math.max(0, MAX_RPM - recentLogs.length),
      modelName: 'Gemini 3 Flash'
    };
  } catch (e) {
    return { used: 0, limit: MAX_RPM, remaining: MAX_RPM, modelName: 'Gemini 3 Flash' };
  }
};

const trackUsage = () => {
  const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  logs.push(Date.now());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
};

export const analyzePaystubDocument = async (base64Data: string, mimeType: string): Promise<FinancialData> => {
  const availableKeys = getAvailableKeysArray();

  if (availableKeys.length === 0) {
    throw new Error("⚠️ Error Crítico: API Key faltante.\n\nPara arreglar esto:\n1. Abre el archivo 'services/geminiService.ts'\n2. Agrega tu API Key de Google AI Studio en el array API_KEYS.");
  }

  // Registrar intento de uso
  trackUsage();

  const prompt = `
    Eres un extractor de datos de desprendibles de nómina colombianos. Tu única tarea es leer cifras del documento y devolverlas en JSON. NO apliques reglas de ley ni interpretes normativa.

    CAMPO 1 — employerName
    Copia EXACTAMENTE el nombre de la empresa o entidad que aparece en el membrete o encabezado del documento.
    Ejemplos válidos: "Policía Nacional", "Alcaldía de Medellín", "CREMIL", "Seguros Alfa S.A.", "Universidad de Antioquia".

    CAMPO 2 — monthlyIncome
    El TOTAL DEVENGADO: suma de todos los ingresos fijos del periodo (salario básico, asignación básica, mesada pensional, haber de retiro, incremento, y cualquier otro ingreso fijo recurrente).
    Busca etiquetas como: "Total Devengado", "Total Ingresos", "Mesada Pensional", "Haber Mensual", "Básico", "Asignación Básica", "Incremento".
    IMPORTANTE: Si existe una línea llamada "Incremento", INCLÚYELA en el total devengado si no está ya sumada en "Total Devengado" o "Total Ingresos".
    EXCLUYE SOLO: bonificaciones variables ocasionales, viáticos, horas extra, gastos de representación no fijos.
    Si hay una línea de "Total Devengado" o "Total Ingresos", usa ese valor directamente (ya debe incluir el incremento).

    CAMPO 3 — mandatoryDeductions
    SUMA ÚNICAMENTE los descuentos de Salud y Pensión (aportes obligatorios de ley).
    Busca etiquetas como: "Salud", "Aporte Salud", "EPS", "Pensión", "Aporte Pensión", "AFP", "Fondo de Pensiones".
    NO incluyas nada más aquí.

    CAMPO 4 — embargos
    SOLO retenciones judiciales. Busca: "Embargo", "Retención Judicial", "Cuota Alimentaria".
    Si no hay, pon 0.

    CAMPO 5 — otherDeductions
    Suma de TODOS los descuentos que NO sean salud, pensión ni embargos.
    Incluye: libranzas, préstamos, créditos, cuotas de cooperativa, seguros de vida (si aparecen como descuento fijo), aportes voluntarios, descuentos varios.
    EXCLUYE: salud, pensión, embargos (ya están en sus propios campos).

    CAMPO 6 — detailedDeductions
    Lista cada ítem incluido en otherDeductions con su nombre exacto del documento y su valor.
    REGLA CRÍTICA: la suma de todos los amounts de esta lista debe ser IGUAL a otherDeductions.
    NO incluyas salud, pensión ni embargos en esta lista.

    CAMPO 7 — entityType
    Detecta solo para referencia interna:
    - "CREMIL" si el membrete dice exactamente "CREMIL"
    - "MIN_DEFENSA" si dice "Ministerio de Defensa", "MINDEFENSA" o "Pensionado MinDefensa"
    - "SEGUROS_ALFA" si dice "Seguros Alfa" o "ALFA"
    - "GENERAL" en cualquier otro caso

    CAMPO 8 — manualQuota
    SOLO aplicable si entityType es "CREMIL".
    Los desprendibles de CREMIL frecuentemente muestran el CUPO DISPONIBLE directamente, que es el valor que el pensionado tiene libre para endeudarse.
    Busca etiquetas como: "Cupo Disponible", "Cupo Libre", "Cupo Autorizado", "Cupo para Libranza", "Disponible Libranza", "Saldo Cupo".
    Si encuentras este valor en un desprendible CREMIL, ponlo aquí. De lo contrario (o si no es CREMIL), pon 0.

    Retorna SOLO JSON válido. Sin markdown, sin explicaciones.
  `;

  const modelsToTry = ["gemini-2.5-flash", "gemini-2.5-flash-preview-05-20"];
  let lastError: any = null;

  for (const currentKey of availableKeys) {
    const ai = new GoogleGenAI({ apiKey: currentKey });
    let hit429 = false;

    for (const modelName of modelsToTry) {
      try {
        console.log(`📡 Intentando modelo: ${modelName} (key: ...${currentKey.slice(-6)})`);

        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              { inlineData: { mimeType: mimeType, data: base64Data } },
              { text: prompt }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                entityType: { type: Type.STRING },
                employerName: { type: Type.STRING },
                monthlyIncome: { type: Type.NUMBER },
                mandatoryDeductions: { type: Type.NUMBER },
                otherDeductions: { type: Type.NUMBER },
                embargos: { type: Type.NUMBER },
                detailedDeductions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      amount: { type: Type.NUMBER }
                    }
                  }
                },
                manualQuota: { type: Type.NUMBER }
              },
              required: ["entityType", "employerName", "monthlyIncome", "mandatoryDeductions", "otherDeductions", "embargos", "manualQuota"]
            }
          }
        });

        if (response.text) {
          console.log(`✅ ÉXITO: Respuesta recibida del modelo ${modelName}`);
          const data = JSON.parse(response.text);
          return {
            monthlyIncome: data.monthlyIncome || 0,
            mandatoryDeductions: data.mandatoryDeductions || 0,
            otherDeductions: data.otherDeductions || 0,
            embargos: data.embargos || 0,
            detailedDeductions: data.detailedDeductions || [],
            entityType: (['CREMIL', 'MIN_DEFENSA', 'SEGUROS_ALFA'].includes(data.entityType) ? data.entityType : 'GENERAL') as any,
            employerName: data.employerName || '',
            manualQuota: data.manualQuota || 0
          };
        }
      } catch (error: any) {
        const msg = error.message || '';
        console.warn(`❌ Modelo ${modelName} falló:`, msg);
        lastError = error;
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
          hit429 = true;
          break; // no probar más modelos con esta key
        }
        // otros errores (404, etc.) → probar siguiente modelo
      }
    }

    if (hit429) {
      console.warn(`🔄 Key ...${currentKey.slice(-6)} agotada (429). Marcando y rotando...`);
      markKeyExhausted(currentKey);
    }
  }

  // Manejo de errores final
  let errorMsg = "No pudimos leer el documento automáticamente.";
  if (lastError) {
    const msg = lastError.message || '';
    if (msg.includes('404')) errorMsg += " (Modelos IA no disponibles. Verifique nombres de modelo)";
    else if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) errorMsg += " (Cuota agotada en todas las keys configuradas)";
    else if (msg.includes('403')) errorMsg += " (API Key inválida o sin permisos)";
    else errorMsg += ` (${msg})`;
  }

  throw new Error(errorMsg + "\nPor favor ingrese los datos manualmente.");
};

export interface CedulaImage {
  base64: string;
  mimeType: string;
}

/**
 * Analiza una cédula colombiana enviando una o dos caras (frente y/o reverso)
 * en una sola llamada para extraer todos los datos disponibles.
 */
export const analyzeCedulaDocument = async (images: CedulaImage[]): Promise<ClientData> => {
  const availableKeys = getAvailableKeysArray();

  if (availableKeys.length === 0) {
    throw new Error("API Key faltante.");
  }

  if (!images || images.length === 0) {
    throw new Error("Se requiere al menos una imagen de la cédula.");
  }

  trackUsage();

  const sidesNote = images.length > 1
    ? "Se te proporcionan AMBAS caras de la cédula colombiana. Extrae todos los campos combinando la información de ambas imágenes."
    : "Se te proporciona UNA cara de la cédula colombiana. Extrae todos los campos visibles.";

  const prompt = `
Eres un experto en lectura óptica de cédulas de ciudadanía colombianas (Registraduría Nacional). ${sidesNote}

REGLAS CRÍTICAS DE TRANSCRIPCIÓN:
- Transcribe el texto EXACTAMENTE como aparece impreso. No interpretes, no corrijas ortografía.
- Todo el texto en cédulas colombianas está en MAYÚSCULAS. Devuelve en MAYÚSCULAS.
- CARACTERES ESPECIALES — ten máxima atención:
  * La letra Ñ puede verse borrosa pero ES Ñ, nunca la escribas como "N", "Y", "Y1", "Ñ" o variantes raras.
  * Tildes: Á É Í Ó Ú son letras válidas en nombres colombianos. Escríbelas con tilde si están en el documento.
  * No confundas: O (letra) con 0 (cero), I (i mayúscula) con 1 (uno), l (ele) con 1 (uno).
- El campo SEXO en cédulas colombianas solo puede ser "M" (Masculino) o "F" (Femenino).
- El número de cédula son SOLO dígitos (entre 6 y 10 dígitos), sin puntos, comas ni espacios.
- Las fechas van en formato DD/MM/AAAA.
- Si un campo no es visible o no aparece en la imagen, devuelve "".

CAMPOS A EXTRAER:
1. fullName: Nombre completo = firstName + " " + lastName (Ej: "JUAN CARLOS MUÑOZ PEÑA")
2. firstName: Solo el o los nombres (Ej: "JUAN CARLOS")
3. lastName: Solo el o los apellidos (Ej: "MUÑOZ PEÑA")
4. idNumber: Número de cédula, SOLO dígitos (Ej: "1020304050")
5. sex: SOLO "M" o "F"
6. birthDate: Fecha de nacimiento en DD/MM/AAAA (Ej: "15/03/1985")
7. birthCity: Ciudad de nacimiento en mayúsculas (Ej: "BOGOTÁ")
8. expeditionDate: Fecha de expedición en DD/MM/AAAA (Ej: "10/06/2010")
9. expeditionCity: Ciudad de expedición en mayúsculas (Ej: "MEDELLÍN")

Retorna SOLO JSON válido. Sin markdown, sin explicaciones.
  `;

  const modelsToTry = ["gemini-2.5-flash", "gemini-2.5-flash-preview-05-20"];
  let lastError: any = null;

  for (const currentKey of availableKeys) {
    const ai = new GoogleGenAI({ apiKey: currentKey });
    let hit429 = false;

    for (const modelName of modelsToTry) {
      try {
        console.log(`📡 Intentando modelo: ${modelName} (key: ...${currentKey.slice(-6)})`);
        const imageParts = images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } }));

        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              ...imageParts,
              { text: prompt }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                fullName: { type: Type.STRING },
                firstName: { type: Type.STRING },
                lastName: { type: Type.STRING },
                idNumber: { type: Type.STRING },
                sex: { type: Type.STRING },
                birthDate: { type: Type.STRING },
                birthCity: { type: Type.STRING },
                expeditionDate: { type: Type.STRING },
                expeditionCity: { type: Type.STRING },
              },
              required: ["fullName", "firstName", "lastName", "idNumber", "sex", "birthDate", "birthCity", "expeditionDate", "expeditionCity"]
            }
          }
        });

        if (response.text) {
          console.log(`✅ ÉXITO: Cédula leída con modelo ${modelName}`);
          const data = JSON.parse(response.text);

          // Normalizar sexo — solo M o F
          let sex = (data.sex || '').toUpperCase().trim().replace(/[^MF]/g, '');
          if (sex.length > 1) sex = sex[0]; // tomar solo el primer carácter

          // Limpiar número de cédula — solo dígitos
          const idNumber = (data.idNumber || '').replace(/\D/g, '');

          // Limpiar texto en mayúsculas y trim
          const up = (v: any) => (v || '').toString().toUpperCase().trim();

          return {
            fullName: up(data.fullName),
            firstName: up(data.firstName),
            lastName: up(data.lastName),
            idNumber,
            sex,
            birthDate: (data.birthDate || '').trim(),
            birthCity: up(data.birthCity),
            expeditionDate: (data.expeditionDate || '').trim(),
            expeditionCity: up(data.expeditionCity),
          };
        }
      } catch (error: any) {
        const msg = error.message || '';
        console.warn(`❌ Modelo ${modelName} falló:`, msg);
        lastError = error;
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
          hit429 = true;
          break;
        }
      }
    }

    if (hit429) {
      console.warn(`🔄 Key ...${currentKey.slice(-6)} agotada (429). Marcando y rotando...`);
      markKeyExhausted(currentKey);
    }
  }

  let errorMsg = "No pudimos leer la cédula.";
  if (lastError) {
    const msg = lastError.message || '';
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) errorMsg += " (Cuota agotada en todas las keys configuradas)";
    else if (msg) errorMsg += ` (${msg})`;
  }

  throw new Error(errorMsg);
};
