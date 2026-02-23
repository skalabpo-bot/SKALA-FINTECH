
import React, { useState, useEffect } from 'react';
import { FPMEntry, ProductType, AdConfig, FinancialEntity } from '../types';
import { loadFPMData, addFPMEntry, deleteFPMEntry, getFPMsByEntity, importFactorsForEntity, updateEntityNameInFactors } from '../services/fpmService';
import { getAllAds, saveAd, deleteAd, uploadAdImage } from '../services/adService';
import { getAllEntities, saveEntity, deleteEntity, uploadLogo } from '../services/entityService';

export const AdminDashboard: React.FC = () => {
  // Data State
  const [adsData, setAdsData] = useState<AdConfig[]>([]);
  const [entitiesData, setEntitiesData] = useState<FinancialEntity[]>([]);
  
  // UI State
  const [activeView, setActiveView] = useState<'entities' | 'edit_entity' | 'ads'>('entities');
  const [isLoading, setIsLoading] = useState(false);
  
  // --- STATE: CURRENT EDITING ENTITY ---
  const [editingEntity, setEditingEntity] = useState<Partial<FinancialEntity>>({
    name: '',
    logoUrl: '',
    primaryColor: '#0ea5e9',
    secondaryColor: '#0369a1',
    cashFee: 15157,
    bankFee: 7614,
  });
  const [entityLogoFile, setEntityLogoFile] = useState<File | null>(null);
  const [originalEntityName, setOriginalEntityName] = useState<string | null>(null); // To track renames
  
  // Factors for the current editing entity
  const [currentEntityFactors, setCurrentEntityFactors] = useState<FPMEntry[]>([]);

  // --- STATE: MANUAL FACTOR ADDITION ---
  const [newFactor, setNewFactor] = useState({
    product: ProductType.ORO,
    term: '',
    rate: '',
    factor: '',
    discountPct: ''
  });

  // --- STATE: CSV UPLOAD ---
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // --- STATE: ADS ---
  const [editingAd, setEditingAd] = useState<Partial<AdConfig>>({
    slotId: 'top-leaderboard',
    type: 'image',
    active: true,
    content: '',
    startDate: '',
    endDate: ''
  });
  const [adImageFile, setAdImageFile] = useState<File | null>(null);
  const [isEditingAdId, setIsEditingAdId] = useState<string | undefined>(undefined);

  // --- CUSTOM MODAL STATE (Replaces window.confirm/alert) ---
  const [modalState, setModalState] = useState<{
    show: boolean;
    type: 'confirm' | 'alert';
    title: string;
    message: string;
    onConfirm?: () => Promise<void> | void;
  }>({ show: false, type: 'alert', title: '', message: '' });

  const showAlert = (message: string, title = 'Notificación') => {
      setModalState({ show: true, type: 'alert', title, message });
  };
  
  const requestConfirm = (title: string, message: string, onConfirm: () => Promise<void> | void) => {
      setModalState({ show: true, type: 'confirm', title, message, onConfirm });
  };

  const handleModalClose = () => {
      setModalState({ ...modalState, show: false });
  };

  const handleModalConfirm = async () => {
      if (modalState.type === 'confirm' && modalState.onConfirm) {
          await modalState.onConfirm();
      }
      handleModalClose();
  };

  const refreshGlobalData = async () => {
    setIsLoading(true);
    try {
      const [_, ads, ents] = await Promise.all([
        loadFPMData(), // Pre-fetch FPMs
        getAllAds(),
        getAllEntities()
      ]);
      setAdsData(ads);
      setEntitiesData(ents);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshGlobalData();
  }, []);

  // Refresh factors for the specific entity being edited
  const refreshEntityFactors = async (entityName: string) => {
    const factors = await getFPMsByEntity(entityName);
    setCurrentEntityFactors(factors);
  };

  // ==========================================
  // HANDLERS: ENTITY NAVIGATION
  // ==========================================
  const startCreateEntity = () => {
    setEditingEntity({ name: '', logoUrl: '', primaryColor: '#0ea5e9', secondaryColor: '#0369a1', cashFee: 15157, bankFee: 7614 });
    setEntityLogoFile(null);
    setOriginalEntityName(null);
    setCurrentEntityFactors([]);
    setActiveView('edit_entity');
  };

  const startEditEntity = async (ent: FinancialEntity) => {
    setEditingEntity({ ...ent });
    setEntityLogoFile(null);
    setOriginalEntityName(ent.name);
    setActiveView('edit_entity');
    await refreshEntityFactors(ent.name);
  };

  const handleSaveEntityBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntity.name) return showAlert("El nombre de la entidad es obligatorio.", "Validación");
    
    setIsLoading(true);
    try {
        let finalUrl = editingEntity.logoUrl;
        if (entityLogoFile) {
            finalUrl = await uploadLogo(entityLogoFile);
        }

        const entityId = (editingEntity as any).id;
        
        // Save Entity
        await saveEntity({ ...editingEntity as FinancialEntity, logoUrl: finalUrl }, entityId);

        // If name changed, update factors
        if (originalEntityName && originalEntityName !== editingEntity.name) {
            await updateEntityNameInFactors(originalEntityName, editingEntity.name!);
            setOriginalEntityName(editingEntity.name!);
        }
        
        await refreshGlobalData();
        showAlert("Información de marca guardada correctamente.", "Éxito");
    } catch (err: any) {
        if (err.message?.includes('row-level security')) {
            showAlert("ERROR DE PERMISOS SUPABASE (RLS):\nLa base de datos bloqueó la escritura.\n\nSolución:\nEjecute el script SQL de Políticas RLS en el Dashboard de Supabase.", "Error de Permisos");
        } else {
            showAlert("Error guardando entidad: " + (err.message || err), "Error");
        }
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteEntity = async (id: string) => {
      requestConfirm("Eliminar Entidad", "¿Está seguro? Esta acción eliminará la entidad y TODOS sus factores asociados permanentemente.", async () => {
        setIsLoading(true);
        try {
            await deleteEntity(id);
            await refreshGlobalData();
        } catch (err: any) {
            showAlert("Error eliminando: " + (err.message || "Revise permisos RLS"), "Error");
        } finally {
            setIsLoading(false);
        }
      });
  };

  // ==========================================
  // HANDLERS: FACTORS (INSIDE ENTITY)
  // ==========================================
  const handleAddFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntity.name) return showAlert("Debe guardar la entidad antes de agregar factores.", "Atención");
    
    setIsLoading(true);
    try {
        await addFPMEntry({
            entityName: editingEntity.name,
            product: newFactor.product,
            termMonths: Number(newFactor.term),
            rate: Number(newFactor.rate) || 0,
            factor: Number(newFactor.factor),
            discountPct: Number(newFactor.discountPct) || 0,
        });
        setNewFactor({ ...newFactor, term: '', factor: '', rate: '', discountPct: '' });
        await refreshEntityFactors(editingEntity.name);
    } catch (err: any) {
        if (err.message?.includes('row-level security')) {
            showAlert("Error de Permisos (RLS): No tiene autorización para escribir en la base de datos.", "Error");
        } else {
            showAlert("Error agregando factor: " + err.message, "Error");
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteFactor = async (id: string) => {
      setIsLoading(true);
      try {
        await deleteFPMEntry(id);
        if (editingEntity.name) await refreshEntityFactors(editingEntity.name);
      } catch (err) {
        showAlert("Error eliminando factor. Revise la consola para más detalles.", "Error");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
  };

  const handleCsvUpload = async () => {
      if (!csvFile || !editingEntity.name) return;
      
      const reader = new FileReader();
      reader.onload = async (e) => {
          const text = e.target?.result as string;
          if (!text) return;
          
          try {
              // Normalize line endings to avoid issues with Windows/Mac
              const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
              const lines = normalizedText.split('\n');
              const newFactors: any[] = [];
              
              // Detect separator (semicolon for LatAm/Excel, comma for standard)
              const firstLine = lines.find(l => l.trim().length > 0);
              const separator = firstLine && firstLine.includes(';') ? ';' : ',';
              const isLatAmFormat = separator === ';';

              for (let i = 1; i < lines.length; i++) {
                  const line = lines[i].trim();
                  if (!line) continue;
                  
                  // Split by detected separator
                  const cols = line.split(separator).map(c => c.trim());
                  
                  // Columnas esperadas: Producto; Plazo; Tasa; Factor; Descuento(%)
                  let pStr: string, tStr: string, rStr: string, fStr: string, dStr: string = '';
                  if (cols.length >= 6) {
                      // Con columna extra al inicio (id/entidad): ignorar col[0]
                      pStr = cols[1]; tStr = cols[2]; rStr = cols[3]; fStr = cols[4]; dStr = cols[5] || '';
                  } else if (cols.length === 5) {
                      // Estándar con descuento: Producto, Plazo, Tasa, Factor, Descuento
                      pStr = cols[0]; tStr = cols[1]; rStr = cols[2]; fStr = cols[3]; dStr = cols[4] || '';
                  } else if (cols.length === 4) {
                      // Sin columna descuento (compatibilidad hacia atrás)
                      pStr = cols[0]; tStr = cols[1]; rStr = cols[2]; fStr = cols[3];
                  } else {
                      continue;
                  }

                  // Robust Number Parser for Colombia (1.234,56) vs US (1,234.56)
                  const parseNum = (val: string) => {
                      if (!val) return 0;
                      let clean = val.replace(/[$\s]/g, ''); // Remove symbols
                      
                      if (isLatAmFormat) {
                          // LATAM: Dots are thousands separators -> REMOVE THEM
                          // Commas are decimals -> REPLACE WITH DOT
                          clean = clean.replace(/\./g, ''); 
                          clean = clean.replace(',', '.');
                      } else {
                          // US: Commas are thousands separators -> REMOVE THEM
                          clean = clean.replace(/,/g, '');
                      }
                      
                      const result = parseFloat(clean);
                      return isNaN(result) ? 0 : result;
                  };

                  let productEnum = ProductType.LIBRE_INVERSION;
                  const lowerProd = pStr ? pStr.toLowerCase() : '';
                  if (lowerProd.includes('oro')) productEnum = ProductType.ORO;
                  else if (lowerProd.includes('platino')) productEnum = ProductType.PLATINO;
                  else if (lowerProd.includes('zafiro')) productEnum = ProductType.ZAFIRO;
                  else if (lowerProd.includes('cartera')) productEnum = ProductType.COMPRA_CARTERA;

                  const termVal = parseNum(tStr);
                  const rateVal = parseNum(rStr);
                  const factorVal = parseNum(fStr);
                  const discountVal = parseNum(dStr);

                  // Validations to prevent bad data
                  if (factorVal <= 0 || termVal <= 0) continue;

                  newFactors.push({
                      product: productEnum,
                      termMonths: termVal,
                      rate: rateVal,
                      factor: factorVal,
                      discountPct: discountVal,
                  });
              }

              if (newFactors.length === 0) {
                  return showAlert(`No se encontraron datos válidos. \nVerifique el formato:\nSeparador: ${separator}\nColumnas esperadas: Producto, Plazo, Tasa, Factor`, "Error de Formato");
              }

              // USE CUSTOM CONFIRMATION INSTEAD OF NATIVE CONFIRM
              requestConfirm(
                "Confirmar Importación Masiva", 
                `Se reemplazarán TODOS los factores de ${editingEntity.name} con ${newFactors.length} registros encontrados en el CSV. ¿Desea continuar?`,
                async () => {
                    setIsLoading(true);
                    try {
                        const insertedCount = await importFactorsForEntity(editingEntity.name!, newFactors);
                        await refreshEntityFactors(editingEntity.name!);
                        setCsvFile(null);
                        showAlert(`¡Éxito! Se importaron ${insertedCount} factores correctamente.`, "Importación Completada");
                    } catch (err: any) {
                        console.error("Error Import:", err);
                        if (err.message?.includes('row-level security') || err.code === '42501') {
                            showAlert("ERROR CRÍTICO DE PERMISOS (RLS):\n\nLa base de datos rechazó la carga masiva.\nDebe configurar las Políticas RLS en Supabase para permitir 'INSERT' a usuarios autenticados.", "Error de Permisos");
                        } else {
                            showAlert("Error en la base de datos: " + (err.message || err), "Error");
                        }
                    } finally {
                        setIsLoading(false);
                    }
                }
              );

          } catch (err) {
              showAlert("Error procesando CSV: " + err, "Excepción");
              console.error(err);
          }
      };
      reader.readAsText(csvFile);
  };

  // ==========================================
  // HANDLERS: ADS
  // ==========================================
  const getAdDimensions = (slot: string) => {
    switch(slot) {
      case 'top-leaderboard': return 'Horizontal: 728 x 90 px';
      case 'upload-mid-rectangle': return 'Rectangular: 468 x 60 px';
      case 'config-footer': return 'Rectangular: 320 x 100 px';
      case 'results-top-banner': return 'Horizontal Largo: 970 x 90 px';
      case 'results-footer': return 'Cuadrado: 300 x 250 px';
      case 'popup-startup': return 'Vertical/Cuadrado: 400 x 500 px';
      default: return 'Flexible';
    }
  };

  const handleAdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAd.name) return showAlert("El nombre del anuncio es obligatorio.", "Validación");
    
    setIsLoading(true);
    try {
        let finalContent = editingAd.content;
        
        // Handle File Upload for Images
        if (editingAd.type === 'image' && adImageFile) {
            finalContent = await uploadAdImage(adImageFile);
        }

        if (editingAd.type === 'image' && !finalContent) {
            return showAlert("Debe subir una imagen o proveer una URL para el anuncio.", "Validación");
        }

        await saveAd({
            ...editingAd as AdConfig,
            content: finalContent
        }, isEditingAdId);

        setEditingAd({ slotId: 'top-leaderboard', type: 'image', active: true, content: '', name: '', linkUrl: '', startDate: '', endDate: '' });
        setAdImageFile(null);
        setIsEditingAdId(undefined);
        await refreshGlobalData();
        showAlert("Campaña guardada correctamente.", "Éxito");
    } catch(e: any) {
        if (e.message?.includes('row-level security')) {
            showAlert("Error RLS: Permisos insuficientes para guardar anuncios.", "Error");
        } else {
            showAlert("Error guardando anuncio: " + e.message, "Error");
        }
    } finally {
        setIsLoading(false);
    }
  };

  const startEditAd = (ad: AdConfig) => {
      setEditingAd(ad);
      setAdImageFile(null);
      setIsEditingAdId(ad.id);
  };
  
  const handleDeleteAd = async (id: string) => {
      requestConfirm("Eliminar Anuncio", "¿Está seguro de eliminar este anuncio permanentemente?", async () => {
         setIsLoading(true); 
         await deleteAd(id); 
         await refreshGlobalData(); 
         setIsLoading(false); 
      });
  }

  // --- STYLES HELPER ---
  const inputContainerClass = "group space-y-2";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 group-focus-within:text-primary-600 transition-colors";
  const inputClass = "block w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all font-medium shadow-sm";
  const fileInputClass = "block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-all border border-slate-200 rounded-xl bg-slate-50 p-2 cursor-pointer";

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="space-y-6 font-sans relative">
      {isLoading && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-[100] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Main Navigation Bar */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex justify-between items-center">
          <div>
              <h2 className="text-2xl font-bold tracking-tight">Administración</h2>
              <p className="text-slate-400 text-xs">Gestión de Entidades, Productos y Campañas</p>
          </div>
          <div className="flex bg-slate-800 p-1 rounded-lg">
              <button 
                onClick={() => setActiveView('entities')} 
                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeView === 'entities' || activeView === 'edit_entity' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                  Entidades & Productos
              </button>
              <button 
                onClick={() => setActiveView('ads')} 
                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeView === 'ads' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                  Publicidad
              </button>
          </div>
      </div>

      {/* VIEW: ENTITIES LIST */}
      {activeView === 'entities' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in-up">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-lg text-slate-800">Entidades Financieras</h3>
                  <button onClick={startCreateEntity} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 shadow-md transition-all hover:-translate-y-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      Nueva Entidad
                  </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                  {entitiesData.map(ent => (
                      <div key={ent.id} className="border border-slate-200 rounded-2xl p-6 hover:shadow-xl transition-all group relative bg-white flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center p-2 border border-slate-100 shadow-sm">
                                    {ent.logoUrl ? <img src={ent.logoUrl} className="w-full h-full object-contain" /> : <span className="font-bold text-slate-300 text-xl">{ent.name[0]}</span>}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => startEditEntity(ent)} className="text-primary-600 hover:bg-primary-50 p-2 rounded-full transition-colors" title="Editar">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                                    </button>
                                    <button onClick={() => handleDeleteEntity(ent.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-full transition-colors" title="Eliminar">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                    </button>
                                </div>
                            </div>
                            <h4 className="font-bold text-slate-800 text-lg mb-1">{ent.name}</h4>
                            <div className="w-full h-2 rounded-full mb-3 shadow-inner" style={{background: `linear-gradient(to right, ${ent.primaryColor}, ${ent.secondaryColor})`}}></div>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-lg text-center mt-2">
                             <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Configurar Productos</p>
                          </div>
                      </div>
                  ))}
                  {entitiesData.length === 0 && (
                      <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                          No hay entidades configuradas.
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* VIEW: EDIT ENTITY DETAILS (BRANDING + FACTORS) */}
      {activeView === 'edit_entity' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in">
              
              {/* LEFT: Branding Form */}
              <div className="xl:col-span-1 space-y-6">
                  <button onClick={() => setActiveView('entities')} className="flex items-center text-slate-500 hover:text-slate-800 font-bold text-sm mb-2 group">
                      <span className="group-hover:-translate-x-1 transition-transform inline-block mr-1">←</span> Volver al listado
                  </button>

                  <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                      <h3 className="font-bold text-lg text-slate-800 mb-6 border-b border-slate-100 pb-4">Identidad Visual</h3>
                      <form onSubmit={handleSaveEntityBranding} className="space-y-6">
                          <div className={inputContainerClass}>
                            <label className={labelClass}>Nombre Entidad</label>
                            <input className={inputClass} value={editingEntity.name} onChange={e => setEditingEntity({...editingEntity, name: e.target.value})} placeholder="Ej: Banco Unión" />
                          </div>
                          
                          <div className={inputContainerClass}>
                             <label className={labelClass}>Logo Corporativo</label>
                             <div className="flex flex-col gap-3">
                               {editingEntity.logoUrl && (
                                   <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-center">
                                       <img src={editingEntity.logoUrl} className="h-12 object-contain" />
                                   </div>
                               )}
                               <input type="file" accept="image/*" className={fileInputClass} onChange={e => setEntityLogoFile(e.target.files?.[0] || null)} />
                             </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div className={inputContainerClass}>
                                  <label className={labelClass}>Color Primario</label>
                                  <div className="flex items-center gap-2 border border-slate-200 p-2 rounded-xl bg-slate-50">
                                     <input type="color" className="h-8 w-8 rounded-lg cursor-pointer border-0 p-0" value={editingEntity.primaryColor} onChange={e => setEditingEntity({...editingEntity, primaryColor: e.target.value})} />
                                     <span className="text-xs font-mono text-slate-500">{editingEntity.primaryColor}</span>
                                  </div>
                              </div>
                              <div className={inputContainerClass}>
                                  <label className={labelClass}>Color Secundario</label>
                                  <div className="flex items-center gap-2 border border-slate-200 p-2 rounded-xl bg-slate-50">
                                     <input type="color" className="h-8 w-8 rounded-lg cursor-pointer border-0 p-0" value={editingEntity.secondaryColor} onChange={e => setEditingEntity({...editingEntity, secondaryColor: e.target.value})} />
                                     <span className="text-xs font-mono text-slate-500">{editingEntity.secondaryColor}</span>
                                  </div>
                              </div>
                          </div>
                          
                          {/* Costos de Desembolso */}
                          <div className="pt-2 border-t border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Gastos de Desembolso</p>
                            <div className="grid grid-cols-2 gap-4">
                              <div className={inputContainerClass}>
                                <label className={labelClass}>Retiro Efectivo ($)</label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 font-bold text-sm">$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    className={`${inputClass} pl-7`}
                                    value={editingEntity.cashFee ?? 15157}
                                    onChange={e => setEditingEntity({...editingEntity, cashFee: Number(e.target.value)})}
                                    placeholder="15157"
                                  />
                                </div>
                              </div>
                              <div className={inputContainerClass}>
                                <label className={labelClass}>Retiro Bancario ($)</label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 font-bold text-sm">$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    className={`${inputClass} pl-7`}
                                    value={editingEntity.bankFee ?? 7614}
                                    onChange={e => setEditingEntity({...editingEntity, bankFee: Number(e.target.value)})}
                                    placeholder="7614"
                                  />
                                </div>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1.5">Costos que se descuentan al calcular el monto a desembolsar</p>
                          </div>

                          <div className="pt-2">
                             <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg transition-all hover:-translate-y-0.5">Guardar Marca</button>
                          </div>
                      </form>
                  </div>

                  <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
                      <h4 className="text-indigo-900 font-bold mb-2 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                        Carga Masiva (CSV)
                      </h4>
                      <p className="text-xs text-indigo-700 mb-4 leading-relaxed">
                          Sube un archivo CSV para actualizar todos los factores.
                          <br/>Columnas: <code className="bg-white px-1 py-0.5 rounded border border-indigo-200 font-bold">Producto; Plazo; Tasa; Factor; Descuento</code>
                      </p>
                      <input type="file" accept=".csv" className={fileInputClass} onChange={e => setCsvFile(e.target.files?.[0] || null)} />
                      <button onClick={handleCsvUpload} disabled={!csvFile || !editingEntity.name} className="w-full mt-3 bg-indigo-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 shadow-md transition-all">
                          Importar Base
                      </button>
                  </div>
              </div>

              {/* RIGHT: Factors Management */}
              <div className="xl:col-span-2">
                  <div className="bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col h-full overflow-hidden">
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                          <div>
                              <h3 className="font-bold text-lg text-slate-800">Base de Productos y Factores</h3>
                              <p className="text-xs text-slate-500 mt-0.5">
                                  Gestionando: <span className="font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">{editingEntity.name || 'Nueva Entidad'}</span>
                              </p>
                          </div>
                          <div className="text-right bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                              <span className="text-2xl font-bold text-slate-800">{currentEntityFactors.length}</span>
                              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Registros</span>
                          </div>
                          <button onClick={() => refreshEntityFactors(editingEntity.name!)} className="ml-2 p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Recargar tabla">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                          </button>
                      </div>

                      {/* Add Manual Form */}
                      <div className="p-5 bg-white border-b border-slate-100">
                          <form onSubmit={handleAddFactor} className="flex flex-col md:flex-row gap-4 items-end">
                              <div className="flex-1 w-full md:w-auto space-y-2">
                                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wide ml-1">Producto</label>
                                  <div className="relative">
                                      <select className="block w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" value={newFactor.product} onChange={e => setNewFactor({...newFactor, product: e.target.value as any})}>
                                          {Object.values(ProductType).map(p => <option key={p} value={p}>{p}</option>)}
                                      </select>
                                  </div>
                              </div>
                              <div className="w-full md:w-28 space-y-2">
                                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wide ml-1">Plazo</label>
                                  <input type="number" className="block w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" placeholder="Meses" value={newFactor.term} onChange={e => setNewFactor({...newFactor, term: e.target.value})} required />
                              </div>
                              <div className="w-full md:w-28 space-y-2">
                                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wide ml-1">Tasa %</label>
                                  <input type="number" className="block w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" placeholder="1.5" value={newFactor.rate} onChange={e => setNewFactor({...newFactor, rate: e.target.value})} />
                              </div>
                              <div className="w-full md:w-40 space-y-2">
                                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wide ml-1">Factor</label>
                                  <input type="number" step="0.01" className="block w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono" placeholder="0.00" value={newFactor.factor} onChange={e => setNewFactor({...newFactor, factor: e.target.value})} required />
                              </div>
                              <div className="w-full md:w-28 space-y-2">
                                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wide ml-1">Descuento %</label>
                                  <input type="number" step="0.01" min="0" max="100" className="block w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" placeholder="17" value={newFactor.discountPct} onChange={e => setNewFactor({...newFactor, discountPct: e.target.value})} />
                              </div>
                              <button type="submit" disabled={!editingEntity.name} className="w-full md:w-auto bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 disabled:opacity-50 shadow-md transition-all">
                                  + Agregar
                              </button>
                          </form>
                      </div>

                      {/* List */}
                      <div className="flex-1 overflow-auto max-h-[600px] p-0 bg-slate-50/30">
                          <table className="w-full text-sm text-left">
                              <thead className="text-xs text-slate-400 uppercase bg-slate-50 sticky top-0 z-10 font-bold border-b border-slate-100">
                                  <tr>
                                      <th className="px-6 py-4">Producto</th>
                                      <th className="px-6 py-4">Plazo</th>
                                      <th className="px-6 py-4">Tasa</th>
                                      <th className="px-6 py-4">Factor</th>
                                      <th className="px-6 py-4">Descuento %</th>
                                      <th className="px-6 py-4 text-right">Acción</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                  {currentEntityFactors.map(f => (
                                      <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-6 py-4 font-bold text-slate-800">{f.product}</td>
                                          <td className="px-6 py-4 font-medium text-slate-600">{f.termMonths} Meses</td>
                                          <td className="px-6 py-4 text-slate-500 bg-slate-50/50">{f.rate}%</td>
                                          <td className="px-6 py-4 font-mono font-bold text-primary-600 bg-primary-50/10">{f.factor}</td>
                                          <td className="px-6 py-4 font-bold text-amber-700 bg-amber-50/30">{f.discountPct ?? 0}%</td>
                                          <td className="px-6 py-4 text-right">
                                              <button onClick={() => handleDeleteFactor(f.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors">
                                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                                  {currentEntityFactors.length === 0 && (
                                      <tr><td colSpan={6} className="text-center py-12 text-slate-400 italic">No hay factores configurados para esta entidad.</td></tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* VIEW: ADS MANAGEMENT */}
      {activeView === 'ads' && (
           <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in">
                <div className="xl:col-span-1 bg-white p-6 rounded-2xl shadow-lg border border-amber-100">
                    <h3 className="font-bold text-lg mb-6 text-amber-900 flex items-center gap-2 border-b border-amber-50 pb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.43.816 1.035.816 1.73 0 .695-.32 1.3-.816 1.73m0-3.46a24.347 24.347 0 010 3.46" /></svg>
                        Configurar Anuncio
                    </h3>
                    <form onSubmit={handleAdSubmit} className="space-y-6">
                        <div className={inputContainerClass}>
                            <label className={labelClass}>Nombre Campaña</label>
                            <input className={inputClass} placeholder="Ej: Promo Navidad" value={editingAd.name} onChange={e => setEditingAd({...editingAd, name: e.target.value})} required />
                        </div>
                        
                        <div className={inputContainerClass}>
                           <label className={labelClass}>Ubicación (Slot)</label>
                           <select className={inputClass} value={editingAd.slotId} onChange={e => setEditingAd({...editingAd, slotId: e.target.value})}>
                                <option value="top-leaderboard">Banner Superior (Principal)</option>
                                <option value="upload-mid-rectangle">Rectángulo (Carga)</option>
                                <option value="config-footer">Footer (Configuración)</option>
                                <option value="results-top-banner">Resultados (Superior)</option>
                                <option value="results-footer">Resultados (Inferior)</option>
                                <option value="popup-startup">Popup (Inicio)</option>
                           </select>
                           <p className="text-[10px] text-amber-700 font-bold bg-amber-50 p-2 rounded-lg border border-amber-100">
                               Recomendado: {getAdDimensions(editingAd.slotId || '')}
                           </p>
                        </div>

                        <div className="flex gap-4">
                             <div className={`flex-1 ${inputContainerClass}`}>
                                 <label className={labelClass}>Inicio</label>
                                 <input type="date" className={inputClass} value={editingAd.startDate || ''} onChange={e => setEditingAd({...editingAd, startDate: e.target.value})} />
                             </div>
                             <div className={`flex-1 ${inputContainerClass}`}>
                                 <label className={labelClass}>Fin</label>
                                 <input type="date" className={inputClass} value={editingAd.endDate || ''} onChange={e => setEditingAd({...editingAd, endDate: e.target.value})} />
                             </div>
                        </div>

                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                             <input type="checkbox" checked={editingAd.active} onChange={e => setEditingAd({...editingAd, active: e.target.checked})} className="h-5 w-5 text-primary-600 rounded focus:ring-primary-500 border-slate-300" />
                             <label className="text-sm font-bold text-slate-700">Campaña Activa</label>
                        </div>

                        <div className={inputContainerClass}>
                           <label className={labelClass}>Tipo Contenido</label>
                           <select className={inputClass} value={editingAd.type} onChange={e => setEditingAd({...editingAd, type: e.target.value as any})}><option value="image">Imagen</option><option value="html">HTML</option></select>
                        </div>
                        
                        {/* IMAGE UPLOAD UI */}
                        {editingAd.type === 'image' && (
                            <div className="space-y-2 border border-slate-200 p-4 rounded-xl bg-slate-50/50">
                                <label className={labelClass}>Subir Imagen</label>
                                <input type="file" accept="image/*" className={fileInputClass} onChange={e => setAdImageFile(e.target.files?.[0] || null)} />
                                {editingAd.content && !adImageFile && (
                                    <div className="text-xs text-green-600 font-bold truncate mt-2 flex items-center gap-1 bg-green-50 p-2 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                        Imagen Actual Configurada
                                        <a href={editingAd.content} target="_blank" className="underline ml-auto text-green-700">Ver</a>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className={inputContainerClass}>
                             <label className={labelClass}>{editingAd.type === 'image' ? 'URL Imagen (Opcional si sube archivo)' : 'Código HTML'}</label>
                             <textarea 
                                className="block w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all font-mono text-xs h-20 shadow-sm" 
                                placeholder={editingAd.type === 'image' ? "https://..." : "<iframe>...</iframe>"} 
                                value={editingAd.content} 
                                onChange={e => setEditingAd({...editingAd, content: e.target.value})} 
                             />
                        </div>

                        {editingAd.type === 'image' && (
                            <div className={inputContainerClass}>
                                <label className={labelClass}>Link Destino</label>
                                <input className={inputClass} placeholder="Link al dar clic" value={editingAd.linkUrl} onChange={e => setEditingAd({...editingAd, linkUrl: e.target.value})} />
                            </div>
                        )}

                        <div className="pt-2">
                             <button className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold hover:bg-amber-700 shadow-lg transition-all hover:-translate-y-0.5">Guardar Anuncio</button>
                        </div>
                    </form>
                </div>
                <div className="xl:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700">Listado de Anuncios</div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-xs uppercase text-slate-400 font-bold border-b border-slate-100">
                                <tr><th className="p-4">Nombre</th><th className="p-4">Slot</th><th className="p-4">Estado</th><th className="p-4 text-right">Acción</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {adsData.map(a => (
                                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-bold text-slate-800">
                                            {a.name}
                                            {a.type === 'image' && <img src={a.content} className="h-8 w-auto mt-2 rounded-lg border border-slate-200 bg-slate-100 object-cover" />}
                                        </td>
                                        <td className="p-4 text-xs font-mono text-slate-500 bg-slate-50/50">{a.slotId}</td>
                                        <td className="p-4">{a.active ? <span className="text-green-700 font-bold text-[10px] uppercase bg-green-100 px-2 py-1 rounded-full border border-green-200">ACTIVO</span> : <span className="text-slate-400 font-bold text-[10px] uppercase bg-slate-100 px-2 py-1 rounded-full">INACTIVO</span>}</td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => startEditAd(a)} className="text-blue-500 font-bold text-xs hover:bg-blue-50 px-3 py-1.5 rounded-lg mr-2 transition-colors">Editar</button>
                                            <button onClick={() => handleDeleteAd(a.id)} className="text-red-500 font-bold text-xs hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
           </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL - REPLACES NATIVE CONFIRM() TO FIX SANDBOX ERRORS */}
      {modalState.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={handleModalClose}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-up border border-slate-100">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto ${modalState.type === 'confirm' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                    {modalState.type === 'confirm' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                    )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 text-center mb-2">{modalState.title}</h3>
                <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed whitespace-pre-line">
                    {modalState.message}
                </p>
                <div className="flex gap-3">
                    {modalState.type === 'confirm' && (
                        <button onClick={handleModalClose} className="flex-1 py-2.5 px-4 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors border border-transparent">Cancelar</button>
                    )}
                    <button onClick={handleModalConfirm} className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-white transition-colors shadow-lg ${modalState.type === 'confirm' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-primary-600 hover:bg-primary-700'}`}>
                        {modalState.type === 'confirm' ? 'Confirmar' : 'Entendido'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
