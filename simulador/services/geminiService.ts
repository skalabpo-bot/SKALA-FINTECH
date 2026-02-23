
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
    Analiza este desprendible de nómina (Libranza Colombia).
    Extrae valores numéricos exactos y LISTA los descuentos.

    PASO 1 - DETECCIÓN DE ENTIDAD:
    Determina si el desprendible es de CREMIL (Caja de Retiro de las Fuerzas Militares).
    Indicadores de CREMIL: palabras como "CREMIL", "Fuerzas Militares", "Ejército", "Armada", "Fuerza Aérea", "Policía Nacional", "CASUR", "FOPEP", membrete militar o policial.
    - Si es CREMIL → entityType: "CREMIL"
    - Si no → entityType: "GENERAL"

    PASO 2 - EXTRACCIÓN DE CAMPOS:
    1. entityType: "CREMIL" o "GENERAL" según el paso anterior.
    2. employerName: Nombre de la empresa o pagaduría que expide el desprendible (ej: "Policía Nacional", "Seguros Alfa", "Alcaldía de Bogotá"). Extrae exactamente el nombre que aparece en el membrete.
    3. monthlyIncome: Suma salarial fija (Básico, Sueldo, Asignación, Mesada).
    4. mandatoryDeductions:
       - Si es GENERAL: SUMA SOLO Salud y Pensión (Fondos de Ley obligatorios).
       - Si es CREMIL: Pon 0 (en CREMIL la ley aplica sobre el salario bruto directamente).
    5. embargos: Valor de embargos judiciales.
    6. otherDeductions: Suma de TODO lo demás (Libranzas, Préstamos, Seguros, Aportes, etc). EXCLUYE Salud/Pensión/Embargos.
    7. detailedDeductions: Lista detallada de CADA item incluido en 'otherDeductions'.
       - IMPORTANTE: No incluyas salud, pensión ni embargos aquí.

    Retorna SOLO JSON. Sin markdown.
  `;

  const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash"];
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
                }
              },
              required: ["entityType", "employerName", "monthlyIncome", "mandatoryDeductions", "otherDeductions", "embargos"]
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
            entityType: data.entityType === 'CREMIL' ? 'CREMIL' : 'GENERAL',
            employerName: data.employerName || ''
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
    ? "Se te proporcionan AMBAS caras de la cédula. Extrae todos los campos combinando la información de las dos imágenes."
    : "Se te proporciona UNA cara de la cédula. Extrae todos los campos visibles.";

  const prompt = `
    Analiza ${images.length > 1 ? 'estas imágenes' : 'esta imagen'} de cédula de ciudadanía colombiana. ${sidesNote}

    CAMPOS REQUERIDOS:
    1. fullName: Nombre completo (nombres + apellidos juntos) — cara frontal
    2. firstName: Solo los nombres (primer y segundo nombre) — cara frontal
    3. lastName: Solo los apellidos (primer y segundo apellido) — cara frontal
    4. idNumber: Número de identificación (solo dígitos, sin puntos ni espacios) — cara frontal
    5. sex: Sexo del titular ("M" para masculino, "F" para femenino, o el valor exacto que aparezca) — cara frontal
    6. birthDate: Fecha de nacimiento en formato DD/MM/AAAA — cara frontal
    7. birthCity: Ciudad de nacimiento — cara frontal
    8. expeditionDate: Fecha de expedición en formato DD/MM/AAAA — cara posterior
    9. expeditionCity: Ciudad de expedición — cara posterior

    Si algún campo no es visible en ninguna de las imágenes, devuelve una cadena vacía "".
    Retorna SOLO JSON. Sin markdown.
  `;

  const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash"];
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
          return {
            fullName: data.fullName || '',
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            idNumber: data.idNumber || '',
            sex: data.sex || '',
            birthDate: data.birthDate || '',
            birthCity: data.birthCity || '',
            expeditionDate: data.expeditionDate || '',
            expeditionCity: data.expeditionCity || '',
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
