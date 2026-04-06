'use server';

import { ai, getAi } from '@/ai/genkit';
import { z } from 'genkit';
import { gemini15Flash } from '@genkit-ai/google-genai';

const ExtractExpenseDetailsInputSchema = z.object({
  message: z.string().optional().describe('User message text.'),
  photoDataUri: z.string().optional().describe("Receipt photo as data URI (Base64)."),
  apiKey: z.string().optional().describe('Dynamic API Key for AI Studio.'),
});
export type ExtractExpenseDetailsInput = z.infer<typeof ExtractExpenseDetailsInputSchema>;

const ExtractExpenseDetailsOutputSchema = z.object({
  isReceipt: z.boolean().describe('Whether the input is a clear, valid receipt with a readable total amount.'),
  amount: z.number().describe('The total numerical value of the expense.'),
  description: z.string().describe('Store name or description of the expense in Japanese.'),
  currency: z.string().default('JPY').describe('Currency symbol (Default JPY).'),
  date: z.string().optional().describe('Date in YYYY-MM-DD format.'),
  time: z.string().optional().describe('Time of purchase in HH:mm format (24h).'),
  tNumber: z.string().optional().describe('Japanese Tax Registration Number (T + 13 digits).'),
  registrationNumber: z.string().optional().describe('Japanese Tax Registration Number (T + 13 digits) or Corporate Number (13 digits).'),
  boundingBox: z.object({
    ymin: z.number(), xmin: z.number(), ymax: z.number(), xmax: z.number()
  }).optional().describe('The normalized bounding box of the physical receipt [0-1000].'),
  category: z.string().describe('Suggested category for the expense based on merchant name or message (e.g. Food, Transportation, Stationery, Utility, Office Supplies, etc)'),
});
export type ExtractExpenseDetailsOutput = z.infer<typeof ExtractExpenseDetailsOutputSchema>;

export async function extractExpenseDetails(input: ExtractExpenseDetailsInput): Promise<ExtractExpenseDetailsOutput> {
  return extractExpenseDetailsFlow(input);
}

const extractExpenseDetailsFlow = ai.defineFlow(
  {
    name: 'extractExpenseDetailsFlow',
    inputSchema: ExtractExpenseDetailsInputSchema,
    outputSchema: ExtractExpenseDetailsOutputSchema,
  },
  async (input) => {
    const today = new Date().toISOString().split('T')[0];
    const promptParts: any[] = [
      {
        text: `You are an expert accountant specializing in Japanese receipts and business expenses (インボイス制度対応).
Analyze the input (text or receipt image) and extract the expense details.

Validation Logic:
- Set 'isReceipt' to true ONLY if the image/text contains a clear merchant name and a readable total amount.

Extraction Requirements:
1. Store Name (Merchant): Return as 'description' in Japanese.
2. Total Amount: Usually marked as "合計" or "Total".
3. Date: YYYY-MM-DD. Use today's date if not found. (Today is ${today})
4. Purchase Time: HH:mm (24h format).
5. Tax Registration Number: Qualified Invoice Registration Number starting with 'T' + 13 digits.
6. Default currency: JPY.
7. Category: English label (Food, Transportation, Stationery, Utility, Office Supplies, etc).

Return structured data.`
      }
    ];

    if (input.message) promptParts.push({ text: `Text input: ${input.message}` });
    if (input.photoDataUri) promptParts.push({ media: { url: input.photoDataUri } });

    const currentAi = getAi(input.apiKey || undefined);
    let lastError: any;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { output } = await currentAi.generate({
          model: gemini15Flash,
          prompt: promptParts,
          output: { schema: ExtractExpenseDetailsOutputSchema },
        });
        return output!;
      } catch (err: any) {
        lastError = err;
        if (err?.message?.includes('API key') || err?.code === 400) throw new Error('Invalid API Key');
        if (attempt < 3) await new Promise(res => setTimeout(res, attempt * 1000));
      }
    }
    throw new Error(`Google AI API Error: ${lastError?.message}`);
  }
);
