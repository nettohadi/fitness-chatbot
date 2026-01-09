import type { CachedMessage } from '@/lib/cache/conversationCache';

export interface ParsedAction {
  type: 'save_calories' | 'update_calories' | 'delete_calories' | 'save_exercise' | 'update_exercise' | 'delete_exercise' | 'replace_exercise' | 'save_profile' | 'update_profile' | 'query_summary' | 'none';
  data?: any;
  userMessage?: string;
}

/**
 * Parse Claude's response for structured actions
 * Claude can embed JSON in code blocks to specify actions
 */
export function parseStructuredAction(claudeResponse: string): ParsedAction | null {
  // Look for JSON code block
  const jsonMatch = claudeResponse.match(/```json\s*\n([\s\S]*?)\n```/);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      // Map Claude's "action" field to our "type" field
      return {
        type: parsed.action,
        data: parsed.data,
        userMessage: parsed.userMessage
      };
    } catch (error) {
      console.error('Failed to parse JSON action:', error);
      return null;
    }
  }

  return null;
}

/**
 * Parse action from conversation context
 * Used when user confirms an action (e.g., says "yes")
 */
export function parseActionFromContext(
  conversationHistory: CachedMessage[],
  userConfirmation: string
): ParsedAction {
  const normalized = userConfirmation.toLowerCase().trim();

  // Check if user is confirming (yes, ya, ok, etc.)
  const isConfirming = /^(yes|ya|ok|oke|okay|yup|sure|confirm)$/i.test(normalized);

  if (!isConfirming) {
    return { type: 'none' };
  }

  // Look through recent messages for pending confirmations
  for (let i = conversationHistory.length - 1; i >= Math.max(0, conversationHistory.length - 5); i--) {
    const msg = conversationHistory[i];

    if (msg.role === 'assistant') {
      // Check for multiple food items pattern (e.g., "- 100g rice: ~130 cal\n- 50g tofu: ~40 cal")
      const multipleItemsPattern = /-\s*([^:]+):\s*~?(\d+)\s*(?:cal|kalori)/gi;
      const matches = Array.from(msg.content.matchAll(multipleItemsPattern));

      if (matches.length > 1 && msg.content.match(/save|simpan|save\?|simpan\?/i)) {
        // Multiple food items detected
        return {
          type: 'save_calories',
          data: {
            items: matches.map(match => ({
              foodDescription: match[1].trim(),
              calories: parseInt(match[2]),
              estimatedByAi: true,
            })),
          },
        };
      }

      // Check for single food item pattern
      const calorieMatch = msg.content.match(/(\d+)\s*(?:cal|kalori)/i);
      const foodMatch = msg.content.match(/(?:untuk|for)\s+["']?([^"'?.!]+)["']?/i);

      if (calorieMatch && foodMatch && msg.content.match(/save|simpan|save\?|simpan\?/i)) {
        return {
          type: 'save_calories',
          data: {
            calories: parseInt(calorieMatch[1]),
            foodDescription: foodMatch[1]?.trim(),
            estimatedByAi: true,
          },
        };
      }

      // Check for exercise logging pattern
      const exerciseCalMatch = msg.content.match(/(\d+)\s*(?:cal|kalori).*(?:burn|bakar)/i);
      const exerciseMatch = msg.content.match(/(\d+)\s*(?:min|menit|minutes?).*?(?:of|dari)?\s+([a-z\s]+)/i);

      if (exerciseCalMatch && exerciseMatch) {
        return {
          type: 'save_exercise',
          data: {
            exerciseType: exerciseMatch[2]?.trim(),
            durationMinutes: parseInt(exerciseMatch[1]),
            caloriesBurned: parseInt(exerciseCalMatch[1]),
          },
        };
      }
    }
  }

  return { type: 'none' };
}

/**
 * Extract profile data from conversation history
 * Used to detect when profile setup is complete
 */
