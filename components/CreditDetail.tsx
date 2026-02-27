
import React, { useState, useEffect, useRef } from 'react';
import { Credit, User, CreditState, UserRole } from '../types';
import { MockService } from '../services/mockService';
import {
    Send, Paperclip, Check, X, Building, MessageSquare, FileText, Download, Pencil, Save,
    RotateCcw, History, User as UserIcon, MapPin, Briefcase, DollarSign, CreditCard, Loader2, ShieldCheck, Trash, Users, Unlock, Lock, ClipboardList, Plus, CheckCircle2, FolderLock, Upload
} from 'lucide-react';

export const CreditDetail: React.FC<{ creditId: string, currentUser: User, onBack: () => void }> = ({ creditId, currentUser, onBack }) => {
  const [credit, setCredit] = useState<Credit | undefined>(undefined);
  const [states, setStates] = useState<CreditState[]>([]);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'DOCUMENTS' | 'HISTORY' | 'CHAT' | 'LEGAL_DOCS'>('DETAILS');
  const [legalDocs, setLegalDocs] = useState<any[]>([]);
  const [legalDocsLoading, setLegalDocsLoading] = useState(false);
  const [uploadingLegal, setUploadingLegal] = useState(false);
  const [legalDocType, setLegalDocType] = useState('Pagaré');
  const [deletingLegalId, setDeletingLegalId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [sendingComment, setSendingComment] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [entities, setEntities] = useState<any[]>([]);
  const [pagadurias, setPagadurias] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [banks, setBanks] = useState<string[]>([]);
  const [analysts, setAnalysts] = useState<{ id: string; name: string }[]>([]);
  const [showAnalystModal, setShowAnalystModal] = useState(false);
  const [selectedAnalystId, setSelectedAnalystId] = useState('');
  const [creditLines, setCreditLines] = useState<string[]>(['LIBRE INVERSION', 'COMPRA DE CARTERA', 'RETANQUEO', 'LIBRE + SANEAMIENTO', 'COMPRA + SANEAMIENTO']);

  // Estado del modal de devolución con tareas
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [devolucionComment, setDevolucionComment] = useState('');
  const [devolucionTasks, setDevolucionTasks] = useState<Array<{ id: string; title: string; requiresDoc: boolean }>>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskRequiresDoc, setNewTaskRequiresDoc] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  // Textos de respuesta para tareas de texto (key = task.id)
  const [taskTexts, setTaskTexts] = useState<Record<string, string>>({});

  // Acciones rápidas por estado
  const [stateActions, setStateActions] = useState<any[]>([]);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  // Read receipts
  const [creditReads, setCreditReads] = useState<{ userId: string; userName: string; lastReadAt: Date }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshData();
    // Marcar como leído y cargar lecturas de otros usuarios
    MockService.markCreditAsRead(creditId, currentUser.id, currentUser.name);
    MockService.getCreditReadsByCredit(creditId).then((reads: { userId: string; userName: string; lastReadAt: Date }[]) => setCreditReads(reads));

    const loadExtras = async () => {
      const [ent, pag, cit, bnk, st, analystList, lines] = await Promise.all([MockService.getEntities(), MockService.getPagadurias(), MockService.getCities(), MockService.getBanks(), MockService.getStates(), MockService.getAnalysts ? MockService.getAnalysts() : Promise.resolve([]), MockService.getCreditLines()]);
      setEntities(ent);
      setPagadurias(pag);
      setCities(cit);
      setBanks(bnk);
      setStates(st);
      setAnalysts(analystList);
      if (lines && lines.length > 0) setCreditLines(lines);
    };
    loadExtras();
  }, [creditId]);

  // Cargar acciones del estado actual cuando cambia el crédito/estado
  useEffect(() => {
    if (credit?.statusId) {
      MockService.getStateActions?.(credit.statusId).then((actions: any[]) => {
        // Filtrar por rol si la acción tiene restricción
        const filtered = actions.filter((a: any) =>
          !a.roles || a.roles.length === 0 || a.roles.includes(currentUser.role)
        );
        setStateActions(filtered);
      }).catch(() => setStateActions([]));
    }
  }, [credit?.statusId]);

  useEffect(() => {
    if (activeTab === 'CHAT') {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    if (activeTab === 'LEGAL_DOCS' && credit) {
        setLegalDocsLoading(true);
        (MockService as any).getLegalDocuments(credit.id)
            .then((docs: any[]) => setLegalDocs(docs))
            .catch(() => setLegalDocs([]))
            .finally(() => setLegalDocsLoading(false));
    }
  }, [activeTab, credit?.comments, credit?.id]);

  const refreshData = async () => {
    setLoading(true);
    try {
        const c = await MockService.getCreditById(creditId);
        if(c) {
            setCredit(c);
            setEditFormData({ ...c });
            // Actualizar los estados por si cambiaron
            setStates(await MockService.getStates());
        }
    } catch (err) {
        console.error("Error refreshing credit data:", err);
    } finally {
        setLoading(false);
    }
  };

  const handleUpdateCredit = async () => {
      try {
          const dataToSave = { ...editFormData };
          // Si el gestor guardó en modo subsanación, quitar el permiso automáticamente
          const currentStateName = states.find(s => s.id === credit?.statusId)?.name?.toUpperCase() ?? '';
          const isGestorSubsanacion = currentUser.role === 'GESTOR' && (currentStateName.includes('DEVUELTO') || currentStateName.includes('APLAZADO')) && !!credit?.subsanacionHabilitada;
          if (isGestorSubsanacion) dataToSave.subsanacionHabilitada = false;
          await MockService.updateCreditData(credit!.id, dataToSave, currentUser.id);
          setIsEditing(false);
          await refreshData();
          window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: "Expediente actualizado correctamente", type: 'success' } }));
      } catch (err) {
          alert("Error al actualizar");
      }
  };

  const handleToggleSubsanacion = async () => {
      if (!credit) return;
      const enabling = !credit.subsanacionHabilitada;
      try {
          await MockService.toggleSubsanacion(credit.id, enabling, currentUser);
          await refreshData();
          const msg = enabling ? 'Edición habilitada para el Gestor (una sola vez)' : 'Edición del gestor revocada';
          window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: msg, type: 'success' } }));
          if (enabling) setActiveTab('HISTORY'); // Mostrar trazabilidad al habilitar
      } catch (err) {
          window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: 'Error al cambiar permisos de edición', type: 'error' } }));
      }
  };

  const confirmStatusChange = async () => {
      if(pendingStatus && statusComment.trim()) {
          try {
              console.log("🔄 Actualizando estado de", credit!.id, "a", pendingStatus);
              await MockService.updateCreditStatus(credit!.id, pendingStatus, currentUser, statusComment);
              console.log("✅ Estado actualizado en BD");

              setShowStatusModal(false);
              setStatusComment('');
              setPendingStatus('');

              // Forzar recarga completa del crédito DESPUÉS de cerrar el modal
              setTimeout(async () => {
                  const updatedCredit = await MockService.getCreditById(credit!.id);
                  console.log("🔃 Crédito recargado:", updatedCredit?.statusId);
                  if (updatedCredit) {
                      setCredit(updatedCredit);
                      setEditFormData({ ...updatedCredit });
                  }
                  setActiveTab('HISTORY'); // Mover a historial para ver el cambio
              }, 300);

              window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: "Estado actualizado correctamente", type: 'success' } }));
          } catch (err) {
              console.error("❌ Error updating status:", err);
              window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: "Error al cambiar el estado", type: 'error' } }));
          }
      }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sendingComment) return;
    if (!commentText.trim() && !attachedFile) return;
    setSendingComment(true);
    try {
        await MockService.addComment(credit!.id, commentText, currentUser, attachedFile || undefined);
        setCommentText(''); setAttachedFile(null);
        await refreshData();
        // Actualizar lecturas y marcar propio mensaje como leído
        MockService.markCreditAsRead(creditId, currentUser.id, currentUser.name);
        MockService.getCreditReadsByCredit(creditId).then((reads: { userId: string; userName: string; lastReadAt: Date }[]) => setCreditReads(reads));
        if (attachedFile) {
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: "Documento subido correctamente", type: 'success' } }));
        }
    } catch (err) {
        console.error("Error sending comment:", err);
        window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: "Error al enviar mensaje", type: 'error' } }));
    } finally {
        setSendingComment(false);
    }
  };

  const addDevolucionTask = () => {
      if (!newTaskTitle.trim()) return;
      setDevolucionTasks(prev => [...prev, { id: Math.random().toString(36).substring(2, 11), title: newTaskTitle.trim(), requiresDoc: newTaskRequiresDoc }]);
      setNewTaskTitle('');
      setNewTaskRequiresDoc(false);
  };

  const confirmDevolucion = async () => {
      if (!pendingStatus || !devolucionComment.trim()) return;
      try {
          const tasks = devolucionTasks.map(t => ({ ...t, completed: false }));
          await MockService.updateCreditStatus(credit!.id, pendingStatus, currentUser, devolucionComment, tasks);
          setShowDevolucionModal(false);
          setDevolucionComment('');
          setDevolucionTasks([]);
          setNewTaskTitle('');
          setPendingStatus('');
          setTimeout(async () => {
              const updatedCredit = await MockService.getCreditById(credit!.id);
              if (updatedCredit) { setCredit(updatedCredit); setEditFormData({ ...updatedCredit }); }
              setActiveTab('HISTORY');
          }, 300);
          window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: `Crédito devuelto con ${tasks.length} tarea(s) asignada(s)`, type: 'success' } }));
      } catch (err) {
          window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: 'Error al devolver el crédito', type: 'error' } }));
      }
  };

  const handleCompleteTask = async (taskId: string, file?: File, text?: string) => {
      if (completingTaskId) return;
      setCompletingTaskId(taskId);
      try {
          let docUrl: string | undefined;
          let docName: string | undefined;
          if (file) {
              docUrl = await MockService.uploadImage(file);
              docName = file.name;
          }
          await MockService.completeDevolucionTask(credit!.id, taskId, currentUser, docUrl, docName, text);
          // Limpiar el texto de esta tarea
          setTaskTexts(prev => { const next = { ...prev }; delete next[taskId]; return next; });
          await refreshData();
          window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: 'Tarea completada correctamente', type: 'success' } }));
      } catch (err) {
          window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: 'Error al completar la tarea', type: 'error' } }));
      } finally {
          setCompletingTaskId(null);
      }
  };

  const handleAssignAnalyst = async () => {
      if (!selectedAnalystId) return;
      try {
          await MockService.assignAnalyst(credit!.id, selectedAnalystId, currentUser);
          setShowAnalystModal(false);
          setSelectedAnalystId('');
          await refreshData();
          window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: "Analista asignado correctamente", type: 'success' } }));
      } catch (err) {
          window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: "Error al asignar analista", type: 'error' } }));
      }
  };

  if (loading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin text-primary" size={48}/></div>;
  if (!credit) return <div className="p-10 text-center font-bold text-slate-400">Crédito no encontrado.</div>;

  const canEdit = MockService.hasPermission(currentUser, 'EDIT_CREDIT_INFO');
  // Recalcular el estado actual en cada render para que se actualice inmediatamente
  const currentStateObj = states.find(s => s.id === credit.statusId);
  const isDevuelto = currentStateObj?.name?.toUpperCase().includes('DEVUELTO') ?? false;
  const isAplazado = currentStateObj?.name?.toUpperCase().includes('APLAZADO') ?? false;
  const isEditableState = isDevuelto || isAplazado;
  const canEditAsGestor = currentUser.role === 'GESTOR' && isEditableState && !!credit.subsanacionHabilitada;
  const effectiveCanEdit = canEdit || canEditAsGestor;

  // Tareas de la devolución actual
  const devolucionTasksList: any[] = (credit as any).devolucionTasks || [];
  const allTasksDone = devolucionTasksList.length === 0 || devolucionTasksList.every((t: any) => t.completed);
  const pendingTasksCount = devolucionTasksList.filter((t: any) => !t.completed).length;

  return (
    <div className="flex flex-col gap-4 lg:gap-8 animate-fade-in pb-12">
      {/* HEADER PREMIUM */}
      <div className="bg-white p-5 md:p-8 lg:p-10 rounded-2xl lg:rounded-[3rem] shadow-[0_15px_40px_rgba(0,0,0,0.03)] border border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 lg:gap-8">
        <div className="w-full md:w-auto">
           <button onClick={onBack} className="text-[10px] text-slate-300 hover:text-primary mb-3 lg:mb-4 flex items-center gap-2 font-black uppercase tracking-[0.2em] transition-all">← Volver a Bandeja</button>
           <h2 className="text-2xl lg:text-4xl font-display font-black text-slate-800 tracking-tight leading-none break-words">{credit.nombreCompleto}</h2>
           <p className="text-[10px] lg:text-xs text-slate-400 font-bold mt-2 uppercase tracking-widest break-all">SOL. N° {credit.solicitudNumber || 'N/A'} • CC: {credit.numeroDocumento}</p>
           <div className="flex flex-wrap gap-2 mt-2">
               <span className="text-[9px] font-black text-slate-500 bg-slate-50 px-3 py-1 rounded-lg uppercase tracking-wider">Gestor: {credit.gestorName}</span>
               <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-wider ${credit.analystName ? 'text-blue-600 bg-blue-50' : 'text-slate-400 bg-slate-50'}`}>
                   Analista: {credit.analystName || 'Sin asignar'}
               </span>
               {MockService.hasPermission(currentUser, 'ASSIGN_ANALYST_MANUAL') && (
                   <button
                       onClick={() => { setSelectedAnalystId(credit.assignedAnalystId || ''); setShowAnalystModal(true); }}
                       className="text-[9px] font-black text-primary bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded-lg uppercase tracking-wider transition-all"
                   >
                       {credit.assignedAnalystId ? 'Cambiar Analista' : 'Asignar Analista'}
                   </button>
               )}
           </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
             <div className={`px-8 py-3 rounded-2xl text-white text-[11px] font-black shadow-xl uppercase tracking-widest ${currentStateObj?.color}`}>{currentStateObj?.name}</div>
             {currentStateObj?.roleResponsible && (
                 <div className="px-6 py-2 bg-slate-100 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest">
                     RESP: {currentStateObj.roleResponsible}
                 </div>
             )}
             {/* ACCIONES RÁPIDAS DEL ESTADO */}
             {stateActions.length > 0 && stateActions.map(action => (
                <button
                    key={action.id}
                    disabled={executingActionId === action.id}
                    onClick={async () => {
                        setExecutingActionId(action.id);
                        try {
                            await MockService.logStateAction?.(credit.id, action.label, currentUser);
                            // Si la acción tiene cambio de estado configurado, ejecutarlo automáticamente
                            if (action.result_action === 'change_status' && action.result_state_id) {
                                await MockService.updateCreditStatus(
                                    credit.id,
                                    action.result_state_id,
                                    currentUser,
                                    `Cambio automático por acción: ${action.label}`
                                );
                            }
                            await refreshData();
                            window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: `✓ "${action.label}" registrado`, type: 'success' } }));
                        } catch {
                            window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: 'Error al registrar acción', type: 'error' } }));
                        } finally { setExecutingActionId(null); }
                    }}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-wait"
                >
                    {executingActionId === action.id
                        ? <Loader2 size={13} className="animate-spin"/>
                        : <Check size={13}/>
                    }
                    {action.label}
                </button>
             ))}

             {MockService.hasPermission(currentUser, 'CHANGE_CREDIT_STATUS') && (
                <select
                    value={credit.statusId}
                    onChange={e => {
                        const targetState = states.find(s => s.id === e.target.value);
                        setPendingStatus(e.target.value);
                        if (targetState?.name?.toUpperCase().includes('DEVUELTO')) {
                            setDevolucionComment('');
                            setDevolucionTasks([]);
                            setNewTaskTitle('');
                            setNewTaskRequiresDoc(false);
                            setShowDevolucionModal(true);
                        } else {
                            setShowStatusModal(true);
                        }
                    }}
                    className="bg-white border-2 border-slate-100 text-[10px] rounded-2xl px-5 py-3 font-black uppercase tracking-widest outline-none focus:border-primary transition-all cursor-pointer shadow-sm"
                >
                    {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
             )}
             {/* ANALISTA (o quien tenga permiso de cambiar estado) puede habilitar / deshabilitar edición al gestor cuando está DEVUELTO o APLAZADO */}
             {MockService.hasPermission(currentUser, 'CHANGE_CREDIT_STATUS') && currentUser.role !== 'GESTOR' && isEditableState && (
                <button
                    onClick={handleToggleSubsanacion}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 ${
                        credit.subsanacionHabilitada
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                    }`}
                >
                    {credit.subsanacionHabilitada ? <Lock size={14}/> : <Unlock size={14}/>}
                    {credit.subsanacionHabilitada ? 'Bloquear Edición' : 'Habilitar Edición al Gestor'}
                </button>
             )}
             {/* GESTOR puede cambiar de DEVUELTO/APLAZADO a SUBSANADO únicamente */}
             {currentUser.role === 'GESTOR' && !MockService.hasPermission(currentUser, 'CHANGE_CREDIT_STATUS') && isEditableState && (
                <button
                    onClick={() => {
                        if (!allTasksDone) {
                            window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: `Debes completar todas las tareas pendientes antes de subsanar (${pendingTasksCount} pendiente${pendingTasksCount !== 1 ? 's' : ''}).`, type: 'error' } }));
                            setActiveTab('DETAILS');
                            return;
                        }
                        const subsanadoState = states.find(s => s.name?.toUpperCase().includes('SUBSANADO'));
                        if (subsanadoState) {
                            setPendingStatus(subsanadoState.id);
                            setShowStatusModal(true);
                        } else {
                            window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: 'No existe el estado "SUBSANADO" en el flujo. Configúralo en el panel de administración.', type: 'error' } }));
                        }
                    }}
                    disabled={!allTasksDone && devolucionTasksList.length > 0}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 ${
                        allTasksDone || devolucionTasksList.length === 0
                            ? 'bg-blue-500 hover:bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    <RotateCcw size={14}/> Subsanar Crédito
                    {!allTasksDone && devolucionTasksList.length > 0 && (
                        <span className="bg-red-500 text-white rounded-full text-[8px] font-black w-4 h-4 flex items-center justify-center ml-1">{pendingTasksCount}</span>
                    )}
                </button>
             )}
             {MockService.hasPermission(currentUser, 'CONFIGURE_SYSTEM') && (
                <button
                    onClick={async () => {
                        if (window.confirm(`¿Estás seguro de eliminar el crédito de ${credit.nombreCompleto}? Esta acción no se puede deshacer.`)) {
                            try {
                                await MockService.deleteCredit(credit.id, currentUser);
                                window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: "Crédito eliminado correctamente", type: 'success' } }));
                                onBack();
                            } catch (err) {
                                window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: "Error al eliminar crédito", type: 'error' } }));
                            }
                        }
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white p-2 sm:p-3 rounded-2xl transition-all shadow-lg flex items-center gap-1 sm:gap-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                >
                    <Trash size={14} className="sm:w-4 sm:h-4"/> <span className="hidden xs:inline">Eliminar</span><span className="xs:hidden">Del</span>
                </button>
             )}
             
        </div>
      </div>

      {/* TABS ELEGANTES */}
      <div className="flex gap-2 lg:gap-4 border-b border-slate-100 px-4 lg:px-6 overflow-x-auto custom-scrollbar shrink-0 -mx-2 lg:mx-0">
          <TabButton active={activeTab==='DETAILS'} onClick={()=>setActiveTab('DETAILS')} label="Expediente" />
          <TabButton active={activeTab==='DOCUMENTS'} onClick={()=>setActiveTab('DOCUMENTS')} label="Documentos" />
          <TabButton active={activeTab==='HISTORY'} onClick={()=>setActiveTab('HISTORY')} label="Trazabilidad" />
          <TabButton active={activeTab==='CHAT'} onClick={()=>setActiveTab('CHAT')} label="Chat Operativo" />
          {[UserRole.ADMIN, UserRole.ANALISTA, UserRole.ASISTENTE_OPERATIVO].includes(currentUser.role as any) && (
              <TabButton active={activeTab==='LEGAL_DOCS'} onClick={()=>setActiveTab('LEGAL_DOCS')} label="📁 Docs. Legales" />
          )}
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 lg:gap-8">
         <div className="lg:col-span-3 bg-white rounded-2xl lg:rounded-[3rem] shadow-[0_10px_30px_rgba(0,0,0,0.02)] border border-slate-50 p-4 sm:p-6 md:p-12 overflow-y-auto custom-scrollbar relative lg:max-h-[calc(100vh-300px)]">
            {activeTab === 'DETAILS' && (
                <div className="space-y-16 animate-fade-in">
                    {/* Banner modo subsanación para el Gestor */}
                    {canEditAsGestor && (
                        <div className="flex items-start gap-3 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 -mb-8">
                            <Unlock size={18} className="text-amber-500 shrink-0 mt-0.5"/>
                            <div>
                                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Modo Subsanación Habilitado</p>
                                <p className="text-xs text-amber-600 font-medium mt-0.5">El analista te habilitó la edición. Corrige los datos, guarda los cambios y usa el botón <strong>Subsanar Crédito</strong> para notificar.</p>
                            </div>
                        </div>
                    )}

                    {/* TAREAS DE DEVOLUCIÓN */}
                    {isEditableState && devolucionTasksList.length > 0 && (
                        <div className="bg-white border-2 border-red-100 rounded-3xl p-6 -mb-8">
                            <div className="flex items-center justify-between mb-5">
                                <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.2em] flex items-center gap-3">
                                    <ClipboardList size={16} className="text-red-500"/> TAREAS REQUERIDAS PARA SUBSANAR
                                </h4>
                                <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl border ${allTasksDone ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                                    {devolucionTasksList.filter((t: any) => t.completed).length}/{devolucionTasksList.length} completadas
                                </span>
                            </div>
                            <div className="space-y-4">
                                {devolucionTasksList.map((task: any) => (
                                    <div key={task.id} className={`rounded-2xl border-2 transition-all ${task.completed ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
                                        {/* Fila superior: icono + título + badge */}
                                        <div className="flex items-start gap-4 p-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${task.completed ? 'bg-green-500' : 'bg-slate-200'}`}>
                                                {task.completed
                                                    ? <CheckCircle2 size={16} className="text-white"/>
                                                    : <div className="w-2 h-2 rounded-full bg-slate-400"/>
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-black ${task.completed ? 'text-green-700 line-through' : 'text-slate-700'}`}>{task.title}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5 flex items-center gap-1">
                                                    {task.requiresDoc
                                                        ? <><Paperclip size={9}/> Requiere adjunto</>
                                                        : <><MessageSquare size={9}/> Requiere respuesta de texto</>
                                                    }
                                                    {task.docName && <span className="text-green-600 normal-case tracking-normal ml-1">· {task.docName}</span>}
                                                </p>
                                                {task.completed && task.completedAt && (
                                                    <p className="text-[9px] font-bold text-green-600 mt-1">
                                                        Completada {task.completedBy ? `por ${task.completedBy} · ` : ''}{new Date(task.completedAt).toLocaleString()}
                                                    </p>
                                                )}
                                                {/* Mostrar texto de respuesta cuando ya completó */}
                                                {task.completed && task.completionText && (
                                                    <div className="mt-2 bg-green-100/60 border border-green-200 rounded-xl px-3 py-2">
                                                        <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-0.5">Respuesta:</p>
                                                        <p className="text-xs text-green-800 font-medium leading-relaxed">{task.completionText}</p>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Ver adjunto (completada) */}
                                            {task.completed && task.docUrl && (
                                                <a href={task.docUrl} target="_blank" className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-bold text-green-700 bg-green-100 hover:bg-green-200 transition-all shrink-0">
                                                    <Download size={10}/> Ver
                                                </a>
                                            )}
                                            {/* Badge pendiente para no-gestores */}
                                            {!task.completed && currentUser.role !== 'GESTOR' && (
                                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wide shrink-0 mt-1">Pendiente</span>
                                            )}
                                        </div>

                                        {/* Área de acción del Gestor (solo pendiente) */}
                                        {!task.completed && currentUser.role === 'GESTOR' && (
                                            <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                                                {task.requiresDoc ? (
                                                    /* Tarea con adjunto: botón de subir archivo */
                                                    <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all ${completingTaskId === task.id ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md'}`}>
                                                        {completingTaskId === task.id
                                                            ? <><Loader2 size={12} className="animate-spin"/> Subiendo...</>
                                                            : <><Paperclip size={12}/> Seleccionar archivo y completar</>
                                                        }
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            disabled={!!completingTaskId}
                                                            onChange={e => e.target.files?.[0] && handleCompleteTask(task.id, e.target.files[0])}
                                                        />
                                                    </label>
                                                ) : (
                                                    /* Tarea de texto: input + botón completar */
                                                    <div className="flex gap-2 items-end">
                                                        <textarea
                                                            rows={2}
                                                            placeholder="Escribe tu respuesta o explicación..."
                                                            value={taskTexts[task.id] || ''}
                                                            onChange={e => setTaskTexts(prev => ({ ...prev, [task.id]: e.target.value }))}
                                                            disabled={!!completingTaskId}
                                                            className="flex-1 px-3 py-2 border-2 border-slate-100 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-primary bg-white placeholder:text-slate-300 resize-none disabled:opacity-50"
                                                        />
                                                        <button
                                                            onClick={() => handleCompleteTask(task.id, undefined, taskTexts[task.id]?.trim() || undefined)}
                                                            disabled={!!completingTaskId}
                                                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${completingTaskId === task.id ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-green-500 hover:bg-green-600 text-white shadow-md'}`}
                                                        >
                                                            {completingTaskId === task.id ? <Loader2 size={12} className="animate-spin"/> : <><Check size={12}/> Completar</>}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {!allTasksDone && currentUser.role === 'GESTOR' && (
                                <p className="text-[10px] font-bold text-red-500 text-center mt-4 flex items-center justify-center gap-2">
                                    <ClipboardList size={12}/> Completa todas las tareas para habilitar el botón Subsanar Crédito
                                </p>
                            )}
                        </div>
                    )}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-50 pb-8 gap-6">
                        <h3 className="text-2xl font-display font-black text-slate-800 flex items-center gap-4"><UserIcon className="text-primary" size={28}/> INFORMACIÓN DEL EXPEDIENTE</h3>
                        {effectiveCanEdit && (
                            isEditing ? (
                                <div className="flex gap-3 w-full sm:w-auto">
                                    <button onClick={() => setIsEditing(false)} className="flex-1 sm:flex-none text-[10px] font-black uppercase bg-slate-50 px-8 py-4 rounded-2xl hover:bg-slate-100 transition-all tracking-widest text-slate-500">Cancelar</button>
                                    <button onClick={handleUpdateCredit} className="flex-1 sm:flex-none text-[10px] font-black uppercase bg-primary text-white px-10 py-4 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 hover:bg-orange-600 transition-all tracking-widest"><Save size={16}/> Guardar</button>
                                </div>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className="w-full sm:w-auto text-[10px] font-black uppercase bg-slate-900 text-white px-10 py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl tracking-widest"><Pencil size={16}/> Editar Datos</button>
                            )
                        )}
                    </div>

                    {/* DATOS PERSONALES */}
                    <div>
                        <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><UserIcon size={16} className="text-primary"/> DATOS PERSONALES</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            <EditableItem label="Nombres" name="nombres" value={editFormData.nombres} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, nombres: e.target.value})} />
                            <EditableItem label="Apellidos" name="apellidos" value={editFormData.apellidos} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, apellidos: e.target.value})} />
                            <EditableItem label="Tipo Documento" name="tipoDocumento" value={editFormData.tipoDocumento} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, tipoDocumento: e.target.value})} options={['CEDULA', 'CEDULA_EXTRANJERIA', 'PASAPORTE']} />
                            <EditableItem label="Número Documento" name="numeroDocumento" value={editFormData.numeroDocumento} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, numeroDocumento: e.target.value})} />
                            <EditableItem label="Ciudad Expedición" name="ciudadExpedicion" value={editFormData.ciudadExpedicion} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, ciudadExpedicion: e.target.value})} options={cities} />
                            <EditableItem label="Fecha Expedición" name="fechaExpedicion" value={editFormData.fechaExpedicion} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, fechaExpedicion: e.target.value})} type="date" />
                            <EditableItem label="Ciudad Nacimiento" name="ciudadNacimiento" value={editFormData.ciudadNacimiento} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, ciudadNacimiento: e.target.value})} options={cities} />
                            <EditableItem label="Fecha Nacimiento" name="fechaNacimiento" value={editFormData.fechaNacimiento} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, fechaNacimiento: e.target.value})} type="date" />
                            <EditableItem label="Sexo" name="sexo" value={editFormData.sexo} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, sexo: e.target.value})} options={['MASCULINO', 'FEMENINO', 'OTRO']} />
                        </div>
                    </div>

                    {/* DATOS DE CONTACTO */}
                    <div className="pt-8 border-t border-slate-50">
                        <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><MapPin size={16} className="text-primary"/> CONTACTO Y RESIDENCIA</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            <EditableItem label="Correo Electrónico" name="correo" value={editFormData.correo} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, correo: e.target.value})} />
                            <EditableItem label="Celular" name="telefonoCelular" value={editFormData.telefonoCelular} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, telefonoCelular: e.target.value})} />
                            <EditableItem label="Teléfono Fijo" name="telefonoFijo" value={editFormData.telefonoFijo} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, telefonoFijo: e.target.value})} />
                            <EditableItem label="Dirección Completa" name="direccionCompleta" value={editFormData.direccionCompleta} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, direccionCompleta: e.target.value})} />
                            <EditableItem label="Barrio" name="barrio" value={editFormData.barrio} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, barrio: e.target.value})} />
                            <EditableItem label="Ciudad Residencia" name="ciudadResidencia" value={editFormData.ciudadResidencia} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, ciudadResidencia: e.target.value})} options={cities} />
                            <EditableItem label="Estado Civil" name="estadoCivil" value={editFormData.estadoCivil} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, estadoCivil: e.target.value})} options={['SOLTERO', 'CASADO', 'UNION_LIBRE', 'DIVORCIADO', 'VIUDO']} />
                        </div>
                    </div>

                    {/* DATOS LABORALES */}
                    <div className="pt-8 border-t border-slate-50">
                        <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><Briefcase size={16} className="text-primary"/> INFORMACIÓN LABORAL</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            <EditableItem label="Pagaduría" name="pagaduria" value={editFormData.pagaduria} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, pagaduria: e.target.value})} options={pagadurias} />
                            <EditableItem label="Clave Pagaduría" name="clavePagaduria" value={editFormData.clavePagaduria} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, clavePagaduria: e.target.value})} />
                            <EditableItem label="# Resolución Pensión" name="resolucionPension" value={editFormData.resolucionPension} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, resolucionPension: e.target.value})} />
                            <EditableItem label="Fecha Pensión" name="fechaPension" value={editFormData.fechaPension} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, fechaPension: e.target.value})} type="date" />
                            <EditableItem label="Antigüedad (Años)" name="antiguedadPension" value={editFormData.antiguedadPension} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, antiguedadPension: e.target.value})} type="number" />
                        </div>
                    </div>

                    {/* DATOS DEL CRÉDITO */}
                    <div className="pt-8 border-t border-slate-50">
                        <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                            <DollarSign size={16} className="text-primary"/> DETALLES DEL CRÉDITO
                            {canEditAsGestor && (
                                <span className="ml-2 text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg uppercase tracking-wide flex items-center gap-1">
                                    <Lock size={10}/> Condiciones bloqueadas
                                </span>
                            )}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {/* Condiciones del crédito — bloqueadas para gestor en subsanación */}
                            <EditableItem label="Línea de Crédito" name="lineaCredito" value={editFormData.lineaCredito} isEditing={isEditing && !canEditAsGestor} onChange={e=>setEditFormData({...editFormData, lineaCredito: e.target.value})} options={creditLines} />
                            <EditableItem label="Monto Solicitado" name="monto" value={editFormData.monto} isEditing={isEditing && !canEditAsGestor} onChange={e=>setEditFormData({...editFormData, monto: e.target.value})} type="number" />
                            <EditableItem label="Plazo (Meses)" name="plazo" value={editFormData.plazo} isEditing={isEditing && !canEditAsGestor} onChange={e=>setEditFormData({...editFormData, plazo: e.target.value})} type="number" />
                            <EditableItem label="Entidad Aliada" name="entidadAliada" value={editFormData.entidadAliada} isEditing={isEditing && !canEditAsGestor} onChange={e=>setEditFormData({...editFormData, entidadAliada: e.target.value, tasa: ''})} options={entities.map((e: any) => e.name)} />
                            <EditableItem label="Tasa (% NMV)" name="tasa" value={editFormData.tasa} isEditing={isEditing && !canEditAsGestor} onChange={e=>setEditFormData({...editFormData, tasa: e.target.value})} options={entities.find((e: any) => e.name === editFormData.entidadAliada)?.rates?.map((r: any) => ({ value: r.rate, label: `${r.rate}% NMV (Com: ${r.commission}%)` })) || []} />
                            {/* Campos editables también en subsanación */}
                            <EditableItem label="Gastos Mensuales" name="gastosMensuales" value={editFormData.gastosMensuales} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, gastosMensuales: e.target.value})} type="number" />
                            <EditableItem label="Activos" name="activos" value={editFormData.activos} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, activos: e.target.value})} type="number" />
                            <EditableItem label="Pasivos" name="pasivos" value={editFormData.pasivos} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, pasivos: e.target.value})} type="number" />
                            <EditableItem label="Patrimonio Neto" name="patrimonio" value={editFormData.patrimonio} isEditing={false} onChange={()=>{}} type="number" />
                            <EditableItem label="Cuota Disponible" name="cuotaDisponible" value={editFormData.cuotaDisponible} isEditing={isEditing && !canEditAsGestor} onChange={e=>setEditFormData({...editFormData, cuotaDisponible: e.target.value})} type="number" />
                        </div>

                        {/* Carteras a recoger */}
                        {credit.carteraItems && credit.carteraItems.length > 0 && (
                            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-5">
                                <p className="text-[10px] font-black text-blue-700 uppercase tracking-[0.2em] mb-3">Compras de Cartera a Recoger</p>
                                <div className="space-y-2">
                                    {credit.carteraItems.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center bg-white rounded-xl px-4 py-2.5 border border-blue-100">
                                            <span className="text-sm font-bold text-slate-700">{item.entity || 'Sin nombre'}</span>
                                            <span className="font-mono font-black text-blue-800 text-sm">
                                                ${Number(item.amount).toLocaleString('es-CO')}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center px-4 py-2 border-t border-blue-200 mt-1">
                                        <span className="text-xs font-black text-blue-700 uppercase tracking-wide">Total cartera</span>
                                        <span className="font-mono font-black text-blue-900">
                                            ${credit.carteraItems.reduce((s, c) => s + Number(c.amount), 0).toLocaleString('es-CO')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* FORMA DE DESEMBOLSO */}
                    <div className="pt-8 border-t border-slate-50">
                        <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><CreditCard size={16} className="text-primary"/> FORMA DE DESEMBOLSO</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            <EditableItem label="Forma de Pago" name="tipoDesembolso" value={editFormData.tipoDesembolso} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, tipoDesembolso: e.target.value})} options={['EFECTIVO', 'CUENTA_BANCARIA']} />
                            {editFormData.tipoDesembolso === 'CUENTA_BANCARIA' && (
                                <>
                                    <EditableItem label="Banco" name="banco" value={editFormData.banco} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, banco: e.target.value})} options={banks} />
                                    <EditableItem label="Tipo de Cuenta" name="tipoCuenta" value={editFormData.tipoCuenta} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, tipoCuenta: e.target.value})} options={['AHORROS', 'CORRIENTE']} />
                                    <EditableItem label="Número de Cuenta" name="numeroCuenta" value={editFormData.numeroCuenta} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, numeroCuenta: e.target.value})} />
                                </>
                            )}
                        </div>
                    </div>

                    {/* REFERENCIAS Y BENEFICIARIO */}
                    <div className="pt-8 border-t border-slate-50">
                        <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.2em] mb-8 flex items-center gap-3"><Users size={16} className="text-primary"/> REFERENCIAS Y BENEFICIARIO</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                             <div className="space-y-4 p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 shadow-inner">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">REFERENCIA No. 1</p>
                                <EditableItem label="Nombre Completo" name="ref1Nombre" value={editFormData.ref1Nombre} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, ref1Nombre: e.target.value})} />
                                <EditableItem label="Teléfono" name="ref1Telefono" value={editFormData.ref1Telefono} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, ref1Telefono: e.target.value})} />
                                <EditableItem label="Dirección" name="ref1Direccion" value={editFormData.ref1Direccion} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, ref1Direccion: e.target.value})} />
                                <EditableItem label="Ciudad" name="ref1Ciudad" value={editFormData.ref1Ciudad} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, ref1Ciudad: e.target.value})} options={cities} />
                                <EditableItem label="Barrio" name="ref1Barrio" value={editFormData.ref1Barrio} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, ref1Barrio: e.target.value})} />
                                <EditableItem label="Parentesco" name="ref1Parentesco" value={editFormData.ref1Parentesco} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, ref1Parentesco: e.target.value})} />
                             </div>
                             <div className="space-y-4 p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 shadow-inner">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">REFERENCIA No. 2</p>
                                <EditableItem label="Nombre Completo" name="ref2Nombre" value={editFormData.ref2Nombre} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, ref2Nombre: e.target.value})} />
                                <EditableItem label="Teléfono" name="ref2Telefono" value={editFormData.ref2Telefono} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, ref2Telefono: e.target.value})} />
                                <EditableItem label="Dirección" name="ref2Direccion" value={editFormData.ref2Direccion} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, ref2Direccion: e.target.value})} />
                                <EditableItem label="Ciudad" name="ref2Ciudad" value={editFormData.ref2Ciudad} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, ref2Ciudad: e.target.value})} options={cities} />
                                <EditableItem label="Barrio" name="ref2Barrio" value={editFormData.ref2Barrio} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, ref2Barrio: e.target.value})} />
                                <EditableItem label="Parentesco" name="ref2Parentesco" value={editFormData.ref2Parentesco} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, ref2Parentesco: e.target.value})} />
                             </div>
                             <div className="space-y-4 p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 shadow-inner">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">BENEFICIARIO SEGURO</p>
                                <EditableItem label="Nombre Completo" name="beneficiarioNombre" value={editFormData.beneficiarioNombre} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, beneficiarioNombre: e.target.value})} />
                                <EditableItem label="Cédula" name="beneficiarioCedula" value={editFormData.beneficiarioCedula} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, beneficiarioCedula: e.target.value})} />
                                <EditableItem label="Fecha Expedición" name="beneficiarioFechaExpedicion" value={editFormData.beneficiarioFechaExpedicion} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, beneficiarioFechaExpedicion: e.target.value})} type="date" />
                                <EditableItem label="Fecha Nacimiento" name="beneficiarioFechaNacimiento" value={editFormData.beneficiarioFechaNacimiento} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, beneficiarioFechaNacimiento: e.target.value})} type="date" />
                                <EditableItem label="Teléfono" name="beneficiarioTelefono" value={editFormData.beneficiarioTelefono} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, beneficiarioTelefono: e.target.value})} />
                                <EditableItem label="Dirección" name="beneficiarioDireccion" value={editFormData.beneficiarioDireccion} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, beneficiarioDireccion: e.target.value})} />
                                <EditableItem label="Ciudad" name="beneficiarioCiudad" value={editFormData.beneficiarioCiudad} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, beneficiarioCiudad: e.target.value})} options={cities} />
                                <EditableItem label="Barrio" name="beneficiarioBarrio" value={editFormData.beneficiarioBarrio} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, beneficiarioBarrio: e.target.value})} />
                                <EditableItem label="Parentesco" name="beneficiarioParentesco" value={editFormData.beneficiarioParentesco} isEditing={isEditing} onChange={e=>setEditFormData({...editFormData, beneficiarioParentesco: e.target.value})} />
                             </div>
                        </div>
                    </div>

                    {/* OBSERVACIONES */}
                    <div className="pt-8 border-t border-slate-50">
                        <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><MessageSquare size={16} className="text-primary"/> OBSERVACIONES</h4>
                        {isEditing ? (
                            <textarea
                                name="observaciones"
                                value={editFormData.observaciones || ''}
                                onChange={e=>setEditFormData({...editFormData, observaciones: e.target.value})}
                                placeholder="Observaciones adicionales sobre el crédito..."
                                rows={4}
                                className="w-full px-5 py-4 bg-white text-slate-800 border-2 border-slate-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all text-sm font-bold placeholder:text-slate-300 hover:border-slate-200 shadow-sm resize-none"
                            />
                        ) : (
                            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                                    {credit.observaciones || 'Sin observaciones'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'DOCUMENTS' && (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
                    {credit.documents.length === 0 && <div className="col-span-full text-center py-16 text-slate-300 font-bold italic text-sm">No hay archivos vinculados a este expediente.</div>}
                    {credit.documents.map(d => (
                        <div key={d.id} className="group p-4 bg-white rounded-xl border border-slate-100 flex flex-col items-center text-center gap-3 hover:border-primary/30 hover:shadow-md transition-all duration-300">
                            <div className="p-3 bg-primary/5 rounded-lg text-primary transition-transform group-hover:scale-105"><FileText size={24}/></div>
                            <div className="w-full">
                                <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wide truncate" title={d.type}>{d.type.replace(/_/g, ' ')}</p>
                                <p className="text-[8px] text-slate-400 mt-1 font-medium truncate">{d.name}</p>
                            </div>
                            <a href={d.url} target="_blank" className="w-full py-2 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-bold text-slate-600 flex items-center justify-center gap-2 hover:bg-primary hover:text-white hover:border-primary transition-all"><Download size={12}/> Descargar</a>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'LEGAL_DOCS' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Header */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-xl"><FolderLock size={20} className="text-amber-600"/></div>
                        <div>
                            <p className="font-bold text-amber-800 text-sm">Documentos Legales</p>
                            <p className="text-xs text-amber-600">Visible solo para Analistas, Administradores y Asistentes Operativos</p>
                        </div>
                    </div>

                    {/* Upload row */}
                    <div className="flex gap-2 items-center">
                        <input
                            type="text"
                            placeholder="Nombre del documento (ej: Pagaré, Contrato...)"
                            value={legalDocType}
                            onChange={e => setLegalDocType(e.target.value)}
                            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                        <label className={`flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-colors whitespace-nowrap ${uploadingLegal || !legalDocType.trim() ? 'opacity-50 pointer-events-none' : ''}`}>
                            {uploadingLegal ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>}
                            {uploadingLegal ? 'Subiendo...' : 'Subir archivo'}
                            <input type="file" className="hidden" disabled={uploadingLegal || !legalDocType.trim()} onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file || !credit) return;
                                setUploadingLegal(true);
                                try {
                                    const doc = await (MockService as any).uploadLegalDocument(credit.id, file, legalDocType.trim());
                                    setLegalDocs(prev => [doc, ...prev]);
                                    setLegalDocType('');
                                } catch (err: any) {
                                    alert('Error al subir: ' + err.message);
                                } finally {
                                    setUploadingLegal(false);
                                    e.target.value = '';
                                }
                            }}/>
                        </label>
                    </div>

                    {/* Lista de documentos */}
                    {legalDocsLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-amber-400" size={28}/></div>
                    ) : legalDocs.length === 0 ? (
                        <div className="text-center py-16 text-slate-300 font-bold italic text-sm">No hay documentos legales cargados aún.</div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {legalDocs.map(d => (
                                <div key={d.id} className="group p-4 bg-white rounded-xl border border-amber-100 flex flex-col items-center text-center gap-3 hover:border-amber-300 hover:shadow-md transition-all duration-300 relative">
                                    <div className="p-3 bg-amber-50 rounded-lg text-amber-500 transition-transform group-hover:scale-105"><FolderLock size={24}/></div>
                                    <div className="w-full">
                                        <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wide truncate" title={d.type}>{d.type}</p>
                                        <p className="text-[8px] text-slate-400 mt-1 font-medium truncate">{d.name}</p>
                                        <p className="text-[8px] text-slate-300 mt-0.5">{new Date(d.uploadedAt).toLocaleDateString('es-CO')}</p>
                                    </div>
                                    <div className="flex gap-2 w-full">
                                        <a href={d.url} target="_blank" className="flex-1 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-bold text-slate-600 flex items-center justify-center gap-1 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all"><Download size={11}/> Ver</a>
                                        <button
                                            onClick={async () => {
                                                if (!confirm('¿Eliminar este documento?')) return;
                                                setDeletingLegalId(d.id);
                                                try {
                                                    await (MockService as any).deleteLegalDocument(d.id);
                                                    setLegalDocs(prev => prev.filter(x => x.id !== d.id));
                                                } catch (err: any) {
                                                    alert('Error al eliminar: ' + err.message);
                                                } finally {
                                                    setDeletingLegalId(null);
                                                }
                                            }}
                                            disabled={deletingLegalId === d.id}
                                            className="p-1.5 bg-red-50 border border-red-100 rounded-lg text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all disabled:opacity-40"
                                        >
                                            {deletingLegalId === d.id ? <Loader2 size={11} className="animate-spin"/> : <Trash size={11}/>}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'HISTORY' && (
                <div className="space-y-3 animate-fade-in pr-2 max-h-[65vh] overflow-y-auto custom-scrollbar">
                    {credit.history.length === 0 && <div className="text-center py-16 text-slate-300 font-bold italic text-sm">Sin registros de trazabilidad histórica.</div>}
                    {credit.history.map((h, i) => (
                        <div key={h.id} className="flex gap-3 items-start border-l-2 border-slate-100 pl-4 relative pb-3">
                            <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-primary"></div>
                            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 w-full hover:bg-white hover:shadow-md transition-all duration-300">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                                    <h4 className="font-bold text-[10px] text-slate-700 uppercase tracking-wider bg-white px-3 py-1 rounded-lg border border-slate-100">{h.action}</h4>
                                    <span className="text-[9px] font-bold text-slate-400">{h.date.toLocaleString()}</span>
                                </div>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed mb-3">{h.description}</p>
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                    <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-100">{h.userName?.charAt(0)}</div>
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-700">{h.userName}</p>
                                        <p className="text-[8px] font-medium text-slate-400">{h.userRole?.replace('_', ' ')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'CHAT' && (
                <div className="flex flex-col animate-fade-in max-h-[65vh]">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 rounded-xl border border-slate-100 mb-3 custom-scrollbar min-h-0">
                        {credit.comments.length === 0 && <div className="text-center py-12 text-slate-300 font-bold text-xs">Envía un mensaje para iniciar el historial operativo.</div>}
                        {credit.comments.map(c => {
                            const readers = creditReads.filter(r =>
                                r.userId !== currentUser.id &&
                                r.userId !== c.userId &&
                                r.lastReadAt > new Date(c.timestamp)
                            );
                            return (
                            <div key={c.id} className={`flex flex-col ${c.userId === currentUser.id ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] rounded-xl p-3 text-xs shadow-sm ${c.isSystem ? 'bg-orange-50 border border-orange-100 w-full text-center italic text-orange-700 font-medium' : (c.userId === currentUser.id ? 'bg-primary text-white font-medium' : 'bg-white border border-slate-100 text-slate-700 font-medium')}`}>
                                    {!c.isSystem && <div className="font-bold mb-1.5 text-[8px] uppercase tracking-wider opacity-80">{c.userName} <span className="opacity-50">({c.userRole})</span></div>}
                                    <p className="leading-relaxed whitespace-pre-wrap">{c.text}</p>
                                    {c.attachmentUrl && (
                                        <a href={c.attachmentUrl} target="_blank" className="mt-2 block bg-white/20 p-2 rounded-lg text-[9px] font-bold flex items-center gap-2 hover:bg-white/30 transition-all border border-white/10">
                                            <Paperclip size={14}/> {c.attachmentName}
                                        </a>
                                    )}
                                    <div className="text-[8px] opacity-60 mt-2 text-right font-bold">{c.timestamp.toLocaleTimeString()}</div>
                                </div>
                                {readers.length > 0 && (
                                    <div className={`mt-0.5 text-[8px] font-bold text-slate-400 flex items-center gap-1 ${c.userId === currentUser.id ? 'self-end' : 'self-start'}`}>
                                        <span>✓✓</span>
                                        <span>Visto por {readers.map(r => r.userName.split(' ')[0]).join(', ')} · {readers[readers.length - 1].lastReadAt.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })}</span>
                                    </div>
                                )}
                            </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSendComment} className="flex gap-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm items-center">
                        <label className={`p-2 rounded-lg transition-all ${sendingComment ? 'text-slate-200 cursor-not-allowed' : 'text-slate-300 cursor-pointer hover:bg-slate-50 hover:text-primary'}`}>
                            <Paperclip size={18}/>
                            <input type="file" className="hidden" disabled={sendingComment} onChange={e => e.target.files && setAttachedFile(e.target.files[0])}/>
                        </label>
                        <input value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder={sendingComment ? "Enviando..." : "Escribe un mensaje..."} disabled={sendingComment} className="flex-1 border-none focus:ring-0 text-xs font-medium bg-transparent text-slate-700 placeholder:text-slate-400 disabled:opacity-50"/>
                        <button type="submit" disabled={sendingComment} className="bg-slate-900 text-white p-2.5 rounded-lg hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            {sendingComment ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                        </button>
                    </form>
                    {attachedFile && <div className="mt-2 text-[9px] font-bold text-primary flex items-center gap-2 bg-orange-50 p-2 rounded-lg border border-orange-100 animate-fade-in">
                        <Paperclip size={14}/> {attachedFile.name}
                        {sendingComment && <Loader2 size={12} className="animate-spin ml-auto text-primary"/>}
                        {!sendingComment && <button type="button" onClick={() => setAttachedFile(null)} className="ml-auto text-slate-400 hover:text-red-500 transition-colors"><X size={12}/></button>}
                    </div>}
                </div>
            )}
         </div>

         {/* SIDEBAR MÉTRICAS - DESKTOP */}
         <div className="hidden lg:block space-y-8 w-full">
            <div className="bg-slate-900 rounded-2xl lg:rounded-[3rem] p-5 lg:p-10 text-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-800">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8">DATOS FINANCIEROS</h4>
                <div className="space-y-8">
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 group hover:bg-white/10 transition-all">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Monto Solicitado</p>
                        <p className="text-4xl font-display font-black text-primary mt-2">${Number(credit.monto).toLocaleString()}</p>
                    </div>
                    <div className={`bg-white/5 p-6 rounded-3xl border group transition-all ${isEditing && effectiveCanEdit ? 'border-primary/40 bg-white/10' : 'border-white/5 hover:bg-white/10'}`}>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Cuota Disponible</p>
                        {isEditing && effectiveCanEdit ? (
                            <input
                                type="number"
                                value={editFormData.cuotaDisponible || ''}
                                onChange={e => setEditFormData({...editFormData, cuotaDisponible: Number(e.target.value)})}
                                className="w-full bg-white/90 text-slate-900 text-2xl font-display font-black p-3 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Cuota disponible"
                            />
                        ) : (
                            <p className="text-3xl font-display font-black text-cyan-400 mt-2">
                                {credit.cuotaDisponible ? `$${Number(credit.cuotaDisponible).toLocaleString()}` : 'Sin definir'}
                            </p>
                        )}
                    </div>
                    <div className={`bg-white/5 p-6 rounded-3xl border group transition-all ${isEditing && effectiveCanEdit ? 'border-primary/40 bg-white/10' : 'border-white/5 hover:bg-white/10'}`}>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Monto a Desembolsar</p>
                        {isEditing && effectiveCanEdit ? (
                            <input
                                type="number"
                                value={editFormData.montoDesembolso || ''}
                                onChange={e => setEditFormData({...editFormData, montoDesembolso: Number(e.target.value)})}
                                className="w-full bg-white/90 text-slate-900 text-2xl font-display font-black p-3 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Monto aprobado"
                            />
                        ) : (
                            <p className="text-3xl font-display font-black text-green-400 mt-2">
                                {credit.montoDesembolso ? `$${Number(credit.montoDesembolso).toLocaleString()}` : 'Sin definir'}
                            </p>
                        )}
                    </div>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 group hover:bg-white/10 transition-all">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Comisión Estimada</p>
                        <p className="text-3xl font-display font-black text-emerald-400 mt-2">${Number(credit.estimatedCommission || 0).toLocaleString()}</p>
                        {MockService.hasPermission(currentUser, 'MARK_COMMISSION_PAID') ? (
                            <button
                                onClick={async () => {
                                    try {
                                        await MockService.markCommissionPaid(credit.id, !credit.comisionPagada, currentUser.id);
                                        setCredit(prev => prev ? { ...prev, comisionPagada: !prev.comisionPagada, fechaPagoComision: !prev.comisionPagada ? new Date().toISOString() : undefined } : prev);
                                    } catch (e: any) { alert(e.message); }
                                }}
                                className={`mt-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full transition-all cursor-pointer ${credit.comisionPagada ? 'bg-emerald-500/20 text-emerald-300 hover:bg-red-500/20 hover:text-red-300' : 'bg-white/10 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-300'}`}
                            >
                                {credit.comisionPagada ? '✓ Pagada' : '○ Pendiente'}
                            </button>
                        ) : (
                            <span className={`mt-3 inline-flex items-center text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full ${credit.comisionPagada ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-slate-400'}`}>
                                {credit.comisionPagada ? '✓ Pagada' : '○ Pendiente'}
                            </span>
                        )}
                    </div>
                    <div className="pt-8 border-t border-white/10 flex justify-between items-center px-2">
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase">Radicación</p>
                            <p className="text-[11px] font-bold mt-1.5">{new Date(credit.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-500 uppercase">Tasa Pactada</p>
                            <p className="text-[11px] font-bold mt-1.5 text-primary">{credit.tasa}% NMV</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm flex items-center justify-between group hover:border-green-100 transition-all">
                <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">VERIFICACIÓN</h4>
                    <span className="text-xs font-black text-green-600 uppercase tracking-tight">CÉDULA VALIDADA</span>
                </div>
                <div className="p-4 bg-green-50 text-green-500 rounded-2xl group-hover:rotate-12 transition-transform shadow-sm">
                    <Check size={28}/>
                </div>
            </div>
         </div>

         {/* SIDEBAR MÉTRICAS - MOBILE (AL FINAL) */}
         <div className="block lg:hidden space-y-4 w-full">
            <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-800">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8">DATOS FINANCIEROS</h4>
                <div className="space-y-8">
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 group hover:bg-white/10 transition-all">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Monto Solicitado</p>
                        <p className="text-4xl font-display font-black text-primary mt-2">${Number(credit.monto).toLocaleString()}</p>
                    </div>
                    <div className={`bg-white/5 p-6 rounded-3xl border group transition-all ${isEditing && effectiveCanEdit ? 'border-primary/40 bg-white/10' : 'border-white/5 hover:bg-white/10'}`}>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Cuota Disponible</p>
                        {isEditing && effectiveCanEdit ? (
                            <input
                                type="number"
                                value={editFormData.cuotaDisponible || ''}
                                onChange={e => setEditFormData({...editFormData, cuotaDisponible: Number(e.target.value)})}
                                className="w-full bg-white/90 text-slate-900 text-2xl font-display font-black p-3 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Cuota disponible"
                            />
                        ) : (
                            <p className="text-3xl font-display font-black text-cyan-400 mt-2">
                                {credit.cuotaDisponible ? `$${Number(credit.cuotaDisponible).toLocaleString()}` : 'Sin definir'}
                            </p>
                        )}
                    </div>
                    <div className={`bg-white/5 p-6 rounded-3xl border group transition-all ${isEditing && effectiveCanEdit ? 'border-primary/40 bg-white/10' : 'border-white/5 hover:bg-white/10'}`}>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Monto a Desembolsar</p>
                        {isEditing && effectiveCanEdit ? (
                            <input
                                type="number"
                                value={editFormData.montoDesembolso || ''}
                                onChange={e => setEditFormData({...editFormData, montoDesembolso: Number(e.target.value)})}
                                className="w-full bg-white/90 text-slate-900 text-2xl font-display font-black p-3 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Monto aprobado"
                            />
                        ) : (
                            <p className="text-3xl font-display font-black text-green-400 mt-2">
                                {credit.montoDesembolso ? `$${Number(credit.montoDesembolso).toLocaleString()}` : 'Sin definir'}
                            </p>
                        )}
                    </div>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 group hover:bg-white/10 transition-all">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Comisión Estimada</p>
                        <p className="text-3xl font-display font-black text-emerald-400 mt-2">${Number(credit.estimatedCommission || 0).toLocaleString()}</p>
                        {MockService.hasPermission(currentUser, 'MARK_COMMISSION_PAID') ? (
                            <button
                                onClick={async () => {
                                    try {
                                        await MockService.markCommissionPaid(credit.id, !credit.comisionPagada, currentUser.id);
                                        setCredit(prev => prev ? { ...prev, comisionPagada: !prev.comisionPagada, fechaPagoComision: !prev.comisionPagada ? new Date().toISOString() : undefined } : prev);
                                    } catch (e: any) { alert(e.message); }
                                }}
                                className={`mt-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full transition-all cursor-pointer ${credit.comisionPagada ? 'bg-emerald-500/20 text-emerald-300 hover:bg-red-500/20 hover:text-red-300' : 'bg-white/10 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-300'}`}
                            >
                                {credit.comisionPagada ? '✓ Pagada' : '○ Pendiente'}
                            </button>
                        ) : (
                            <span className={`mt-3 inline-flex items-center text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full ${credit.comisionPagada ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-slate-400'}`}>
                                {credit.comisionPagada ? '✓ Pagada' : '○ Pendiente'}
                            </span>
                        )}
                    </div>
                    <div className="pt-8 border-t border-white/10 flex justify-between items-center px-2">
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase">Radicación</p>
                            <p className="text-[11px] font-bold mt-1.5">{new Date(credit.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-500 uppercase">Tasa Pactada</p>
                            <p className="text-[11px] font-bold mt-1.5 text-primary">{credit.tasa}% NMV</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between group hover:border-green-100 transition-all">
                <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">VERIFICACIÓN</h4>
                    <span className="text-xs font-black text-green-600 uppercase tracking-tight">CÉDULA VALIDADA</span>
                </div>
                <div className="p-4 bg-green-50 text-green-500 rounded-2xl group-hover:rotate-12 transition-transform shadow-sm">
                    <Check size={28}/>
                </div>
            </div>
         </div>
      </div>

      {showStatusModal && (
          <div className="fixed inset-0 bg-slate-900/90 z-[60] flex items-center justify-center p-6 backdrop-blur-lg animate-fade-in">
              <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-lg shadow-[0_50px_100px_rgba(0,0,0,0.2)] border border-white/20">
                  <h3 className="text-3xl font-display font-black text-slate-800 mb-4 tracking-tight text-center">Gestión de Trámite</h3>
                  <p className="text-xs text-slate-400 mb-10 font-black uppercase tracking-[0.2em] text-center">NUEVA ETAPA: <span className="text-primary">{states.find(s=>s.id===pendingStatus)?.name}</span></p>
                  <textarea
                    value={statusComment}
                    onChange={e => setStatusComment(e.target.value)}
                    className="w-full border-2 border-slate-100 rounded-[2.5rem] p-8 text-sm h-48 mb-10 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none font-bold shadow-inner bg-slate-50/50 text-slate-700 placeholder:text-slate-300"
                    placeholder="Describe los pormenores del cambio de estado..."
                  ></textarea>
                  <div className="flex gap-4">
                      <button onClick={() => setShowStatusModal(false)} className="flex-1 py-5 text-slate-400 font-black uppercase text-[11px] hover:text-slate-600 transition-all tracking-widest">Cancelar</button>
                      <button onClick={confirmStatusChange} disabled={!statusComment.trim()} className="flex-[2] py-5 bg-primary text-white font-black rounded-3xl shadow-2xl shadow-primary/30 disabled:opacity-50 transition-all uppercase text-[11px] tracking-widest hover:bg-orange-600 active:scale-95">Confirmar Cambio</button>
                  </div>
              </div>
          </div>
      )}

      {showAnalystModal && (
          <div className="fixed inset-0 bg-slate-900/90 z-[60] flex items-center justify-center p-6 backdrop-blur-lg animate-fade-in">
              <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-lg shadow-[0_50px_100px_rgba(0,0,0,0.2)] border border-white/20">
                  <h3 className="text-2xl font-display font-black text-slate-800 mb-4 tracking-tight text-center">Asignar Analista</h3>
                  <p className="text-xs text-slate-400 mb-8 font-bold text-center">Selecciona el analista que estudiará este crédito</p>
                  <select
                      value={selectedAnalystId}
                      onChange={e => setSelectedAnalystId(e.target.value)}
                      className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold mb-8 focus:border-primary outline-none"
                  >
                      <option value="">Seleccione un analista...</option>
                      {analysts.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                  </select>
                  <div className="flex gap-4">
                      <button onClick={() => setShowAnalystModal(false)} className="flex-1 py-5 text-slate-400 font-black uppercase text-[11px] hover:text-slate-600 transition-all tracking-widest">Cancelar</button>
                      <button onClick={handleAssignAnalyst} disabled={!selectedAnalystId} className="flex-[2] py-5 bg-blue-600 text-white font-black rounded-3xl shadow-2xl shadow-blue-600/30 disabled:opacity-50 transition-all uppercase text-[11px] tracking-widest hover:bg-blue-700 active:scale-95">Asignar</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL DE DEVOLUCIÓN CON TAREAS */}
      {showDevolucionModal && (
          <div className="fixed inset-0 bg-slate-900/90 z-[60] flex items-center justify-center p-4 backdrop-blur-lg animate-fade-in">
              <div className="bg-white rounded-[3rem] p-8 w-full max-w-2xl shadow-[0_50px_100px_rgba(0,0,0,0.2)] border border-white/20 overflow-y-auto max-h-[92vh] custom-scrollbar">
                  <h3 className="text-2xl font-display font-black text-slate-800 mb-1 tracking-tight text-center">Configurar Devolución</h3>
                  <p className="text-xs text-slate-400 mb-7 font-black uppercase tracking-[0.2em] text-center">
                      NUEVA ETAPA: <span className="text-red-500">{states.find(s => s.id === pendingStatus)?.name}</span>
                  </p>

                  {/* Motivo */}
                  <div className="mb-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Motivo de la devolución <span className="text-red-400">*</span></p>
                      <textarea
                          value={devolucionComment}
                          onChange={e => setDevolucionComment(e.target.value)}
                          className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm h-28 focus:border-red-400 focus:ring-4 focus:ring-red-50 outline-none font-bold bg-slate-50/50 text-slate-700 placeholder:text-slate-300 resize-none"
                          placeholder="Explica por qué se devuelve el crédito..."
                      />
                  </div>

                  {/* Constructor de tareas */}
                  <div className="mb-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                          Tareas requeridas para subsanar
                          <span className="ml-2 text-slate-300 normal-case tracking-normal font-medium">(opcional)</span>
                      </p>

                      {/* Lista de tareas añadidas */}
                      {devolucionTasks.length > 0 && (
                          <div className="space-y-2 mb-4">
                              {devolucionTasks.map(task => (
                                  <div key={task.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                          <div className="w-2 h-2 rounded-full bg-red-400"/>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <p className="text-sm font-bold text-slate-700 truncate">{task.title}</p>
                                          {task.requiresDoc && (
                                              <p className="text-[9px] font-bold text-blue-500 uppercase tracking-wide flex items-center gap-1 mt-0.5">
                                                  <Paperclip size={9}/> Requiere adjunto
                                              </p>
                                          )}
                                      </div>
                                      <button
                                          onClick={() => setDevolucionTasks(prev => prev.filter(t => t.id !== task.id))}
                                          className="text-slate-300 hover:text-red-500 transition-colors shrink-0 p-1"
                                      >
                                          <X size={15}/>
                                      </button>
                                  </div>
                              ))}
                          </div>
                      )}

                      {/* Input nueva tarea */}
                      <div className="flex gap-3 items-end">
                          <div className="flex-1 space-y-2">
                              <input
                                  type="text"
                                  placeholder="Ej: Subir cédula vigente, Soporte proceso penal 03..."
                                  value={newTaskTitle}
                                  onChange={e => setNewTaskTitle(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDevolucionTask(); } }}
                                  className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-primary bg-slate-50 placeholder:text-slate-300"
                              />
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                      type="checkbox"
                                      checked={newTaskRequiresDoc}
                                      onChange={e => setNewTaskRequiresDoc(e.target.checked)}
                                      className="w-4 h-4 rounded accent-primary"
                                  />
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Requiere adjunto</span>
                              </label>
                          </div>
                          <button
                              onClick={addDevolucionTask}
                              disabled={!newTaskTitle.trim()}
                              className="flex items-center gap-1.5 px-5 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed shrink-0 mb-6"
                          >
                              <Plus size={14}/> Agregar
                          </button>
                      </div>
                  </div>

                  {/* Resumen */}
                  {devolucionTasks.length > 0 && (
                      <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
                          <ClipboardList size={16} className="text-red-400 shrink-0"/>
                          <p className="text-xs font-bold text-red-600">
                              {devolucionTasks.length} tarea{devolucionTasks.length !== 1 ? 's' : ''} asignada{devolucionTasks.length !== 1 ? 's' : ''}.
                              El gestor no podrá subsanar hasta completarlas todas.
                          </p>
                      </div>
                  )}

                  <div className="flex gap-4">
                      <button
                          onClick={() => { setShowDevolucionModal(false); setPendingStatus(''); }}
                          className="flex-1 py-5 text-slate-400 font-black uppercase text-[11px] hover:text-slate-600 transition-all tracking-widest"
                      >
                          Cancelar
                      </button>
                      <button
                          onClick={confirmDevolucion}
                          disabled={!devolucionComment.trim()}
                          className="flex-[2] py-5 bg-red-500 text-white font-black rounded-3xl shadow-2xl shadow-red-500/30 disabled:opacity-50 transition-all uppercase text-[11px] tracking-widest hover:bg-red-600 active:scale-95"
                      >
                          Confirmar Devolución
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, label }: any) => (
    <button 
        onClick={onClick} 
        className={`px-8 py-5 font-black text-[11px] uppercase tracking-[0.2em] border-b-4 transition-all shrink-0 ${active ? 'border-primary text-primary bg-primary/5 rounded-t-[1.5rem]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
    >
        {label}
    </button>
);

const EditableItem = ({ label, name, value, isEditing, onChange, type = "text", options }: any) => {
    // Si el valor actual no está en las opciones (ej. ciudad traída por IA no coincide con la BD),
    // lo añadimos temporalmente para que no se pierda al abrir el modo edición.
    const effectiveOptions = options && value
        ? options.some((o: any) => (typeof o === 'object' ? o.value : o) === value)
            ? options
            : [value, ...options]
        : options;

    return (
        <div className={`p-6 rounded-[1.8rem] border-2 transition-all duration-500 ${isEditing ? 'bg-white border-primary/20 shadow-xl scale-[1.02] z-10' : 'bg-white border-slate-50 hover:border-slate-100 hover:shadow-lg'}`}>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3 px-1">{label}</p>
            {isEditing ? (
                effectiveOptions ? (
                    <select
                        name={name}
                        value={value}
                        onChange={onChange}
                        className="w-full text-xs font-bold text-slate-800 bg-white border-2 border-slate-100 rounded-xl p-3 outline-none focus:border-primary shadow-sm"
                    >
                        <option value="">Seleccione...</option>
                        {effectiveOptions.map((o: any) => { const val = typeof o === 'object' ? o.value : o; const lbl = typeof o === 'object' ? o.label : o; return <option key={val} value={val}>{lbl}</option>; })}
                    </select>
                ) : (
                    <input
                        type={type}
                        name={name}
                        value={value || ''}
                        onChange={onChange}
                        className="w-full text-xs font-bold text-slate-800 bg-white border-2 border-slate-100 rounded-xl p-3 outline-none focus:border-primary shadow-sm"
                    />
                )
            ) : (
                <p className="text-sm font-black text-slate-700 truncate px-1" title={value}>{value || '---'}</p>
            )}
        </div>
    );
};
