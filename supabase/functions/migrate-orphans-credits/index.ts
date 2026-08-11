import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  // Solo POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verificar auth header (token de sesión Skala)
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // PASO 0: Obtener huérfanos
    console.log("[MIGRATE] Buscando créditos huérfanos...");
    const { data: allHuerfanos, error: eHuerfanos } = await supabase
      .from("credits")
      .select("id, solicitud_number, amount")
      .is("assigned_gestor_id", null)
      .order("created_at", { ascending: false })
      .limit(500);

    if (eHuerfanos) throw eHuerfanos;

    const count = allHuerfanos?.length || 0;
    console.log(`[MIGRATE] Encontrados ${count} créditos sin asignar`);

    if (count === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          message: "No hay créditos para asignar",
          asignados: 0,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // PASO 1: Generar preview
    console.log("[MIGRATE] Generando preview...");
    const preview = [];
    for (const credit of allHuerfanos) {
      const { data: firstEvent } = await supabase
        .from("credit_history")
        .select("user_id, action, created_at")
        .eq("credit_id", credit.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (!firstEvent?.user_id) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", firstEvent.user_id)
        .single();

      if (profile) {
        preview.push({
          credit_id: credit.id,
          solicitud_number: credit.solicitud_number,
          amount: credit.amount,
          se_asignara_a: profile.full_name,
          email: profile.email,
          role: profile.role,
          action: firstEvent.action,
        });
      }
    }

    console.log(`[MIGRATE] Preview: ${preview.length} créditos`);

    // PASO 2: Ejecutar migración
    console.log("[MIGRATE] Asignando créditos...");
    let asignados = 0;
    const errors = [];

    for (const p of preview) {
      const { data: firstEvent } = await supabase
        .from("credit_history")
        .select("user_id")
        .eq("credit_id", p.credit_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (!firstEvent?.user_id) continue;

      const { error: eUpdate } = await supabase
        .from("credits")
        .update({
          assigned_gestor_id: firstEvent.user_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", p.credit_id)
        .is("assigned_gestor_id", null);

      if (eUpdate) {
        errors.push(`${p.solicitud_number}: ${eUpdate.message}`);
      } else {
        asignados++;
      }
    }

    console.log(
      `[MIGRATE] Asignados: ${asignados}/${preview.length}`
    );

    // PASO 3: Registrar en credit_history
    console.log("[MIGRATE] Registrando en historial...");
    let historyCount = 0;
    for (const p of preview) {
      const { data: check } = await supabase
        .from("credits")
        .select("assigned_gestor_id")
        .eq("id", p.credit_id)
        .single();

      if (check?.assigned_gestor_id) {
        const { error: eHist } = await supabase
          .from("credit_history")
          .insert({
            credit_id: p.credit_id,
            action: "ASIGNACION_AUTOMATICA",
            details: "Crédito huérfano asignado al usuario que lo radicó",
            user_id: check.assigned_gestor_id,
            created_at: new Date().toISOString(),
          });

        if (!eHist) historyCount++;
      }
    }

    console.log(`[MIGRATE] Historial: ${historyCount} eventos`);

    // PASO 4: Verificar resultado
    const { data: remaining } = await supabase
      .from("credits")
      .select("id")
      .is("assigned_gestor_id", null)
      .limit(1);

    const stillOrphan = remaining?.length || 0;

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Migración completada",
        encontrados: count,
        asignados,
        historial: historyCount,
        aun_sin_asignar: stillOrphan,
        preview: preview.slice(0, 5),
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[MIGRATE] Error:", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: err?.message || String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
