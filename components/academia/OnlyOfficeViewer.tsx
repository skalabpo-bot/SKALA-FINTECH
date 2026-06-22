import React, { useEffect, useRef, useState } from 'react';
import { MockService } from '../../services/mockService';
import { Loader2, AlertTriangle } from 'lucide-react';

/**
 * Visor del simulador con OnlyOffice: muestra el Excel REAL embebido (idéntico a Excel,
 * con desplegables, casillas, fórmulas en vivo). El cálculo lo hace OnlyOffice.
 * - Pide la config firmada (JWT) a la Edge Function onlyoffice-config.
 * - Carga el script api.js del Document Server y monta el editor.
 * - Modo edición sin guardar: cada sesión parte del archivo original; los cambios del
 *   asesor se calculan en vivo pero no se persisten (no corrompe la plantilla).
 */
interface Props { filePath: string; fileName?: string; userName?: string; }

let apiLoading: Promise<void> | null = null;
function loadApi(documentServerUrl: string): Promise<void> {
  if ((window as any).DocsAPI) return Promise.resolve();
  if (apiLoading) return apiLoading;
  apiLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${documentServerUrl}/web-apps/apps/api/documents/api.js`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { apiLoading = null; reject(new Error('No se pudo cargar OnlyOffice (revisa la URL del servidor)')); };
    document.body.appendChild(s);
  });
  return apiLoading;
}

export const OnlyOfficeViewer: React.FC<Props> = ({ filePath, fileName, userName }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    const mount = async () => {
      setLoading(true); setError(null);
      try {
        const { documentServerUrl, config } = await MockService.getOnlyOfficeConfig(filePath, fileName || 'simulador.xlsx', userName);
        await loadApi(documentServerUrl);
        if (cancelled) return;
        // limpiar editor previo
        if (editorRef.current) { try { editorRef.current.destroyEditor(); } catch {} editorRef.current = null; }
        if (containerRef.current) containerRef.current.innerHTML = '<div id="onlyoffice-editor"></div>';
        config.width = '100%';
        config.height = '100%';
        editorRef.current = new (window as any).DocsAPI.DocEditor('onlyoffice-editor', config);
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) { setError(e.message || 'No se pudo abrir el simulador'); setLoading(false); }
      }
    };
    mount();
    return () => { cancelled = true; if (editorRef.current) { try { editorRef.current.destroyEditor(); } catch {} editorRef.current = null; } };
  }, [filePath, fileName]);

  return (
    <div className="space-y-2">
      {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm font-semibold"><AlertTriangle size={18} /> {error}</div>}
      {loading && !error && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="text-sm font-bold">Abriendo simulador…</p>
        </div>
      )}
      <div ref={containerRef} style={{ height: '70vh', display: loading || error ? 'none' : 'block' }} className="rounded-xl overflow-hidden border border-slate-200">
        <div id="onlyoffice-editor" />
      </div>
    </div>
  );
};
