
import React, { useState, useEffect } from 'react';
import { MockService } from '../services/mockService';
import { N8nConfig, AutomationRule, AUTOMATION_EVENTS, AutomationEvent, AUTOMATION_TYPES, AutomationType } from '../types';
import { Workflow, Save, ToggleLeft, ToggleRight, Plus, X, Trash, Zap, Loader2, Bell, Check, ChevronDown, Pencil, MessageCircle, Mail, BellRing, Link2, Users, UserCheck, BarChart3, Shield } from 'lucide-react';

export const AutomationsPanel = () => {
    const [config, setConfig] = useState<N8nConfig>({ apiKey: '', automations: [] });
    const [msg, setMsg] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingId, setTestingId] = useState<string | null>(null);
    const [creditStates, setCreditStates] = useState<{ id: string; name: string }[]>([]);
    const [dynamicRoles, setDynamicRoles] = useState<{ value: string; label: string }[]>([]);

    // Form State (shared for add & edit)
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<AutomationRule>>({ eventTypes: [], automationType: 'whatsapp', recipients: [], statusFilter: [] });

    useEffect(() => {
        loadConfig();
        loadStates();
        loadRoles();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const data = await MockService.getN8nConfig();
            setConfig(data);
        } catch (err) {
            console.error('Error loading automations:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadStates = async () => {
        try {
            const states = await MockService.getStates();
            setCreditStates((states || []).map((s: any) => ({ id: s.id, name: s.name })));
        } catch (err) {
            console.error('Error loading states:', err);
        }
    };

    const loadRoles = async () => {
        try {
            const roles = await MockService.getRoles();
            const mapped = (roles || []).map((r: any) => ({ value: r.name, label: r.displayName || r.name }));
            // Agregar CLIENTE si no existe como rol (siempre es destinatario válido)
            if (!mapped.find((m: any) => m.value === 'CLIENTE')) {
                mapped.push({ value: 'CLIENTE', label: 'Cliente' });
            }
            setDynamicRoles(mapped);
        } catch (err) {
            console.error('Error loading roles:', err);
        }
    };

    const save = async () => {
        setSaving(true);
        try {
            await MockService.updateN8nConfig(config);
            setMsg('Configuración guardada exitosamente.');
            await loadConfig();
        } catch (err: any) {
            console.error('Error guardando automatizaciones:', err);
            setMsg(err?.message || 'Error al guardar la configuración.');
        } finally {
            setSaving(false);
            setTimeout(() => setMsg(''), 4000);
        }
    };

    const toggleEventType = (eventTypes: AutomationEvent[], ev: AutomationEvent): AutomationEvent[] => {
        if (ev === 'all') return eventTypes.includes('all') ? [] : ['all'];
        const without = eventTypes.filter(e => e !== 'all');
        return without.includes(ev) ? without.filter(e => e !== ev) : [...without, ev];
    };

    const openAddForm = () => {
        setEditingId(null);
        setFormData({ eventTypes: [], automationType: 'whatsapp', recipients: [], statusFilter: [] });
        setIsFormOpen(true);
    };

    const openEditForm = (rule: AutomationRule) => {
        setEditingId(rule.id);
        setFormData({ name: rule.name, description: rule.description, webhookUrl: rule.webhookUrl, eventTypes: [...rule.eventTypes], automationType: rule.automationType || 'webhook', recipients: [...(rule.recipients || [])], statusFilter: [...(rule.statusFilter || [])] });
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingId(null);
        setFormData({ eventTypes: [], automationType: 'whatsapp', recipients: [], statusFilter: [] });
    };

    const toggleRecipient = (recipient: string) => {
        setFormData(prev => {
            const current = prev.recipients || [];
            return { ...prev, recipients: current.includes(recipient) ? current.filter(r => r !== recipient) : [...current, recipient] };
        });
    };

    const toggleStatusFilter = (stateName: string) => {
        setFormData(prev => {
            const current = prev.statusFilter || [];
            return { ...prev, statusFilter: current.includes(stateName) ? current.filter(s => s !== stateName) : [...current, stateName] };
        });
    };

    const showStatusFilter = (formData.eventTypes || []).includes('credit_status_change') || (formData.eventTypes || []).includes('all');

    const handleSubmitForm = () => {
        if (!formData.name || !formData.webhookUrl || !formData.eventTypes || formData.eventTypes.length === 0 || !formData.recipients || formData.recipients.length === 0) return;

        if (editingId) {
            setConfig(prev => ({
                ...prev,
                automations: prev.automations.map(a => a.id === editingId ? {
                    ...a,
                    name: formData.name!,
                    description: formData.description || '',
                    webhookUrl: formData.webhookUrl!,
                    eventTypes: formData.eventTypes!,
                    automationType: formData.automationType || 'webhook',
                    recipients: formData.recipients || [],
                    statusFilter: formData.statusFilter || []
                } : a)
            }));
        } else {
            const rule: AutomationRule = {
                id: crypto.randomUUID(),
                name: formData.name,
                description: formData.description || '',
                webhookUrl: formData.webhookUrl,
                active: true,
                eventTypes: formData.eventTypes,
                automationType: formData.automationType || 'webhook',
                recipients: formData.recipients || [],
                statusFilter: formData.statusFilter || []
            };
            setConfig(prev => ({ ...prev, automations: [...prev.automations, rule] }));
        }
        closeForm();
    };

    const handleDelete = (id: string) => {
        if (confirm('Eliminar automatización?')) {
            setConfig(prev => ({ ...prev, automations: prev.automations.filter(a => a.id !== id) }));
        }
    };

    const toggleActive = (id: string) => {
        setConfig(prev => ({
            ...prev,
            automations: prev.automations.map(a => a.id === id ? { ...a, active: !a.active } : a)
        }));
    };

    const testWebhook = async (id: string, url: string) => {
        setTestingId(id);
        try {
            const success = await MockService.testAutomation(url);
            if (success) {
                setMsg('Webhook respondió correctamente (200 OK).');
            } else {
                setMsg('El webhook respondió con error. Verifica la URL y configuración.');
            }
        } catch (err) {
            setMsg('No se pudo conectar con el webhook. Verifica la URL.');
        } finally {
            setTestingId(null);
            setTimeout(() => setMsg(''), 5000);
        }
    };

    const getEventLabels = (eventTypes: AutomationEvent[]) => {
        if (eventTypes.includes('all')) return ['Todos los eventos'];
        return eventTypes.map(et => AUTOMATION_EVENTS.find(e => e.value === et)?.label || et);
    };

    // Agrupar eventos por categoría
    const eventsByCategory = AUTOMATION_EVENTS.reduce((acc, ev) => {
        if (!acc[ev.category]) acc[ev.category] = [];
        acc[ev.category].push(ev);
        return acc;
    }, {} as Record<string, typeof AUTOMATION_EVENTS>);

    const inputClass = "w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 text-sm transition-all";

    const EventDropdown = ({ selected, onChange }: { selected: AutomationEvent[]; onChange: (types: AutomationEvent[]) => void }) => {
        const [open, setOpen] = useState(false);
        const count = selected.includes('all') ? AUTOMATION_EVENTS.length : selected.length;
        const summary = count === 0 ? 'Seleccionar eventos...' : selected.includes('all') ? 'Todos los eventos' : `${count} evento${count > 1 ? 's' : ''} seleccionado${count > 1 ? 's' : ''}`;

        return (
            <div className="relative">
                <button type="button" onClick={() => setOpen(!open)} className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm transition-all flex items-center justify-between ${open ? 'border-primary ring-2 ring-primary/50' : 'border-slate-300'}`}>
                    <span className={count === 0 ? 'text-slate-400' : 'text-slate-900 font-medium'}>{summary}</span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
                        {/* Select All */}
                        <div onClick={() => onChange(toggleEventType(selected, 'all'))} className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100">
                            <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${selected.includes('all') ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                                {selected.includes('all') && <Check size={10} className="text-white" />}
                            </div>
                            <span className="text-sm font-bold text-slate-700">Todos los eventos</span>
                        </div>

                        {Object.entries(eventsByCategory).map(([category, events]) => (
                            <div key={category}>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-2 pb-1">{category}</p>
                                {events.map(ev => (
                                    <div key={ev.value} onClick={() => onChange(toggleEventType(selected, ev.value))} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                                        <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${selected.includes('all') || selected.includes(ev.value) ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                                            {(selected.includes('all') || selected.includes(ev.value)) && <Check size={10} className="text-white" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm text-slate-700 block">{ev.label}</span>
                                            <span className="text-[10px] text-slate-400 block">{ev.description}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-fade-in max-w-4xl mx-auto flex justify-center py-20">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-fade-in max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold font-display mb-2 flex items-center gap-2">
                <Workflow size={24} className="text-primary" /> Automatizaciones (Webhooks)
            </h3>
            <p className="text-sm text-slate-500 mb-6">Configura webhooks que se disparan automáticamente cuando ocurren eventos en la plataforma. Conecta con n8n, Make, Zapier, o tu API para enviar WhatsApp, emails, etc.</p>

            {/* INFO BOX */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-2"><Bell size={14} /> {AUTOMATION_EVENTS.length} Eventos Disponibles:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                    {Object.entries(eventsByCategory).map(([category, events]) => (
                        <div key={category}>
                            <p className="text-[10px] font-bold text-blue-900 uppercase mt-1">{category}</p>
                            <ul className="text-xs text-blue-700 space-y-0.5 ml-4 list-disc mb-2">
                                {events.map(ev => (
                                    <li key={ev.value}><strong>{ev.label}</strong> — {ev.description}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">API Key Global (Opcional)</label>
                    <input
                        type="password"
                        value={config.apiKey}
                        onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                        className={inputClass}
                        placeholder="Pegar API Key aquí..."
                    />
                </div>

                <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-4">
                    <h4 className="font-bold text-slate-700">Reglas de Automatización ({config.automations.length})</h4>
                    <button onClick={openAddForm} className="text-xs bg-slate-800 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-700 transition-colors shadow-sm">
                        <Plus size={16} /> Nueva Regla
                    </button>
                </div>

                {isFormOpen && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 mb-6 shadow-sm animate-fade-in">
                        <h5 className="font-bold text-slate-800 mb-4 text-sm">{editingId ? 'Editar Automatización' : 'Configurar Nueva Automatización'}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
                                <input
                                    placeholder="Ej: WhatsApp al Gestor"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
                                <input
                                    placeholder="Breve descripción del flujo..."
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className={inputClass}
                                />
                            </div>

                            {/* TIPO DE AUTOMATIZACIÓN */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo de Automatización</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {AUTOMATION_TYPES.map(t => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, automationType: t.value })}
                                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${formData.automationType === t.value ? 'border-primary bg-orange-50 text-primary' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
                                        >
                                            <span className="text-base">{t.icon}</span>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* EVENTO */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Evento que Dispara la Automatización</label>
                                <EventDropdown
                                    selected={formData.eventTypes || []}
                                    onChange={types => setFormData({ ...formData, eventTypes: types })}
                                />
                            </div>

                            {/* DESTINATARIOS */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Destinatarios (¿A quién va dirigido?)</label>
                                <div className="flex flex-wrap gap-2">
                                    {dynamicRoles.map(r => (
                                        <button
                                            key={r.value}
                                            type="button"
                                            onClick={() => toggleRecipient(r.value)}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${(formData.recipients || []).includes(r.value) ? 'border-primary bg-orange-50 text-primary' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
                                        >
                                            <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${(formData.recipients || []).includes(r.value) ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                                                {(formData.recipients || []).includes(r.value) && <Check size={10} className="text-white" />}
                                            </div>
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                                {formData.recipients && formData.recipients.length === 0 && <p className="text-[10px] text-red-400 mt-1 font-medium">Selecciona al menos un destinatario</p>}
                            </div>

                            {/* FILTRO POR ESTADO (solo si credit_status_change está seleccionado) */}
                            {showStatusFilter && creditStates.length > 0 && (
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Filtrar por Estado (opcional)</label>
                                    <p className="text-[10px] text-slate-400 mb-2">Solo disparar cuando el crédito cambie a estos estados. Si no seleccionas ninguno, se dispara en todos los cambios.</p>
                                    <div className="flex flex-wrap gap-2">
                                        {creditStates.map(s => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => toggleStatusFilter(s.name)}
                                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${(formData.statusFilter || []).includes(s.name) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
                                            >
                                                <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${(formData.statusFilter || []).includes(s.name) ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                                                    {(formData.statusFilter || []).includes(s.name) && <Check size={10} className="text-white" />}
                                                </div>
                                                {s.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* WEBHOOK URL */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Webhook URL</label>
                                <input
                                    placeholder="https://tu-dominio.n8n.cloud/webhook/..."
                                    value={formData.webhookUrl || ''}
                                    onChange={e => setFormData({ ...formData, webhookUrl: e.target.value })}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={closeForm} className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50">Cancelar</button>
                            <button
                                onClick={handleSubmitForm}
                                disabled={!formData.name || !formData.webhookUrl || !formData.eventTypes?.length || !formData.recipients?.length}
                                className="px-6 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-orange-700 shadow-md disabled:opacity-50"
                            >
                                {editingId ? 'Guardar Cambios' : 'Agregar Regla'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {config.automations.length === 0 && !isFormOpen && <p className="text-center text-sm text-slate-400 py-8 bg-white/50 rounded-xl border border-dashed border-slate-300">No hay automatizaciones configuradas aún.</p>}

                    {config.automations.map(auto => {
                        const typeInfo = AUTOMATION_TYPES.find(t => t.value === auto.automationType);
                        return (
                        <div key={auto.id} className={`bg-white p-4 rounded-xl border shadow-sm transition-all hover:shadow-md group ${editingId === auto.id ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0 mr-4">
                                    {typeInfo && <span className="text-base" title={typeInfo.label}>{typeInfo.icon}</span>}
                                    <h5 className="font-bold text-sm text-slate-800 truncate">{auto.name}</h5>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${auto.active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                        {auto.active ? 'ACTIVO' : 'INACTIVO'}
                                    </span>
                                    {typeInfo && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold">{typeInfo.label}</span>}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => openEditForm(auto)} className="p-2 text-slate-400 hover:text-primary hover:bg-orange-50 rounded-lg transition-colors" title="Editar"><Pencil size={16} /></button>
                                    <button onClick={() => testWebhook(auto.id, auto.webhookUrl)} disabled={testingId === auto.id} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50" title="Probar Webhook">
                                        {testingId === auto.id ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                                    </button>
                                    <button onClick={() => toggleActive(auto.id)} className="p-2 rounded-lg hover:bg-slate-50 transition-colors" title={auto.active ? "Desactivar" : "Activar"}>
                                        {auto.active ? <ToggleRight size={28} className="text-green-500" /> : <ToggleLeft size={28} className="text-slate-300" />}
                                    </button>
                                    <button onClick={() => handleDelete(auto.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar"><Trash size={18} /></button>
                                </div>
                            </div>
                            {auto.description && <p className="text-xs text-slate-500 mb-2 line-clamp-1">{auto.description}</p>}
                            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit max-w-full mb-2">
                                <span className="text-[10px] font-bold text-slate-400">POST</span>
                                <p className="text-[10px] text-slate-500 font-mono truncate max-w-[200px] sm:max-w-md">{auto.webhookUrl}</p>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-1.5">
                                {getEventLabels(auto.eventTypes).map((label, i) => (
                                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">{label}</span>
                                ))}
                            </div>
                            {auto.recipients && auto.recipients.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    <span className="text-[10px] font-bold text-slate-400 mr-1 self-center">PARA:</span>
                                    {auto.recipients.map(r => (
                                        <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-bold">
                                            {dynamicRoles.find(ar => ar.value === r)?.label || r}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {auto.statusFilter && auto.statusFilter.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    <span className="text-[10px] font-bold text-slate-400 mr-1 self-center">SOLO EN:</span>
                                    {auto.statusFilter.map(s => (
                                        <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold">{s}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                        );
                    })}
                </div>

                {msg && (
                    <p className={`text-sm font-bold mt-6 text-center p-3 rounded-xl border ${msg.includes('error') || msg.includes('Error') ? 'text-red-600 bg-red-50 border-red-100' : 'text-green-600 bg-green-50 border-green-100'}`}>
                        {msg}
                    </p>
                )}

                <div className="mt-8 flex justify-end border-t border-slate-200 pt-4">
                    <button onClick={save} disabled={saving} className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50">
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {saving ? 'Guardando...' : 'Guardar Configuración'}
                    </button>
                </div>
            </div>
        </div>
    );
};
