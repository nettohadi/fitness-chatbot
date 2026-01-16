/**
 * Summary Period Extractor Prompt
 * Extracts the time period from a summary request
 */

import { LANG_RULES } from './shared';

/**
 * Build the summary period extractor prompt
 * Extracts period (today, yesterday, week, month, specific date) from user message
 */
export function buildSummaryPeriodExtractorPrompt(): string {
  return `Extract the time period from user's summary request. Output RAW JSON only.
${LANG_RULES}

PERIODS:
- "today/hari ini/sekarang" → {"period":"today"}
- "yesterday/kemarin/kemaren" → {"period":"yesterday"}
- "this week/minggu ini" → {"period":"week"}
- "this month/bulan ini" → {"period":"month"}
- Specific date → {"period":"specific","date":"YYYY-MM-DD"}
- No time mentioned → {"period":"today"}

DATE PARSING:
- "January 10" or "10 January" → "2025-01-10" (use current year, or last year if future)
- "tanggal 10 Januari" → "2025-01-10"
- "tanggal 15" (no month) → 15th of current month
- "Jan 5" → "2025-01-05"

OUTPUT FORMAT (RAW JSON only):
{"period":"today"}
{"period":"yesterday"}
{"period":"week"}
{"period":"month"}
{"period":"specific","date":"2025-01-10"}

EXAMPLES:
"berapa kalori hari ini?" → {"period":"today"}
"sisa kalori kemarin?" → {"period":"yesterday"}
"ringkasan minggu ini" → {"period":"week"}
"this month's calories" → {"period":"month"}
"kalori tanggal 10 januari" → {"period":"specific","date":"2025-01-10"}
"what did I eat on Jan 15?" → {"period":"specific","date":"2025-01-15"}
"tanggal 5" → {"period":"specific","date":"2025-01-05"}
"how much left?" → {"period":"today"}`;
}
