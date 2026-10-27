/**
 * Worker do FinanFlow: serve o SPA (dist) e mantém o endpoint de OCR de faturas.
 * Sem GEMINI_API_KEY configurada, responde no modo simulação (mesmo comportamento do server.ts).
 */

const MODEL = 'gemini-3.8-flash';

const PROMPT = `Você é um assistente especialista em OCR, visão computacional e finanças pessoais para o público brasileiro.
Sua missão é analisar esta imagem (print de app como Riachuelo, Nubank, PicPay, Santander, Itaú, Inter, C6, Mercado Pago, cartão de loja, fatura de cartão de crédito, cupom fiscal ou extrato bancário).

Extraia com máxima precisão:
1. Instituição ou cartão detectado (ex: "Riachuelo", "PicPay", "Santander", "Nubank", "Outro").
2. Lista de transações ou compras encontradas com descrição, valor total, número de parcelas, valor da parcela, parcela atual, data (YYYY-MM-DD), tipo (expense/income), categoria sugerida e forma de pagamento.
3. Resumo explicativo em português para exibir ao usuário.

Se a imagem estiver ilegível ou não for comprovante/print financeiro, retorne itens vazios e explique no summary.`;

const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    detectedInstitution: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          totalAmount: { type: 'number' },
          installmentAmount: { type: 'number' },
          installmentsCount: { type: 'integer' },
          currentInstallment: { type: 'integer' },
          date: { type: 'string' },
          type: { type: 'string' },
          suggestedCategoryId: { type: 'string' },
          paymentMethod: { type: 'string' },
        },
        required: ['description', 'totalAmount', 'installmentsCount'],
      },
    },
  },
  required: ['summary', 'items'],
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function simulation() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    summary:
      'Foto recebida com sucesso! (Modo Simulação Inteligente ativo: detectada compra parcelada em 5x). Você pode ajustar qualquer valor antes de salvar.',
    detectedInstitution: 'Riachuelo',
    items: [
      {
        description: 'Riachuelo - Compra Detectada no Print',
        totalAmount: 350.0,
        installmentAmount: 70.0,
        installmentsCount: 5,
        currentInstallment: 1,
        date: today,
        type: 'expense',
        suggestedCategoryId: 'cat_compras_cartao',
        paymentMethod: 'credit',
      },
    ],
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return json({ ok: true, server: 'FinanFlow API', timestamp: new Date().toISOString() });
    }

    if (url.pathname === '/api/scan-invoice' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Corpo da requisição inválido.' }, 400);
      }

      const { image, mimeType } = body || {};
      if (!image) {
        return json({ error: 'Nenhuma imagem foi recebida. Por favor, envie uma foto ou print.' }, 400);
      }

      let base64Data = image;
      let detectedMime = mimeType || 'image/jpeg';
      const match = String(image).match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        detectedMime = match[1];
        base64Data = match[2];
      } else if (String(image).includes(',')) {
        base64Data = String(image).split(',')[1];
      }

      const key = env.GEMINI_API_KEY;
      if (!key) return json(simulation());

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { inlineData: { mimeType: detectedMime, data: base64Data } },
                    { text: PROMPT },
                  ],
                },
              ],
              generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA },
            }),
          },
        );

        if (!res.ok) {
          console.warn('Gemini respondeu', res.status, (await res.text()).slice(0, 300));
          return json(simulation());
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
        if (!text) return json(simulation());
        return json(JSON.parse(text));
      } catch (err) {
        console.warn('Falha na chamada do Gemini:', err?.message || err);
        return json(simulation());
      }
    }

    return env.ASSETS.fetch(request);
  },
};
