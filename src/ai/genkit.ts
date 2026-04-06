import {genkit} from 'genkit';
import {googleAI, gemini15Flash} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI()],
  model: gemini15Flash, // O plugin já cuida do nome correto internamente
});

/**
 * Returns a Genkit instance, optionally with a dynamic API key.
 */
export function getAi(apiKey?: string) {
  if (!apiKey) return ai;
  return genkit({
    plugins: [googleAI({ apiKey })],
    model: gemini15Flash,
  });
}
