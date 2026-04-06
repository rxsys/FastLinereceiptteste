'use server';
/**
 * @fileOverview AI Flow to suggest a matching company name from a list of registered partners.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestCompanyMatchInputSchema = z.object({
  userInput: z.string().describe('The project or cost center name provided by the user (potentially misspelled).'),
  registeredProjects: z.array(z.string()).describe('List of official registered project or cost center names.'),
});
export type SuggestCompanyMatchInput = z.infer<typeof SuggestCompanyMatchInputSchema>;

const SuggestCompanyMatchOutputSchema = z.object({
  suggestedName: z.string().nullable().describe('The best matching project or cost center name from the list, or null if no reasonable match is found.'),
  confidence: z.number().describe('Confidence score from 0 to 1.'),
  reasoning: z.string().optional().describe('Brief explanation of why this match was chosen.'),
});
export type SuggestCompanyMatchOutput = z.infer<typeof SuggestCompanyMatchOutputSchema>;

export async function suggestCompanyMatch(input: SuggestCompanyMatchInput): Promise<SuggestCompanyMatchOutput> {
  return suggestCompanyMatchFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCompanyMatchPrompt',
  input: { schema: SuggestCompanyMatchInputSchema },
  output: { schema: SuggestCompanyMatchOutputSchema },
  prompt: `You are an administrative assistant for a construction company in Japan.
Your task is to compare a user-inputted project or cost center name with a list of officially registered projects/cost centers.

User Input: "{{{userInput}}}"
Registered Projects:
{{#each registeredProjects}}
- {{{this}}}
{{/each}}

If the user input is a slight misspelling, abbreviation, or variation of one of the registered projects, suggest the correct official name.
Example variations to consider:
- "建設ラボ" vs "株式会社 建設ラボ" (Suffixes/Prefixes)
- "ｹﾝｾﾂﾗﾎﾞ" vs "建設ラボ" (Katakana vs Kanji)
- Small typos.

Return the official name as 'suggestedName' ONLY if you are confident (score > 0.7). Otherwise, return null for 'suggestedName'.`,
});

const suggestCompanyMatchFlow = ai.defineFlow(
  {
    name: 'suggestCompanyMatchFlow',
    inputSchema: SuggestCompanyMatchInputSchema,
    outputSchema: SuggestCompanyMatchOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);