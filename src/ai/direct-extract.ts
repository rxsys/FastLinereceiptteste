export interface ExtractedReceipt {
  isReceipt: boolean;
  transactionType: 'expense' | 'income_amortization' | 'income_additive';
  amount: number;
  description: string;
  date: string;
  category: string;
  registrationNumber: string;
  /** Bounding box [y_min, x_min, y_max, x_max] em escala 0-1000, retornado apenas no multi-extract */
  bbox?: [number, number, number, number];
}

interface ExtractInput {
  message?: string;
  photoDataUri?: string;
  apiKey: string;
  companyName?: string;
}

// Chama a API Gemini e retorna o texto bruto
async function callGemini(parts: any[], apiKey: string): Promise<{ text: string; usage: any }> {
  const modelNames = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
  let lastError: any;
  for (const modelName of modelNames) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] })
      });
      const data = await response.json();
      if (response.ok) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log(`[AI] Success with model: ${modelName}. Tokens:`, data.usageMetadata?.totalTokenCount);
        return { text, usage: data.usageMetadata };
      }
      lastError = data.error?.message || 'Format error';
    } catch (e: any) {
      lastError = e.message;
    }
  }
  throw new Error(`AI Failure: ${lastError}`);
}

function buildImageParts(input: ExtractInput): any[] {
  const parts: any[] = [];
  if (input.message) parts.push({ text: `Input: ${input.message}` });
  if (input.photoDataUri) {
    parts.push({
      inlineData: {
        data: input.photoDataUri.split(',')[1],
        mimeType: input.photoDataUri.split(';')[0].split(':')[1]
      }
    });
  }
  return parts;
}

// ── Extração simples (1 recibo) ───────────────────────────────────────────────
export async function extractExpenseDetailsDirect(input: ExtractInput) {
  const today = new Date().toISOString().split('T')[0];
  const prompt = `You are an expert accountant for Japanese receipts.
Extract the following JSON from the input. Today: ${today}.
Company Name Context: "${input.companyName || 'Unknown'}". Use this to determine the transactionType.

Return ONLY valid JSON with these exact fields:
{
  "isReceipt": boolean,
  "transactionType": "expense" | "income_amortization" | "income_additive",
  "amount": number,
  "description": string,
  "date": "YYYY-MM-DD",
  "category": "Food|Transport|Shopping|Work|Misc",
  "registrationNumber": string
}

Rules:
- amount: total amount paid in yen (integer)
- transactionType: if Company Name is the ISSUER return "income_amortization" or "income_additive", otherwise "expense"
- description: merchant name or brief description
- date: purchase date YYYY-MM-DD
- category: best matching category
- registrationNumber: T followed by 13 digits, or "" if not present`;

  const parts = [{ text: prompt }, ...buildImageParts(input)];
  const { text, usage } = await callGemini(parts, input.apiKey);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in AI response');
  return {
    data: JSON.parse(jsonMatch[0]) as ExtractedReceipt,
    usage: {
      input: usage?.promptTokenCount || 0,
      output: usage?.candidatesTokenCount || 0,
      total: usage?.totalTokenCount || 0,
    }
  };
}

// ── Extração múltipla (N recibos numa imagem) ─────────────────────────────────
export async function extractMultipleReceipts(input: ExtractInput): Promise<{
  receipts: ExtractedReceipt[];
  usage: { input: number; output: number; total: number };
}> {
  const today = new Date().toISOString().split('T')[0];
  const prompt = `You are an expert accountant for Japanese receipts. Today: ${today}.
Company Name Context: "${input.companyName || 'Unknown'}".

IMPORTANT: The image may contain ONE or MORE receipts/invoices.
Carefully inspect the ENTIRE image and identify ALL distinct receipts or purchase records visible.

Return ONLY a valid JSON array. Each element represents one receipt:
[
  {
    "isReceipt": boolean,
    "transactionType": "expense" | "income_amortization" | "income_additive",
    "amount": number,
    "description": string,
    "date": "YYYY-MM-DD",
    "category": "Food|Transport|Shopping|Work|Misc",
    "registrationNumber": string,
    "bbox": [y_min, x_min, y_max, x_max]
  }
]

Rules:
- Return an array even if only one receipt is found
- Only include items where isReceipt is true
- amount: receipt TOTAL in yen (integer), do NOT sum line items
- transactionType: if Company Name is the ISSUER return "income_amortization", otherwise "expense"
- description: merchant name for each receipt
- date: purchase date YYYY-MM-DD (if unclear use today: ${today})
- registrationNumber: T + 13 digits, or "" if not present
- bbox: bounding box of each receipt in the image, values 0-1000 (0=top/left, 1000=bottom/right)
- If the same merchant appears with different totals, treat as separate receipts`;

  const parts = [{ text: prompt }, ...buildImageParts(input)];
  const { text, usage } = await callGemini(parts, input.apiKey);

  // Extrai array JSON da resposta
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (!arrayMatch) {
    // Fallback: tenta extrair objeto único e encapsula em array
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const single = JSON.parse(objMatch[0]) as ExtractedReceipt;
      return {
        receipts: single.isReceipt ? [single] : [],
        usage: { input: usage?.promptTokenCount || 0, output: usage?.candidatesTokenCount || 0, total: usage?.totalTokenCount || 0 }
      };
    }
    throw new Error('No JSON array in AI response');
  }

  const parsed: ExtractedReceipt[] = JSON.parse(arrayMatch[0]);
  const valid = parsed.filter(r => r.isReceipt && r.amount > 0);

  return {
    receipts: valid,
    usage: { input: usage?.promptTokenCount || 0, output: usage?.candidatesTokenCount || 0, total: usage?.totalTokenCount || 0 }
  };
}
