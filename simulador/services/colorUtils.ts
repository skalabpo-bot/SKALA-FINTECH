// Utilidades de color para las tarjetas del simulador con la marca de la entidad.

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const h = (hex || '').replace('#', '').trim();
  if (h.length !== 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
};

/**
 * Gradiente de la tarjeta con los 2 colores de marca, SIN oscurecer.
 */
export const entityCardGradient = (primary?: string, secondary?: string): string => {
  const p = primary || '#475569';
  const s = secondary || p || '#1e293b';
  return `linear-gradient(135deg, ${p}, ${s})`;
};

/**
 * Devuelve un color con opacidad (rgba) para los marcos/paneles internos.
 * `frame` es el 3er color configurable de la entidad.
 */
export const frameBg = (frame?: string, alpha = 0.85): string => {
  const rgb = hexToRgb(frame || '#0f172a');
  if (!rgb) return `rgba(15, 23, 42, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};
