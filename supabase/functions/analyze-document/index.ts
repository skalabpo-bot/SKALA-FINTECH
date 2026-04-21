// Supabase Edge Function: Analyze Document
// Cascada: Gemini (múltiples modelos) → Groq → OpenAI
// Despliega con: supabase functions deploy analyze-document

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY') || '';
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  type: 'cedula' | 'paystub' | 'legal';
  images: Array<{ base64: string; mimeType: string }>;
  prompt: string;
  model?: string;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ============ GEMINI ============
async function callGemini(images: any[], prompt: string): Promise<any> {
  const models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];
  const RETRY_DELAYS = [1500, 3000, 6000];

  for (const model of models) {
    for (let attempt = 0; attempt <= 3; attempt++) {
      if (attempt > 0) await sleep(RETRY_DELAYS[attempt - 1]);

      try {
        const parts: any[] = [];
        for (const img of images) parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
        parts.push({ text: prompt });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0 },
          }),
        });

        if (!resp.ok) {
          const err = await resp.text();
          console.warn(`Gemini ${model} attempt ${attempt + 1} falló: ${resp.status}`);
          // 503 y 429 → reintentar con este modelo
          if ((resp.status === 503 || resp.status === 429) && attempt < 3) continue;
          // 404 u otro → pasar al siguiente modelo
          break;
        }

        const data = await resp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return { data: JSON.parse(cleanText), model: `gemini/${model}` };
      } catch (e: any) {
        console.warn(`Gemini ${model} error:`, e.message);
        if (attempt >= 3) break;
      }
    }
  }
  throw new Error('Gemini: todos los modelos fallaron');
}

// ============ GROQ ============
async function callGroq(images: any[], prompt: string): Promise<any> {
  const imageParts = images.map(img => ({
    type: 'image_url',
    image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
  }));

  const models = ['meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.2-90b-vision-preview', 'llama-3.2-11b-vision-preview'];

  for (const model of models) {
    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          temperature: 0,
          messages: [{ role: 'user', content: [...imageParts, { type: 'text', text: prompt }] }],
        }),
      });

      if (!resp.ok) {
        console.warn(`Groq ${model} falló: ${resp.status}`);
        continue;
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || '';
      return { data: JSON.parse(content), model: `groq/${model}` };
    } catch (e: any) {
      console.warn(`Groq ${model} error:`, e.message);
    }
  }
  throw new Error('Groq: todos los modelos fallaron');
}

// ============ OPENAI ============
async function callOpenAI(images: any[], prompt: string, model: string): Promise<any> {
  const imageParts = images.map(img => ({
    type: 'image_url',
    image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
  }));

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: [...imageParts, { type: 'text', text: prompt }] }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';
  return { data: JSON.parse(content), model: `openai/${model}` };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const body: AnalyzeRequest = await req.json();
    const { images, prompt, model = 'gpt-4o-mini' } = body;

    if (!images || images.length === 0 || !prompt) {
      return new Response(JSON.stringify({ error: 'Missing images or prompt' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }

    const errors: string[] = [];

    // 1. Gemini (primera opción)
    if (GEMINI_API_KEY) {
      try {
        const result = await callGemini(images, prompt);
        return new Response(JSON.stringify({ success: true, ...result }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      } catch (e: any) { errors.push(`Gemini: ${e.message}`); }
    }

    // 2. Groq (gratis, rápido)
    if (GROQ_API_KEY) {
      try {
        const result = await callGroq(images, prompt);
        return new Response(JSON.stringify({ success: true, ...result }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      } catch (e: any) { errors.push(`Groq: ${e.message}`); }
    }

    // 3. OpenAI (último recurso)
    if (OPENAI_API_KEY) {
      try {
        const result = await callOpenAI(images, prompt, model);
        return new Response(JSON.stringify({ success: true, ...result }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      } catch (e: any) { errors.push(`OpenAI: ${e.message}`); }
    }

    return new Response(JSON.stringify({ error: errors.join(' | ') || 'No API keys configured' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  }
});
