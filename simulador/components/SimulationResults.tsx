
import React, { useState, useRef } from 'react';
import { AnalysisResult, SimulationResult, ProductType, LoanConfiguration, PaymentMethod, ClientData } from '../types';
import { AdBanner } from './AdBanner';
import { calculateDisbursement } from '../services/calculatorService';
import { analyzeCedulaDocument, CedulaImage } from '../services/geminiService';

interface SimulationResultsProps {
  analysis: AnalysisResult;
  config: LoanConfiguration;
  simulations: SimulationResult[];
  onReset: () => void;
  onReconfigure: () => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  clientData: ClientData | null;
  onClientDataChange: (data: ClientData | null) => void;
  onCedulaFilesChange?: (front: File | null, back: File | null) => void;
  onSimulationSelect?: (idx: number) => void;
}

export const SimulationResults: React.FC<SimulationResultsProps> = ({
  analysis,
  config,
  simulations,
  onReset,
  onReconfigure,
  paymentMethod,
  onPaymentMethodChange,
  clientData,
  onClientDataChange,
  onCedulaFilesChange,
  onSimulationSelect,
}) => {
  const [isCedulaLoading, setIsCedulaLoading] = useState(false);
  const [cedulaError, setCedulaError] = useState<string | null>(null);
  const [selectedSimulations, setSelectedSimulations] = useState<Set<number>>(new Set());
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  const frontGalleryRef = useRef<HTMLInputElement>(null);
  const frontCameraRef = useRef<HTMLInputElement>(null);
  const backGalleryRef = useRef<HTMLInputElement>(null);
  const backCameraRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const toggleSimulation = (idx: number) => {
    if (!simulations[idx].isViable) return;
    const next = new Set(selectedSimulations);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedSimulations(next);
    onSimulationSelect?.(idx);
  };

  const getCardStyles = (product: ProductType) => {
    switch (product) {
      case ProductType.ORO:
        return { gradient: "bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700", textColor: "text-white", accentColor: "text-amber-100", borderColor: "border-amber-400", shadowColor: "shadow-amber-500/30", shine: "bg-white/20", disburseBg: "bg-black/20", selectedRing: "ring-amber-200" };
      case ProductType.PLATINO:
        return { gradient: "bg-gradient-to-br from-slate-300 via-slate-400 to-slate-600", textColor: "text-white", accentColor: "text-slate-100", borderColor: "border-slate-300", shadowColor: "shadow-slate-400/30", shine: "bg-white/20", disburseBg: "bg-black/15", selectedRing: "ring-slate-200" };
      case ProductType.ZAFIRO:
        return { gradient: "bg-gradient-to-br from-blue-500 via-blue-700 to-blue-900", textColor: "text-white", accentColor: "text-blue-200", borderColor: "border-blue-500", shadowColor: "shadow-blue-600/30", shine: "bg-white/10", disburseBg: "bg-black/20", selectedRing: "ring-blue-200" };
      case ProductType.LIBRE_INVERSION:
        return { gradient: "bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800", textColor: "text-white", accentColor: "text-emerald-100", borderColor: "border-emerald-400", shadowColor: "shadow-emerald-500/30", shine: "bg-white/15", disburseBg: "bg-black/20", selectedRing: "ring-emerald-200" };
      case ProductType.COMPRA_CARTERA:
        return { gradient: "bg-gradient-to-br from-indigo-400 via-indigo-600 to-indigo-800", textColor: "text-white", accentColor: "text-indigo-100", borderColor: "border-indigo-400", shadowColor: "shadow-indigo-500/30", shine: "bg-white/15", disburseBg: "bg-black/20", selectedRing: "ring-indigo-200" };
      default:
        return { gradient: "bg-gradient-to-br from-slate-700 to-slate-900", textColor: "text-white", accentColor: "text-slate-400", borderColor: "border-slate-800", shadowColor: "shadow-slate-900/20", shine: "bg-white/5", disburseBg: "bg-black/20", selectedRing: "ring-slate-200" };
    }
  };

  const readFileAsBase64 = (file: File): Promise<CedulaImage> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve({ base64: result.split(',')[1], mimeType: file.type });
      };
      reader.onerror = () => reject(new Error('Error leyendo el archivo.'));
      reader.readAsDataURL(file);
    });
  };

  const handleSideFile = (side: 'front' | 'back', file: File) => {
    const previewUrl = URL.createObjectURL(file);
    if (side === 'front') {
      setFrontFile(file);
      if (frontPreview) URL.revokeObjectURL(frontPreview);
      setFrontPreview(previewUrl);
      onCedulaFilesChange?.(file, backFile);
    } else {
      setBackFile(file);
      if (backPreview) URL.revokeObjectURL(backPreview);
      setBackPreview(previewUrl);
      onCedulaFilesChange?.(frontFile, file);
    }
    onClientDataChange(null);
    setCedulaError(null);
  };

  const handleAnalyzeCedula = async () => {
    if (!frontFile && !backFile) return;
    setCedulaError(null);
    setIsCedulaLoading(true);
    onClientDataChange(null);
    try {
      const images: CedulaImage[] = [];
      if (frontFile) images.push(await readFileAsBase64(frontFile));
      if (backFile) images.push(await readFileAsBase64(backFile));
      const data = await analyzeCedulaDocument(images);

      // Detectar cédula ilegible — campos críticos vacíos
      const hasData = data.fullName || data.idNumber || data.firstName || data.lastName;
      if (!hasData) {
        setCedulaError('ILEGIBLE');
        return;
      }

      onClientDataChange(data);
    } catch (err: any) {
      setCedulaError(err.message || 'Error procesando la cédula.');
    } finally {
      setIsCedulaLoading(false);
    }
  };

  const handleExport = () => {
    const toExport = selectedSimulations.size > 0
      ? simulations.filter((_, i) => selectedSimulations.has(i))
      : simulations.filter(s => s.isViable);

    const fmt = (val: number) =>
      new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

    const clientSection = clientData ? `
      <section>
        <h2>Datos del Cliente</h2>
        <table>
          <tr><th>Nombre Completo</th><td>${clientData.fullName}</td><th>N° Cédula</th><td>${clientData.idNumber}</td></tr>
          <tr><th>Nombre(s)</th><td>${clientData.firstName}</td><th>Apellido(s)</th><td>${clientData.lastName}</td></tr>
          <tr><th>Sexo</th><td>${clientData.sex || '—'}</td><th>Fecha de Nacimiento</th><td>${clientData.birthDate} — ${clientData.birthCity}</td></tr>
          <tr><th>Fecha Expedición</th><td>${clientData.expeditionDate}</td><th>Ciudad Expedición</th><td>${clientData.expeditionCity}</td></tr>
        </table>
      </section>` : '';

    const deductionRows = analysis.detailedDeductions?.map(d =>
      `<tr><td>${d.name}</td><td style="text-align:right">${fmt(d.amount)}</td></tr>`
    ).join('') || '';

    const offersHtml = toExport.map(sim => {
      const disbursement = calculateDisbursement(sim.maxAmount, sim.discountPct, paymentMethod);
      const seguroAval = Math.floor(sim.maxAmount * (sim.discountPct / 100));
      const base = sim.maxAmount - seguroAval;
      const cuatroXMil = Math.floor(base * 0.004);
      const gastos = paymentMethod === 'efectivo' ? config.cashFee : config.bankFee;
      return `
        <div class="offer-card">
          <div class="offer-title">${sim.product}</div>
          <table>
            <tr><th>Monto Aprobado</th><td>${fmt(sim.maxAmount)}</td></tr>
            ${sim.discountPct > 0 ? `
            <tr><th>Seg. y Aval (${sim.discountPct}%)</th><td class="negative">− ${fmt(seguroAval)}</td></tr>
            <tr><th>4×1000</th><td class="negative">− ${fmt(cuatroXMil)}</td></tr>
            <tr><th>Gastos retiro</th><td class="negative">− ${fmt(gastos)}</td></tr>
            <tr class="highlight"><th>A Desembolsar</th><td>${fmt(disbursement)}</td></tr>
            ` : ''}
            <tr><th>Tasa M.V.</th><td>${sim.rate}%</td></tr>
            <tr><th>Plazo</th><td>${sim.term} meses</td></tr>
            <tr><th>Factor FPM</th><td>${sim.fpmUsed}</td></tr>
          </table>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simulación Libranza — ${clientData?.fullName || config.entityName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; padding: 32px; max-width: 960px; margin: 0 auto; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e293b; padding-bottom: 16px; margin-bottom: 24px; }
    .header-title { font-size: 24px; font-weight: 800; }
    .header-sub { color: #64748b; font-size: 13px; margin-top: 4px; }
    .header-date { font-size: 12px; color: #64748b; text-align: right; }
    h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin: 24px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 4px; }
    td, th { padding: 6px 10px; border: 1px solid #e2e8f0; text-align: left; }
    th { background: #f8fafc; font-weight: 600; color: #475569; }
    .highlight td, .highlight th { background: #f0fdf4; font-weight: 800; color: #166534; }
    .negative { color: #dc2626; }
    .offers { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-top: 8px; }
    .offer-card { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
    .offer-title { background: #1e293b; color: white; font-weight: 800; font-size: 14px; padding: 10px 14px; }
    .offer-card table td, .offer-card table th { font-size: 12px; }
    .footer { margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; }
    .print-btn { position: fixed; top: 16px; right: 16px; background: #1e293b; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; }
    .deductions-sub { font-size: 11px; color: #64748b; font-style: italic; padding-left: 20px; }
    @media print { .print-btn { display: none; } body { padding: 16px; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>

  <div class="header">
    <div>
      <div class="header-title">Simulación de Libranza</div>
      <div class="header-sub">${config.entityName} — ${config.termMonths} meses — Entrega: ${paymentMethod === 'efectivo' ? 'Retiro en Efectivo' : 'Cuenta Bancaria'}</div>
    </div>
    <div class="header-date">
      ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}<br>
      <span style="font-size:11px">LibranzaExacta Pro</span>
    </div>
  </div>

  ${clientSection}

  <section>
    <h2>Análisis de Capacidad (${analysis.entityType === 'CREMIL' ? 'CREMIL — Ley especial' : 'Ley 1527'})</h2>
    <table>
      <tr><th style="width:40%">${analysis.entityType === 'CREMIL' ? 'Salario Bruto' : 'Ingreso Mensual'}</th><td>${fmt(analysis.rawIncome)}</td><th style="width:25%">Cupo Legal (50%)</th><td>${fmt(analysis.legalCapacity)}</td></tr>
      ${analysis.entityType !== 'CREMIL' ? `<tr><th>Ded. Ley (Salud/Pensión)</th><td class="negative">− ${fmt(analysis.mandatory)}</td><th>Otros Descuentos</th><td class="negative">− ${fmt(analysis.others)}</td></tr>` : `<tr><th>Otros Descuentos</th><td class="negative">− ${fmt(analysis.others)}</td><th>Embargos</th><td class="negative">− ${fmt(analysis.embargos)}</td></tr>`}
      <tr class="highlight"><th colspan="3">Cupo Disponible</th><td>${fmt(analysis.availableQuota)}</td></tr>
    </table>
    ${deductionRows ? `<table style="margin-top:8px"><tr><th colspan="2" style="background:#fef9c3;color:#854d0e">Detalle Descuentos en Nómina</th></tr>${deductionRows}</table>` : ''}
  </section>

  ${config.carteraItems && config.carteraItems.length > 0 ? `
  <section>
    <h2>Carteras a Recoger</h2>
    <table>
      <tr><th style="width:60%">Entidad</th><th style="text-align:right">Cuota Mensual</th></tr>
      ${config.carteraItems.map(c => `<tr><td>${c.entity}</td><td style="text-align:right;font-weight:bold">${fmt(c.amount)}</td></tr>`).join('')}
      <tr class="highlight"><th>Total Compra de Cartera</th><td style="text-align:right">${fmt(config.carteraItems.reduce((s, c) => s + c.amount, 0))}</td></tr>
    </table>
  </section>` : ''}

  <section>
    <h2>Ofertas Seleccionadas (${toExport.length})</h2>
    <div class="offers">
      ${offersHtml}
    </div>
  </section>

  <div class="footer">Generado por LibranzaExacta Pro · ${new Date().toLocaleString('es-CO')} · Solo para uso interno del asesor</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const viableCount = simulations.filter(s => s.isViable).length;
  const selectedCount = selectedSimulations.size;

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* Summary Header */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-slate-200 pb-6 gap-6">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Simulación Completada</span>
              <span className="text-slate-400 text-xs font-mono">{new Date().toLocaleDateString()}</span>
           </div>
           <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">{config.entityName}</h1>
           <p className="text-slate-500 mt-1 flex items-center gap-2">
             <span className="font-bold text-slate-700">{config.termMonths} Meses</span>
             <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
             <span>Colchón: {formatCurrency(config.safetyCushion)}</span>
           </p>
        </div>
        <div className="text-right">
           <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Cupo Base Utilizado</p>
           <p className="text-2xl font-mono font-bold text-slate-700 bg-slate-100 px-4 py-2 rounded-lg inline-block">
             {formatCurrency(Math.max(0, analysis.availableQuota - config.safetyCushion))}
           </p>
        </div>
      </div>

      {/* Payment Method Selector */}
      <div className="flex items-center justify-center gap-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Forma de Entrega:</p>
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          <button
            onClick={() => onPaymentMethodChange('bancaria')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${paymentMethod === 'bancaria' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Cuenta Bancaria
          </button>
          <button
            onClick={() => onPaymentMethodChange('efectivo')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${paymentMethod === 'efectivo' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Retiro en Efectivo
          </button>
        </div>
      </div>

      {/* Cards */}
      <div>
        {simulations.length > 0 ? (
          <>
            {/* Selection hint */}
            <div className="flex items-center justify-between mb-4 px-1">
              <p className="text-xs text-slate-400">
                {viableCount > 0 ? (
                  selectedCount > 0
                    ? <span><span className="font-bold text-slate-700">{selectedCount}</span> de {viableCount} oferta{viableCount > 1 ? 's' : ''} seleccionada{selectedCount > 1 ? 's' : ''} para exportar</span>
                    : <span>Toca una tarjeta para seleccionarla al exportar</span>
                ) : null}
              </p>
              {selectedCount > 0 && (
                <button onClick={() => setSelectedSimulations(new Set())} className="text-xs text-slate-400 hover:text-slate-700 underline underline-offset-2">
                  Limpiar selección
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {simulations.map((sim, idx) => {
                const styles = getCardStyles(sim.product);
                const disbursement = calculateDisbursement(sim.maxAmount, sim.discountPct, paymentMethod);
                const seguroAval = Math.floor(sim.maxAmount * (sim.discountPct / 100));
                const base = sim.maxAmount - seguroAval;
                const cuatroXMil = Math.floor(base * 0.004);
                const gastos = paymentMethod === 'efectivo' ? config.cashFee : config.bankFee;
                const isSelected = selectedSimulations.has(idx);

                return (
                  <div
                    key={`${sim.product}-${idx}`}
                    onClick={() => toggleSimulation(idx)}
                    className={`relative rounded-2xl p-6 ${styles.gradient} ${styles.shadowColor} shadow-2xl border-t ${styles.borderColor} flex flex-col justify-between h-auto transform transition-all duration-300 group overflow-hidden
                      ${sim.isViable ? 'cursor-pointer' : ''}
                      ${isSelected
                        ? `scale-105 -translate-y-2 ring-4 ring-white ring-offset-2`
                        : sim.isViable ? 'hover:scale-105 hover:-translate-y-2' : ''
                      }`}
                  >
                    {/* Shine */}
                    <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full ${styles.shine} blur-3xl`}></div>

                    {/* Selection checkmark */}
                    {isSelected && (
                      <div className="absolute top-3 left-3 z-30 bg-white rounded-full p-1 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-600">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}

                    {/* Card Header */}
                    <div className="relative z-10 flex justify-between items-start mb-4">
                       <div className="max-w-[75%]">
                         <p className={`text-xs font-bold uppercase tracking-widest ${styles.accentColor} opacity-90 truncate`}>{config.entityName}</p>
                         <h3 className={`text-2xl font-bold tracking-tight ${styles.textColor} mt-1 leading-none`}>{sim.product}</h3>
                       </div>
                       <div className="opacity-80 flex-shrink-0 ml-2">
                         <div className="w-10 h-7 rounded-md bg-gradient-to-r from-yellow-200 to-yellow-500 border border-yellow-600/30 relative overflow-hidden shadow-sm">
                            <div className="absolute top-1/2 left-0 w-full h-px bg-yellow-600/50"></div>
                            <div className="absolute left-1/2 top-0 h-full w-px bg-yellow-600/50"></div>
                         </div>
                       </div>
                    </div>

                    {/* Monto Aprobado */}
                    <div className="relative z-10 flex-grow flex flex-col justify-center mb-4">
                       <p className={`text-[10px] uppercase font-bold ${styles.accentColor} mb-1`}>Monto Aprobado</p>
                       <p className={`text-3xl font-mono font-extrabold ${styles.textColor} tracking-tight break-words leading-tight`}>
                         {formatCurrency(sim.maxAmount)}
                       </p>
                    </div>

                    {/* Desglose Desembolso */}
                    {sim.discountPct > 0 && (
                      <div className={`relative z-10 rounded-xl p-3 mb-4 ${styles.disburseBg} space-y-1`}>
                        <div className={`flex justify-between text-[10px] ${styles.accentColor}`}>
                          <span>Seg. y Aval ({sim.discountPct}%)</span>
                          <span>- {formatCurrency(seguroAval)}</span>
                        </div>
                        <div className={`flex justify-between text-[10px] ${styles.accentColor}`}>
                          <span>4×1000</span>
                          <span>- {formatCurrency(cuatroXMil)}</span>
                        </div>
                        <div className={`flex justify-between text-[10px] ${styles.accentColor}`}>
                          <span>Gastos retiro</span>
                          <span>- {formatCurrency(gastos)}</span>
                        </div>
                        <div className={`flex justify-between text-xs font-extrabold ${styles.textColor} border-t border-white/20 pt-1 mt-1`}>
                          <span>A DESEMBOLSAR</span>
                          <span>{formatCurrency(disbursement)}</span>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="relative z-10 border-t border-white/10 pt-4 space-y-2">
                       <div className="flex justify-between items-center">
                          <div>
                            <p className={`text-[10px] uppercase ${styles.accentColor}`}>Tasa M.V.</p>
                            <p className={`font-mono font-bold ${styles.textColor}`}>{sim.rate}%</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-[10px] uppercase ${styles.accentColor}`}>Factor</p>
                            <p className={`font-mono font-bold ${styles.textColor}`}>{sim.fpmUsed}</p>
                          </div>
                       </div>
                       {sim.commissionPct != null && sim.commissionPct > 0 && (
                         <div className="bg-white/10 rounded-lg px-3 py-2 flex justify-between items-center">
                           <span className={`text-[10px] font-bold uppercase ${styles.accentColor}`}>Comisión Gestor</span>
                           <span className={`font-mono font-bold text-sm ${styles.textColor}`}>
                             {sim.commissionPct}% = {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Math.floor(sim.maxAmount * sim.commissionPct / 100))}
                           </span>
                         </div>
                       )}
                    </div>

                    {!sim.isViable && (
                       <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-20 flex items-center justify-center">
                          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-2 rounded-lg font-bold backdrop-blur-md">
                             Monto Insuficiente
                          </div>
                       </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center p-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
               </svg>
             </div>
             <h3 className="text-xl font-bold text-slate-900">Sin productos disponibles</h3>
             <p className="text-slate-500 mt-2 max-w-md mx-auto">
               No se encontraron factores configurados para <span className="font-bold text-slate-700">{config.entityName}</span> a <span className="font-bold text-slate-700">{config.termMonths} meses</span>.
             </p>
          </div>
        )}
      </div>

      {/* Sección Cédula */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-5">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="font-bold text-lg text-slate-900">Datos del Cliente</h3>
          <p className="text-xs text-slate-400 mt-0.5">Sube ambas caras de la cédula para extraer todos los datos con IA</p>
        </div>

        {/* ── Nota: cómo tomar buena foto ── */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2">📸 Consejos para una buena captura</p>
          <ul className="space-y-1 text-xs text-blue-800">
            <li className="flex items-start gap-1.5"><span className="mt-0.5">✅</span> Coloca la cédula sobre una superficie plana y oscura</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5">✅</span> Asegúrate de que los 4 bordes estén visibles y sin cortar</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5">✅</span> Buena iluminación — sin reflejos ni sombras sobre el texto</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5">✅</span> Mantén la cámara quieta para evitar desenfoque</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5">⚠️</span> Después de leer, <strong>verifica que los datos extraídos sean correctos</strong></li>
          </ul>
        </div>

        {/* Two-sided upload */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(['front', 'back'] as const).map((side) => {
            const isFront = side === 'front';
            const preview = isFront ? frontPreview : backPreview;
            const file   = isFront ? frontFile   : backFile;
            const galleryRef = isFront ? frontGalleryRef : backGalleryRef;
            const cameraRef  = isFront ? frontCameraRef  : backCameraRef;
            const label = isFront ? 'Cara Frontal' : 'Cara Posterior';
            const hint  = isFront ? 'Nombre, número, sexo, nacimiento' : 'Fecha y ciudad de expedición';

            return (
              <div key={side} className={`rounded-xl border-2 transition-all overflow-hidden ${preview ? 'border-green-400' : 'border-dashed border-slate-200 bg-slate-50'}`}>
                {/* Header */}
                <div className={`px-3 py-2.5 flex items-center justify-between ${preview ? 'bg-green-50 border-b border-green-200' : 'border-b border-slate-100'}`}>
                  <div>
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">{label}</p>
                    <p className="text-[10px] text-slate-400">{hint}</p>
                  </div>
                  {preview
                    ? <span className="text-[9px] font-black text-green-600 bg-green-100 px-2 py-1 rounded-full">✓ CARGADA</span>
                    : <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Pendiente</span>
                  }
                </div>

                {/* Preview area — más grande y clicable */}
                <div className="relative h-40 overflow-hidden bg-slate-100 cursor-pointer group"
                     onClick={() => !isCedulaLoading && (preview ? cameraRef.current?.click() : galleryRef.current?.click())}>
                  {preview ? (
                    <>
                      <img src={preview} alt={label} className="w-full h-full object-contain bg-slate-800" />
                      {/* Overlay al hacer hover: "Volver a tomar" */}
                      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-7 h-7">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        <span className="text-white text-xs font-bold">Volver a tomar</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                      </svg>
                      <p className="text-[11px] font-bold">Toca para subir foto</p>
                    </div>
                  )}
                </div>

                {/* Botones siempre visibles */}
                <div className="p-2.5 flex gap-2 border-t border-slate-100">
                  <button onClick={() => galleryRef.current?.click()} disabled={isCedulaLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-[11px] font-bold transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
                    </svg>
                    {file ? 'Cambiar' : 'Galería'}
                  </button>
                  <button onClick={() => cameraRef.current?.click()} disabled={isCedulaLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white py-2 rounded-lg text-[11px] font-bold transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                    {file ? 'Retomar' : 'Cámara'}
                  </button>
                </div>

                {/* Hidden inputs */}
                <input ref={galleryRef} type="file" accept="image/*,.pdf,application/pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleSideFile(side, f); e.target.value = ''; }} />
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleSideFile(side, f); e.target.value = ''; }} />
              </div>
            );
          })}
        </div>

        {/* Analyze button */}
        {(frontFile || backFile) && !clientData && (
          <button
            onClick={handleAnalyzeCedula}
            disabled={isCedulaLoading}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-60 shadow-md"
          >
            {isCedulaLoading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Analizando cédula con IA... espera un momento
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Leer Cédula con IA {!frontFile || !backFile ? '(1 cara — recomendamos subir ambas)' : '(ambas caras)'}
              </>
            )}
          </button>
        )}

        {/* Error — ilegible o genérico */}
        {cedulaError && (
          cedulaError === 'ILEGIBLE' ? (
            <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 space-y-2">
              <p className="text-sm font-black text-orange-800">📷 La cédula es ilegible — vuelve a tomar la foto</p>
              <ul className="text-xs text-orange-700 space-y-1">
                <li>• La imagen está borrosa, muy oscura o con reflejos</li>
                <li>• Intenta en un lugar bien iluminado sin luz directa sobre el documento</li>
                <li>• Asegúrate de que todos los textos sean legibles antes de analizar</li>
                <li>• Puedes ampliar la foto arriba para verificar la calidad antes de continuar</li>
              </ul>
              <button onClick={() => setCedulaError(null)} className="mt-1 text-[10px] text-orange-600 font-bold underline underline-offset-2">
                Entendido — volver a intentar
              </button>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              {cedulaError}
            </div>
          )
        )}

        {/* Datos extraídos — editables */}
        {clientData && (
          <div className="space-y-4">
            {/* Banner de verificación */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-start gap-3">
              <span className="text-lg mt-0.5">⚠️</span>
              <div>
                <p className="text-xs font-black text-amber-800 uppercase tracking-wide">Verifica y corrige los datos si es necesario</p>
                <p className="text-xs text-amber-700 mt-0.5">Puedes editar cualquier campo directamente si la IA no lo leyó correctamente.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { label: 'Nombre(s)', key: 'firstName' },
                { label: 'Apellido(s)', key: 'lastName' },
                { label: 'N° Identificación', key: 'idNumber' },
                { label: 'Nombre Completo', key: 'fullName' },
                { label: 'Sexo', key: 'sex' },
                { label: 'Fecha de Nacimiento', key: 'birthDate' },
                { label: 'Ciudad de Nacimiento', key: 'birthCity' },
                { label: 'Fecha de Expedición', key: 'expeditionDate' },
                { label: 'Ciudad de Expedición', key: 'expeditionCity' },
              ] as { label: string; key: keyof ClientData }[]).map(({ label, key }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{label}</label>
                  <input
                    type="text"
                    value={clientData[key] || ''}
                    onChange={e => onClientDataChange({ ...clientData, [key]: e.target.value })}
                    placeholder={`Ingresa ${label.toLowerCase()}`}
                    className={`w-full px-3 py-2 rounded-lg border text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all ${
                      clientData[key] ? 'border-slate-200 bg-white' : 'border-red-300 bg-red-50 placeholder-red-400'
                    }`}
                  />
                </div>
              ))}
              <div className="sm:col-span-2 pt-1 flex items-center gap-4">
                <button onClick={() => { onClientDataChange(null); setCedulaError(null); }}
                  className="text-xs text-slate-500 hover:text-red-600 font-bold border border-slate-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-all">
                  🔄 Volver a leer cédula
                </button>
                <p className="text-[10px] text-slate-400">Ajusta los datos si hay errores y luego continúa.</p>
              </div>
            </div>
          </div>
        )}

        {!isCedulaLoading && !frontFile && !backFile && !clientData && (
          <div className="text-center py-4 text-slate-400">
            <p className="text-sm">Sube las fotos de la cédula usando los botones de arriba</p>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={onReconfigure}
            className="text-slate-500 hover:text-primary-600 font-bold text-sm px-5 py-3 transition-colors flex items-center gap-2 flex-1 sm:flex-none justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Ajustar
          </button>
          <button
            onClick={onReset}
            className="bg-slate-200 text-slate-700 px-5 py-3 rounded-xl font-bold hover:bg-slate-300 transition-all flex items-center gap-2 flex-1 sm:flex-none justify-center text-sm"
          >
            Nueva Simulación
          </button>
        </div>

        {/* Export button */}
        <button
          onClick={handleExport}
          className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold shadow-xl shadow-primary-600/20 hover:bg-primary-700 hover:shadow-2xl hover:-translate-y-0.5 transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Exportar{selectedCount > 0 ? ` (${selectedCount})` : ' Todo'}
        </button>
      </div>
    </div>
  );
};
