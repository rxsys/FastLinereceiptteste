'use server';
/**
 * @fileOverview An AI agent that categorizes user expenses.
 *
 * - categorizeExpense - A function that handles the expense categorization process.
 * - CategorizeExpenseInput - The input type for the categorizeExpense function.
 * - CategorizeExpenseOutput - The return type for the categorizeExpense function.
 */

import {ai, getAi} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeExpenseInputSchema = z.object({
  expenseDescription: z.string().describe('The description of the expense.'),
  apiKey: z.string().optional().describe('Dynamic API Key for AI Studio.'),
});
export type CategorizeExpenseInput = z.infer<typeof CategorizeExpenseInputSchema>;

const CategorizeExpenseOutputSchema = z.object({
  category: z
    .enum([
      'Food',
      'Transport',
      'Utilities',
      'Shopping',
      'Entertainment',
      'Groceries',
      'Rent/Mortgage',
      'Healthcare',
      'Education',
      'Travel',
      'Work',
      'Miscellaneous',
    ])
    .describe('The suggested category for the expense.'),
});
export type CategorizeExpenseOutput = z.infer<typeof CategorizeExpenseOutputSchema>;

export async function categorizeExpense(input: CategorizeExpenseInput): Promise<CategorizeExpenseOutput> {
  return categorizeExpenseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeExpensePrompt',
  input: {schema: CategorizeExpenseInputSchema},
  output: {schema: CategorizeExpenseOutputSchema},
  prompt: `You are an AI assistant designed to categorize user expenses.

Based on the following expense description, suggest the most appropriate category from the predefined list:
Food, Transport, Utilities, Shopping, Entertainment, Groceries, Rent/Mortgage, Healthcare, Education, Travel, Work, Miscellaneous.

Expense Description: {{{expenseDescription}}}`,
});

const categorizeExpenseFlow = ai.defineFlow(
  {
    name: 'categorizeExpenseFlow',
    inputSchema: CategorizeExpenseInputSchema,
    outputSchema: CategorizeExpenseOutputSchema,
  },
  async input => {
    const dynamicAi = getAi(input.apiKey || undefined);
    
    let lastError: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { output } = await dynamicAi.generate({
          prompt: `You are an AI assistant designed to categorize user expenses.
Based on the following expense description, suggest the most appropriate category from the predefined list:
Food, Transport, Utilities, Shopping, Entertainment, Groceries, Rent/Mortgage, Healthcare, Education, Travel, Work, Miscellaneous.

Expense Description: ${input.expenseDescription}`,
          output: { schema: CategorizeExpenseOutputSchema }
        });
        return output!;
      } catch (err: any) {
        lastError = err;
        console.error(`[Genkit Categorize Attempt ${attempt}] Falha na geração:`, err?.message || err);

        if (err?.message?.includes('API key') || err?.code === 400) {
          throw new Error('Chave de API do Google inválida ou não configurada.');
        }

        if (attempt < 3) await new Promise(res => setTimeout(res, attempt * 1000));
      }
    }

    console.error('[Genkit Categorize Fatal Error]', lastError);
    return { category: 'Miscellaneous' }; // Fallback gracioso
  }
);
