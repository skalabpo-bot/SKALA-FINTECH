
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Database, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

// Cliente del DB VIEJO del simulador (solo para leer)
const OLD_URL = 'https://qyjrqbodkxwcxoxvqdqz.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5anJxYm9ka3h3Y3hveHZxZHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MjUyODMsImV4cCI6MjA4NjMwMTI4M30.-1_j-6vEMM8iJAtJVarVIGP9-ATdoGYITM5VoHSVXuI';
const oldSupabase = createClient(OLD_URL, OLD_KEY);

interface MigrationLog {
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

export const SimuladorMigrationPanel: React.FC = () => {
  const [logs, setLogs] = useState<MigrationLog[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const addLog = (type: MigrationLog['type'], message: string) => {
    setLogs(prev => [...prev, { type, message }]);
  };

  const runMigration = async () => {
    setRunning(true);
    setDone(false);
    setLogs([]);

    try {
      // ── 1. Leer entidades del DB viejo ──────────────────────────────
      addLog('info', 'Leyendo entidades del DB del simulador...');
      const { data: oldEntities, error: eErr } = await oldSupabase
        .from('financial_entities')
        .select('*')
        .order('name');

      if (eErr) {
        addLog('error', `Error leyendo entidades: ${eErr.message}`);
      } else {
        addLog('info', `Encontradas ${oldEntities?.length ?? 0} entidades.`);

        let inserted = 0, skipped = 0;
        for (const ent of (oldEntities || [])) {
          const payload = {
            name: ent.name,
            logo_url: ent.logo_url,
            primary_color: ent.primary_color,
            secondary_color: ent.secondary_color,
            cash_fee: ent.cash_fee,
            bank_fee: ent.bank_fee,
            is_active: true,
          };
          const { error } = await supabase
            .from('financial_entities')
            .insert(payload);

          if (error) {
            if (error.code === '23505') { // unique violation
              skipped++;
              addLog('warning', `Entidad "${ent.name}" ya existe, omitida.`);
            } else {
              addLog('error', `Error insertando "${ent.name}": ${error.message}`);
            }
          } else {
            inserted++;
            addLog('success', `Entidad "${ent.name}" migrada.`);
          }
        }
        addLog('info', `Entidades: ${inserted} migradas, ${skipped} omitidas.`);
      }

      // ── 2. Leer factores FPM del DB viejo ───────────────────────────
      addLog('info', 'Leyendo factores FPM del DB del simulador...');
      const { data: oldFpms, error: fErr } = await oldSupabase
        .from('fpm_factors')
        .select('*');

      if (fErr) {
        addLog('error', `Error leyendo FPM: ${fErr.message}`);
      } else {
        addLog('info', `Encontrados ${oldFpms?.length ?? 0} factores FPM.`);

        if (oldFpms && oldFpms.length > 0) {
          // Verificar si ya hay FPM en el nuevo DB para evitar duplicados
          const { data: existingFpms } = await supabase
            .from('fpm_factors')
            .select('entity_name, product, term_months');

          const existingKeys = new Set(
            (existingFpms || []).map((f: any) => `${f.entity_name}|${f.product}|${f.term_months}`)
          );

          const toInsert = oldFpms
            .filter(f => !existingKeys.has(`${f.entity_name}|${f.product}|${f.term_months}`))
            .map(f => ({
              entity_name: f.entity_name,
              product: f.product,
              term_months: f.term_months,
              rate: f.rate,
              factor: f.factor,
              discount_pct: f.discount_pct ?? 0,
            }));

          const skippedFpm = oldFpms.length - toInsert.length;
          if (skippedFpm > 0) addLog('warning', `${skippedFpm} factores FPM ya existen, omitidos.`);

          if (toInsert.length > 0) {
            // Insertar en lotes de 200
            const BATCH = 200;
            let totalInserted = 0;
            for (let i = 0; i < toInsert.length; i += BATCH) {
              const batch = toInsert.slice(i, i + BATCH);
              const { error: bErr } = await supabase.from('fpm_factors').insert(batch);
              if (bErr) {
                addLog('error', `Error insertando lote FPM (${i}–${i + batch.length}): ${bErr.message}`);
              } else {
                totalInserted += batch.length;
                addLog('success', `Lote FPM ${Math.floor(i / BATCH) + 1}: ${batch.length} factores migrados.`);
              }
            }
            addLog('info', `FPM: ${totalInserted} factores migrados.`);
          } else {
            addLog('info', 'No hay factores FPM nuevos para migrar.');
          }
        }
      }

      addLog('success', '✅ Migración completada. El simulador ahora usa el DB principal.');
      setDone(true);

    } catch (err: any) {
      addLog('error', `Error inesperado: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const logIcon = (type: MigrationLog['type']) => {
    if (type === 'success') return <CheckCircle size={14} className="text-green-500 flex-shrink-0 mt-0.5" />;
    if (type === 'error')   return <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />;
    if (type === 'warning') return <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />;
    return <ArrowRight size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
      <div className="flex items-start gap-4">
        <div className="bg-indigo-50 p-3 rounded-xl">
          <Database size={22} className="text-indigo-600" />
        </div>
        <div>
          <h3 className="font-black text-slate-800 text-base">Migración DB Simulador → DB Principal</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Copia las <strong>entidades financieras</strong> y <strong>factores FPM</strong> del DB viejo del simulador
            (<code className="bg-slate-100 px-1 rounded text-[10px]">qyjrqbodkxwcxoxvqdqz</code>) al DB principal
            (<code className="bg-slate-100 px-1 rounded text-[10px]">yfosumpmtmcomfpbspaz</code>).
            <br />
            <span className="text-amber-600 font-bold">Ejecuta primero</span> el archivo{' '}
            <code className="bg-slate-100 px-1 rounded text-[10px]">migration-unify-databases.sql</code> en Supabase antes de correr esto.
          </p>
        </div>
      </div>

      {!done && (
        <button
          onClick={runMigration}
          disabled={running}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
        >
          {running ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
          {running ? 'Migrando...' : 'Ejecutar Migración'}
        </button>
      )}

      {done && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle size={18} className="text-green-600" />
          <p className="text-green-700 font-bold text-sm">Migración completada exitosamente. Ya puedes usar el simulador con el DB principal.</p>
        </div>
      )}

      {logs.length > 0 && (
        <div className="bg-slate-900 rounded-xl p-4 max-h-72 overflow-y-auto space-y-1.5 font-mono text-xs">
          {logs.map((log, i) => (
            <div key={i} className="flex items-start gap-2">
              {logIcon(log.type)}
              <span className={
                log.type === 'success' ? 'text-green-400' :
                log.type === 'error'   ? 'text-red-400' :
                log.type === 'warning' ? 'text-amber-400' :
                'text-blue-300'
              }>
                {log.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
