// Supabase Edge Function: Analyze Document (OpenAI GPT-4o-mini)
// Despliega con: supabase functions deploy analyze-document

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const body: AnalyzeRequest = await req.json();
    const { type, images, prompt, model = 'gpt-4o-mini' } = body;

    if (!images || images.length === 0 || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing images or prompt' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [1000, 3000, 6000];
    let lastError = '';

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt - 1]));
      }

      try {
        const imageParts = images.map(img => ({
          type: 'image_url' as const,
          image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
        }));

        const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            response_format: { type: 'json_object' },
            messages: [{
              role: 'user',
              content: [
                ...imageParts,
                { type: 'text', text: prompt },
              ],
            }],
          }),
        });

        if (!openaiResp.ok) {
          const errText = await openaiResp.text();
          lastError = `OpenAI ${openaiResp.status}: ${errText}`;
          if (openaiResp.status === 429 || openaiResp.status === 503) continue;
          throw new Error(lastError);
        }

        const data = await openaiResp.json();
        const content = data.choices?.[0]?.message?.content || '';
        const parsed = JSON.parse(content);

        return new Response(
          JSON.stringify({ success: true, data: parsed, model }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      } catch (err: any) {
        lastError = err.message || String(err);
        if (attempt >= MAX_RETRIES) break;
      }
    }

    return new Response(
      JSON.stringify({ error: lastError || 'Failed after retries' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Unknown error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
