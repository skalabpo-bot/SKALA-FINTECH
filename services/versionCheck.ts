// Detecta si hay una versión más nueva del bundle desplegada y notifica al cliente.
//
// Funcionamiento:
// 1. En el primer fetch a /index.html, extraemos el hash del script principal
//    (Vite genera nombres tipo "index-abc123.js") y lo guardamos en memoria como "el hash que estoy ejecutando".
// 2. Cada N minutos volvemos a hacer fetch, extraemos el hash actual del deploy.
// 3. Si difiere → hay versión nueva → dispara callback para mostrar el banner.
//
// El polling NO usa cache (cache: 'no-store') para evitar leer el index.html viejo.

type Callback = () => void;

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

const extractMainScriptHash = (html: string): string | null => {
  // Busca el script principal del bundle (excluye supabaseClient u otros chunks chicos).
  // Patrón Vite: /assets/index-XXXX.js
  const match = html.match(/\/assets\/index-([A-Za-z0-9_-]+)\.js/);
  return match ? match[1] : null;
};

const fetchCurrentHash = async (): Promise<string | null> => {
  try {
    const resp = await fetch('/index.html', { cache: 'no-store' });
    if (!resp.ok) return null;
    const html = await resp.text();
    return extractMainScriptHash(html);
  } catch {
    return null;
  }
};

export interface VersionCheckHandle {
  stop: () => void;
}

/**
 * Arranca el polling. Llama a `onUpdateAvailable` la primera vez que detecta una versión diferente.
 * En dev (donde no hay /assets/index-XXX.js) simplemente no dispara nada.
 */
export const startVersionCheck = (onUpdateAvailable: Callback): VersionCheckHandle => {
  let initialHash: string | null = null;
  let stopped = false;
  let triggered = false;

  const tick = async () => {
    if (stopped || triggered) return;
    const current = await fetchCurrentHash();
    if (!current) return; // dev mode o error de red → ignorar
    if (initialHash === null) {
      initialHash = current;
      return;
    }
    if (current !== initialHash) {
      triggered = true;
      onUpdateAvailable();
    }
  };

  // Tick inicial inmediato + intervalo
  tick();
  const intervalId = window.setInterval(tick, POLL_INTERVAL_MS);

  // También chequear cuando la pestaña vuelve a foco (ahorra polling pasivo)
  const onVisibility = () => { if (!document.hidden) tick(); };
  document.addEventListener('visibilitychange', onVisibility);

  return {
    stop: () => {
      stopped = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
};
