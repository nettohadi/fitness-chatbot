# Bug Fix Testing Guide

This document outlines the testing procedures to verify the two critical bug fixes implemented in the fitness chatbot.

## Bug #1: JSON Leaking to User Messages

### What Was Fixed
- Bot was sending raw JSON structures to users instead of extracting the `userMessage` field
- Affected `query_summary` actions (weekly/monthly summaries)
- Implemented `cleanResponseForUser()` helper function
- Updated all response paths to extract userMessage

### Test Cases

#### Test 1.1: Today's Summary (Should Already Work)
**User Input**: "Ringkasan hari ini" or "Today's summary"

**Expected Output**:
- Clean, formatted summary in natural language
- NO JSON code blocks visible
- Shows calories consumed, burned, net, and remaining

**How to Verify**:
- Check that response is in plain text/markdown
- No `{`, `}`, or `"action":` visible to user

---

#### Test 1.2: Weekly Summary
**User Input**: "Ringkasan minggu ini" or "This week's summary"

**Expected Output**:
- Clean, formatted weekly summary
- NO JSON like `{"action": "query_summary", "data": {...}}`
- Shows week's total calories with breakdown

**How to Verify**:
- Response should read naturally in the user's language
- No raw JSON visible

---

#### Test 1.3: Monthly Summary
**User Input**: "Ringkasan bulan ini" or "This month's summary"

**Expected Output**:
- Clean monthly summary with statistics
- NO JSON structures visible

**How to Verify**:
- Same as above - pure natural language response

---

## Bug #2: Exercise Calorie Calculation Errors

### What Was Fixed
- Bot was manually calculating and making arithmetic errors
- Claude now uses EXACT formula: `Math.round(MET × Weight(kg) × Duration/60)`
- Provided full MET VALUES TABLE to Claude
- Server validates calculations (logs mismatches)

### Test Cases

#### Test 2.1: Simple Exercise (Single Activity)
**User Input**: "Saya bersepeda 30 menit" or "I cycled for 30 minutes"

**User Weight**: 76 kg (from profile)

**Expected Calculation**:
```
MET Value: 6.8 (cycling)
Duration: 30 minutes = 0.5 hours
Formula: 6.8 × 76 × 0.5 = 258.4 → 258 kcal (rounded)
```

**Expected Bot Response**:
- "Great! 30 minutes of cycling burned ~258 calories. Save?"
- OR in Indonesian: "Keren! 30 menit bersepeda membakar ~258 kalori. Simpan?"

**How to Verify**:
1. Bot shows ~258 kcal estimate
2. User confirms with "yes"
3. Check database entry: should show exactly 258 kcal
4. Bot should NOT recalculate or show different number

---

#### Test 2.2: Split Exercise (Multiple Intensities)
**User Input**: "Saya bersepeda 10 menit level 5, lalu 20 menit level 6"

**User Weight**: 76 kg

**Expected Calculation**:
```
Part 1: Level 5 (moderate cycling, MET 6.8)
- 6.8 × 76 × (10/60) = 6.8 × 76 × 0.1667 = 86.11 → 86 kcal

Part 2: Level 6 (vigorous cycling, MET 8.0)
- 8.0 × 76 × (20/60) = 8.0 × 76 × 0.3333 = 202.65 → 203 kcal

Total: 86 + 203 = 289 kcal
```

**Expected Bot Response**:
- Should ask if these are two separate exercises or one combined
- If separate: "86 kcal + 203 kcal = 289 kcal total. Save both?"
- Should NOT show different numbers or recalculate to ~280 kcal

**How to Verify**:
1. Check that calculations are precise (86 + 203 = 289)
2. Bot doesn't second-guess or recalculate
3. Database entries match estimate exactly

---

#### Test 2.3: Multi-Language Exercise Matching
**User Input (Indonesian)**: "Saya sepeda statis 45 menit"

**Expected Behavior**:
- Claude matches "sepeda statis" → "cycling" (English)
- Uses cycling MET value: 6.8

**Expected Calculation** (for 76 kg user):
```
6.8 × 76 × (45/60) = 6.8 × 76 × 0.75 = 387.6 → 388 kcal
```

**Expected Bot Response**:
- "45 menit sepeda statis membakar ~388 kalori. Simpan?"

**How to Verify**:
1. Bot correctly understands "sepeda statis" as cycling
2. Calculation is accurate (388 kcal)
3. Database stores exercise_type as "cycling" (English)

---

#### Test 2.4: Various Languages
Test the same exercise in different languages:

**Test Inputs**:
- Indonesian: "lari 20 menit" (running)
- English: "running 20 minutes"
- Mixed: "jogging 20 minutes"

