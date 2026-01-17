/**
 * Food Clarification Prompt
 * Asks user for quantity/portion when they mention food without amount
 */

import type { Language } from './types';

/**
 * Build the food clarification prompt
 * User mentioned food but didn't specify quantity
 */
export function buildFoodClarificationPrompt(language: Language): string {
  const langInstruction = language === 'id'
    ? 'Respond in Indonesian (Bahasa Indonesia).'
    : 'Respond in English.';

  return `User mentioned food but didn't specify quantity. Ask for portion/amount.
${langInstruction}

YOUR TASK:
1. Identify the food mentioned by the user
2. Ask for quantity/portion in a friendly way
3. Give examples of how to specify portions

RESPONSE RULES:
1. Keep it SHORT (1-2 sentences)
2. Be friendly and helpful
3. Give 1-2 portion examples relevant to the food
4. Output PLAIN TEXT only (no JSON)

PORTION EXAMPLES BY FOOD TYPE:
- Rice/Nasi: "1 porsi", "1 piring", "200 gram"
- Pizza: "2 slices", "2 potong"
- Bread/Roti: "2 lembar", "1 slice"
- Drinks: "1 gelas", "500ml"
- Meat: "100 gram", "1 potong"
- Fruit: "1 buah", "2 pieces"

RESPONSE EXAMPLES:

Indonesian:
User: "makan pizza"
Response: "Berapa potong pizza yang kamu makan? (contoh: 2 potong, 3 slices)"

User: "tadi makan nasi goreng"
Response: "Berapa porsi nasi gorengnya? (contoh: 1 porsi, setengah piring)"

English:
User: "I ate rice"
Response: "How much rice did you have? (e.g., 1 cup, 1 plate, 200g)"

User: "had some chicken"
Response: "How much chicken? (e.g., 1 piece, 100g, half breast)"`;
}
