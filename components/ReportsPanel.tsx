
import React, { useState, useEffect } from 'react';
import { User, ReportFilters } from '../types';
import { MockService } from '../services/mockService';
import { Download, Filter, CheckSquare, Square, Loader2, Calendar, FileText, Smartphone, CreditCard } from 'lucide-react';

const ALL_AVAILABLE_COLUMNS = [
    'fecha_creacion', 'solicitud_numero', 'gestor_nombre', 'gestor_id', 'gestor_telefono',
    'cliente_nombre', 'cliente_documento', 'tipo_documento', 'cliente_celular', 'correo_cliente',
    'direccion_cliente', 'ciudad_residencia', 'barrio', 'estado_civil', 'sexo', 'fecha_nacimiento',
    'pagaduria', 'clave_pagaduria',
    'linea_credito', 'monto', 'monto_desembolso', 'plazo', 'entidad', 'tasa', 'comision_porcentaje', 'comision_estimada',
    'gastos_mensuales', 'activos', 'pasivos', 'patrimonio',
    'tipo_desembolso', 'banco_cliente', 'tipo_cuenta', 'numero_cuenta',
    'ref1_nombre', 'ref1_telefono', 'ref2_nombre', 'ref2_telefono',
    'estado', 'fecha_actualizacion' , 'zona'
];

const DEFAULT_COLUMNS = [
    'fecha_creacion', 'gestor_nombre', 'cliente_nombre', 'cliente_documento', 'cliente_celular',
    'linea_credito', 'monto', 'plazo', 'entidad', 'tasa', 'estado', 'comision_estimada'
];

export const ReportsPanel: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [filters, setFilters] = useState<ReportFilters>({ startDate: '', endDate: '', statusId: '', entity: '' });
    const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_COLUMNS);
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [states, setStates] = useState<any[]>([]);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const load = async () => { setStates(await MockService.getStates()); };
        load();
    }, []);

    const handleDownloadCSV = async () => {
        setIsExporting(true);
        try {
            const csv = await MockService.exportCSV(currentUser, filters, selectedColumns);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte_skala_consolidado_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            alert("Error al exportar. Verifique su conexión con Supabase.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-100 animate-fade-in max-w-6xl mx-auto mb-20">
            <div className="flex justify-between items-center mb-12">
                <div>
                    <h3 className="text-4xl font-extrabold font-display flex items-center gap-3 text-slate-800">
                        <Filter size={40} className="text-primary"/> Inteligencia de Datos
                    </h3>
                    <p className="text-slate-500 mt-2 font-medium">Exportación detallada con trazabilidad de gestores, clientes y comisiones.</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end mb-12 bg-slate-50 p-8 rounded-3xl border border-slate-200">
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest"><Calendar size={14}/> Desde</label>
                    <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="w-full text-sm bg-white text-slate-900 border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"/>
                </div>
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest"><Calendar size={14}/> Hasta</label>
                    <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="w-full text-sm bg-white text-slate-900 border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"/>
                </div>
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest"><FileText size={14}/> Estado</label>
                    <select value={filters.statusId} onChange={e => setFilters({...filters, statusId: e.target.value})} className="w-full text-sm bg-white text-slate-900 border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/20 outline-none shadow-sm cursor-pointer">
                        <option value="">Todos los estados</option>
                        {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <button onClick={handleDownloadCSV} disabled={isExporting} className="flex justify-center items-center space-x-2 px-10 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 shadow-2xl transition-all disabled:opacity-50 transform active:scale-95">
                    {isExporting ? <Loader2 size={24} className="animate-spin"/> : <Download size={24}/>}
                    <span>{isExporting ? 'Generando...' : 'Exportar CSV'}</span>
                </button>
            </div>

            <div className="border-t pt-10">
                <button onClick={() => setShowColumnSelector(!showColumnSelector)} className="text-xs font-bold text-slate-600 hover:text-primary mb-8 flex items-center gap-2 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm transition-all">
                    {showColumnSelector ? "Ocultar Filtros de Columnas" : "Configurar Columnas del Reporte"}
                </button>
                
                {showColumnSelector && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 bg-slate-50 p-8 rounded-3xl border border-slate-200 animate-fade-in shadow-inner max-h-[400px] overflow-y-auto custom-scrollbar">
                        {ALL_AVAILABLE_COLUMNS.map(col => (
                            <div key={col} onClick={() => setSelectedColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-white transition-all select-none border border-transparent hover:border-slate-100">
                                <div className={selectedColumns.includes(col) ? 'text-primary' : 'text-slate-300'}>
                                    {selectedColumns.includes(col) ? <CheckSquare size={20}/> : <Square size={20}/>}
                                </div>
                                <span className="text-[10px] text-slate-700 font-extrabold uppercase truncate tracking-tight">{col.replace(/_/g, ' ')}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