**Expected for 76kg user**:
```
Running MET: 8.0
8.0 × 76 × (20/60) = 8.0 × 76 × 0.3333 = 202.65 → 203 kcal
```

**How to Verify**:
- All variations result in same calculation (203 kcal)
- Exercise stored as "running" in database
- Bot doesn't confuse different languages

---

#### Test 2.5: Edge Case - Unrecognized Exercise
**User Input**: "Saya bermain frisbee 30 menit"

**Expected Behavior**:
- Claude doesn't find exact match in predefined list
- Uses default MET: 5.0 (as per system prompt)

**Expected Calculation** (for 76 kg user):
```
5.0 × 76 × (30/60) = 5.0 × 76 × 0.5 = 190 kcal
```

**Expected Bot Response**:
- "30 minutes of frisbee burned ~190 calories. Save?"
- May mention it's an estimate

**How to Verify**:
1. Check server logs for warning: "Exercise type not found in MET_VALUES"
2. Calculation uses default 5.0 MET
3. Bot still provides reasonable estimate

---

## Testing Workflow

### Prerequisites
1. Ensure bot is running (`npm run dev`)
2. Ngrok tunnel is active
3. Telegram webhook is configured
4. Test user has complete profile (weight, age, etc.)

### Step-by-Step Testing

1. **Start Fresh Conversation**
   - Send "/start" to bot
   - Verify user exists in database

2. **Test JSON Leak Fix**
   - Run Test 1.1, 1.2, 1.3 in sequence
   - Screenshot any issues

3. **Test Simple Exercise Calculation**
   - Run Test 2.1
   - Verify estimate matches database entry

4. **Test Split Exercise**
   - Run Test 2.2
   - Check for arithmetic accuracy

5. **Test Multi-Language**
   - Run Test 2.3 with Indonesian
   - Run Test 2.4 with variations
   - Verify consistent matching

6. **Test Edge Cases**
   - Run Test 2.5 with unusual exercise
   - Check default MET handling

### Verification Checklist

For each test, verify:
- [ ] No JSON visible in bot responses
- [ ] Calculations are mathematically correct
- [ ] Bot's estimate matches saved database value
- [ ] Multi-language inputs work correctly
- [ ] No arithmetic errors or recalculations
- [ ] Server logs show validation passing (no mismatch warnings)

---

## Expected Server Logs

### Successful Exercise Save (No Warnings)
```
📊 Extracted structured action: save_exercise
🏃 Exercise will use MET value: 6.8 for cycling
✅ Exercise calories validated: 258 kcal (matches server calculation)
```

### Calculation Mismatch (Should Not Happen After Fix)
```
⚠️ Exercise calorie calculation mismatch!
Claude suggested: 280,
Server calculated: 258
(MET: 6.8, Weight: 76kg, Duration: 30min)
```

If you see mismatch warnings, the fix didn't fully resolve the issue.

---

## Database Verification

### Check Saved Exercise Entry

```sql
-- Check most recent exercise entry
SELECT
  exercise_type,
  duration_minutes,
  calories_burned,
  met_value,
  entry_time
FROM exercise_entries
WHERE user_id = '<user_uuid>'
ORDER BY entry_time DESC
LIMIT 1;
```

**Expected Results**:
- `exercise_type`: English exercise name (e.g., "cycling")
- `calories_burned`: Matches bot's estimate exactly
- `met_value`: Correct MET value from table (e.g., 6.8)

---

## Known Issues / Expected Behavior

1. **Rounding Differences**: Math.round() may cause ±1 kcal difference (acceptable)
2. **Default MET**: Unrecognized exercises use 5.0 MET (expected)
3. **Multi-Language Matching**: Claude's semantic matching may vary slightly (acceptable if reasonable)

---

## Reporting Issues

If you find bugs during testing, note:
1. Exact user input
2. User's weight and profile data
3. Bot's response (screenshot)
4. Expected vs actual calculation
5. Server logs (check for warnings)
6. Database entry (if saved)

---

## Success Criteria

✅ **Bug #1 Fixed**: No JSON visible in ANY bot response
✅ **Bug #2 Fixed**: All exercise calculations are accurate, no recalculations, estimate = saved value
✅ **Multi-Language Works**: Indonesian, English, and other languages match correctly
✅ **Validation Passes**: No server mismatch warnings in logs

---

## Next Steps After Testing

Once testing is complete and bugs are verified as fixed:
1. Mark "Test bug fixes" as completed in todo list
2. Proceed with dashboard implementation (next phase in plan)
3. Commit all bug fixes to git (user will handle this)