export function extractProfileFromConversation(
  conversationHistory: CachedMessage[]
): {
  age?: number;
  gender?: 'male' | 'female';
  weightKg?: number;
  heightCm?: number;
  activityLevel?: string;
} | null {
  const profile: any = {};

  console.log('🔍 Extracting profile from', conversationHistory.length, 'messages');

  // STRATEGY 1: Parse ALL user messages for any profile-related data (handles bulk input)
  for (let i = 0; i < conversationHistory.length; i++) {
    const msg = conversationHistory[i];

    if (msg.role === 'user') {
      const content = msg.content.trim().toLowerCase();
      console.log(`  [${i}] Scanning user message:`, content);

      // Extract age (number followed by "yo", "years", or standalone in range 10-120)
      if (!profile.age) {
        const agePatterns = [
          /(\d{1,3})\s*(?:yo|years?|tahun)/i,
          /(?:age|umur)[:\s]+(\d{1,3})/i,
          /^(\d{1,3})$/  // Standalone number
        ];

        for (const pattern of agePatterns) {
          const match = content.match(pattern);
          if (match) {
            const age = parseInt(match[1]);
            if (age >= 10 && age <= 120) {
              profile.age = age;
              console.log('    ✅ Found age:', age);
              break;
            }
          }
        }
      }

      // Extract gender
      if (!profile.gender) {
        if (/(^|\s)(male|pria|laki|cowok)(\s|$|,)/i.test(content)) {
          profile.gender = 'male';
          console.log('    ✅ Found gender: male');
        } else if (/(^|\s)(female|wanita|perempuan|cewek)(\s|$|,)/i.test(content)) {
          profile.gender = 'female';
          console.log('    ✅ Found gender: female');
        }
      }

      // Extract weight (number followed by kg)
      if (!profile.weightKg) {
        const weightMatch = content.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo)/i);
        if (weightMatch) {
          const weight = parseFloat(weightMatch[1]);
          if (weight >= 20 && weight <= 300) {
            profile.weightKg = weight;
            console.log('    ✅ Found weight:', weight, 'kg');
          }
        }
      }

      // Extract height (number followed by cm)
      if (!profile.heightCm) {
        const heightMatch = content.match(/(\d+(?:\.\d+)?)\s*cm/i);
        if (heightMatch) {
          const height = parseFloat(heightMatch[1]);
          if (height >= 100 && height <= 250) {
            profile.heightCm = height;
            console.log('    ✅ Found height:', height, 'cm');
          }
        }
      }

      // Extract activity level
      if (!profile.activityLevel) {
        if (/sedentary|tidak aktif/i.test(content)) {
          profile.activityLevel = 'sedentary';
          console.log('    ✅ Found activity: sedentary');
        } else if (/very.?active|sangat aktif/i.test(content)) {
          profile.activityLevel = 'very_active';
          console.log('    ✅ Found activity: very_active');
        } else if (/light|ringan/i.test(content)) {
          profile.activityLevel = 'light';
          console.log('    ✅ Found activity: light');
        } else if (/moderate|sedang/i.test(content)) {
          profile.activityLevel = 'moderate';
          console.log('    ✅ Found activity: moderate');
        } else if (/active|aktif/i.test(content)) {
          profile.activityLevel = 'active';
          console.log('    ✅ Found activity: active');
        }
      }
    }
  }

  // STRATEGY 2: Context-aware extraction (for sequential Q&A)
  let lastProfileQuestion = '';

  for (let i = 0; i < conversationHistory.length; i++) {
    const msg = conversationHistory[i];

    // Track what the assistant asked
    if (msg.role === 'assistant') {
      const content = msg.content.toLowerCase();

      if (content.includes('age') || content.includes('umur') || content.includes('old are you')) {
        lastProfileQuestion = 'age';
      } else if (content.includes('male') || content.includes('female') || content.includes('gender') || content.includes('jenis kelamin')) {
        lastProfileQuestion = 'gender';
      } else if (content.includes('weight') || content.includes('berat')) {
        lastProfileQuestion = 'weight';
      } else if (content.includes('height') || content.includes('tinggi')) {
        lastProfileQuestion = 'height';
      } else if (content.includes('active') || content.includes('activity') || content.includes('aktivitas')) {
        lastProfileQuestion = 'activity';
      }
    }

    // Parse user's response based on context (only if not already found)
    if (msg.role === 'user') {
      const content = msg.content.trim();

      // Age pattern (context-based)
      if (!profile.age && lastProfileQuestion === 'age') {
        const ageMatch = content.match(/^\d{1,3}$/);
        if (ageMatch) {
          const age = parseInt(ageMatch[0]);
          if (age >= 10 && age <= 120) {
            profile.age = age;
            console.log('    ✅ Context extracted age:', age);
            lastProfileQuestion = '';
          }
        }
      }

      // Gender pattern (context-based)
      if (!profile.gender && lastProfileQuestion === 'gender') {
        if (/(male|pria|laki|cowok)/i.test(content)) {
          profile.gender = 'male';
          console.log('    ✅ Context extracted gender: male');
          lastProfileQuestion = '';
        } else if (/(female|wanita|perempuan|cewek)/i.test(content)) {
          profile.gender = 'female';
          console.log('    ✅ Context extracted gender: female');
          lastProfileQuestion = '';
        }
      }
    }
  }

  console.log('📋 Final profile:', profile);

  // Check if profile is complete
  if (profile.age && profile.gender && profile.weightKg && profile.heightCm && profile.activityLevel) {
    console.log('✅ Profile is COMPLETE!');
    return profile;
  }

  console.log('❌ Profile is INCOMPLETE (missing:',
    !profile.age ? 'age ' : '',
    !profile.gender ? 'gender ' : '',
    !profile.weightKg ? 'weight ' : '',
    !profile.heightCm ? 'height ' : '',
    !profile.activityLevel ? 'activity' : '',
    ')');
  return null;
}

/**
 * Detect if user is trying to edit a calorie value
 */
export function isCalorieEdit(message: string): number | null {
  const normalized = message.trim();

  // Check if it's just a number
  const numberMatch = normalized.match(/^(\d+)$/);
  if (numberMatch) {
    return parseInt(numberMatch[1]);
  }

  return null;
}
