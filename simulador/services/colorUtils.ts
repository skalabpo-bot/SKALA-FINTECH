// Utilidades de color para tarjetas con la marca de la entidad.
// Oscurece los colores de marca para que el texto blanco siempre sea legible,
// sin importar si la entidad eligió un color claro (amarillo) u oscuro.

const darken = (hex: string, amount: number): string => {
  const h = (hex || '').replace('#', '').trim();
  if (h.length !== 6) return hex || '#1e293b';
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount));
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount));
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount));
  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Devuelve un gradiente CSS oscurecido a partir de los colores de marca,
 * apto para tarjetas con texto blanco. Mantiene el tono de la entidad.
 */
export const entityCardGradient = (primary?: string, secondary?: string): string => {
  const p = primary || '#475569';
  const s = secondary || p || '#1e293b';
  return `linear-gradient(135deg, ${darken(p, 0.42)}, ${darken(s, 0.55)})`;
};
