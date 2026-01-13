# Fitness Chatbot - Complete System Flow

This document provides a comprehensive overview of how the fitness tracking Telegram bot processes messages from start to finish.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Message Flow Pipeline](#message-flow-pipeline)
3. [User Identification](#user-identification)
4. [Context Management](#context-management)
5. [Claude AI Processing](#claude-ai-processing)
6. [Action Types & Execution](#action-types--execution)
7. [Database Operations](#database-operations)
8. [Decision Tree](#decision-tree)
9. [Example Scenarios](#example-scenarios)

---

## Architecture Overview

```
┌─────────────┐
│  Telegram   │
│   Server    │
└──────┬──────┘
       │ POST /api/webhook
       ▼
┌─────────────────────────────────────┐
│     Webhook Handler (route.ts)      │
│  - Parse message                    │
│  - Find/Create user                 │
│  - Fetch context                    │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   Context-Aware Processor           │
│  - Build system prompt              │
│  - Send to Claude API               │
│  - Parse structured response        │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│     Action Parser & Executor        │
│  - Parse JSON action                │
│  - Execute database operations      │
│  - Format response                  │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Response Handler (Telegram API)    │
│  - Format MarkdownV2               │
│  - Send message                    │
│  - Log conversation                │
└─────────────────────────────────────┘
```

---

## Message Flow Pipeline

### Step 1: Webhook Entry Point
**File:** `src/app/api/webhook/route.ts`

```typescript
POST /api/webhook
├─ Parse JSON from Telegram
├─ Validate message exists
├─ Extract:
│  ├─ chatId (user identifier)
│  ├─ messageText (user's message)
│  └─ userIdentifier (chatId as phoneNumber)
└─ Return 200 OK (always, even for invalid)
```

**Key Code Location:** Lines 62-75

---

### Step 2: User Identification & Setup
**File:** `src/lib/db/users.ts`

```typescript
findOrCreateUser(userIdentifier)
├─ Query: users WHERE phoneNumber = chatId
├─ If exists:
│  └─ Return existing User
└─ If not exists:
   └─ Create new User:
      ├─ phoneNumber: chatId
      ├─ profileCompleted: false
      └─ All fitness fields: null
```

**Database Table:** `users`
- Primary Key: `id` (UUID)
- Unique Index: `phoneNumber`
- Cascade: All entries deleted if user deleted

**Failure Handling:** If user creation fails → Send error message → Exit

---

### Step 3: Message Logging & Caching
**Files:**
- `src/lib/db/conversations.ts`
- `src/lib/cache/conversationCache.ts`

#### A. Conversation Logging
```typescript
logConversation(userIdentifier, 'incoming', messageText)
├─ INSERT into conversation_logs
├─ Fields: phoneNumber, messageType, messageBody
└─ Auto-timestamp: createdAt
```

#### B. Cache Management
```typescript
addMessageToCache(userIdentifier, 'user', messageText)
├─ Store in LRU cache (in-memory)
├─ TTL: 30 minutes
├─ Max size: 10 messages per user
└─ Structure: { role, content, timestamp }
```

#### C. Fetch Context
```typescript
getConversationContext(userIdentifier)
├─ Check LRU cache first
│  └─ Cache hit? Return cached messages
└─ Cache miss:
   ├─ Query database (last 10 messages)
   ├─ Reverse order (oldest → newest)
   ├─ Populate cache
   └─ Return CachedMessage[]
```

**Performance:** Cache reduces DB queries by ~90% for active conversations

---

### Step 4: Context Preparation
**Files:**
- `src/lib/db/calories.ts`
- `src/lib/db/exercises.ts`

#### A. Today's Food Log
```typescript
getDailySummary(userId, todayDate)
├─ Query: calorie_entries WHERE userId AND entryDate = today
├─ Order by: entryTime DESC
├─ Calculate: totalCalories (SUM)
└─ Build text:
   Today's food log:
   - ID: xyz, Food: Rice, Calories: 200 kcal (estimated)
   - ID: abc, Food: Eggs, Calories: 150 kcal
   Total consumed: 350 kcal
```

#### B. Today's Exercises
```typescript
getTodayExercises(userId)
├─ Query: exercise_entries WHERE userId AND entryDate = today
├─ Order by: entryTime DESC
└─ Build text:
   Today's exercises:
   - ID: def, Exercise: Running, Duration: 30 min, Burned: 250 kcal
   Total burned: 250 kcal
```

#### C. User Profile Context
```typescript
Include in system prompt:
- Age, gender, weight, height
- Activity level
- BMR (Basal Metabolic Rate)
- TDEE (Total Daily Energy Expenditure)
- Daily calorie goal
- Deficit target (if set)
- Profile completion status
```

---

### Step 5: Claude AI Processing
**File:** `src/lib/services/contextAwareProcessor.ts`

#### System Prompt Structure (Lines 62-389)
```typescript
buildSystemPrompt(user, todaySummary, todayExercises)
├─ Role: "You are a helpful fitness tracking assistant"
├─ Language Rules: "Respond in user's language (detect from input)"
├─ Profile Setup Guide (if not complete):
│  1. Ask age
│  2. Ask gender
│  3. Ask weight (kg)
│  4. Ask height (cm)
│  5. Ask activity level (sedentary/light/moderate/active/very active)
│  └─ After all 5: Return save_profile action
├─ Food Logging Rules:
│  ├─ Estimate calories if not provided
│  ├─ Use average if range given (e.g., 100-130 → 115)
│  ├─ Ask for confirmation before saving
│  └─ Return save_calories action
├─ Exercise Logging Rules:
│  ├─ Calculate calories using MET values
│  ├─ Ask for duration if missing
│  ├─ Support splitting exercises (e.g., "1 hour cardio" → 30min running + 30min cycling)
│  └─ Return save_exercise action
├─ Update/Delete Rules:
│  ├─ Use entry IDs from today's summary
│  ├─ Confirm before destructive operations
│  └─ Return update_* or delete_* action
├─ Query Handling:
│  ├─ Today: Calculate from current summary
│  ├─ Week/Month/Range: Return query_summary action
│  └─ Include Net Calories: Consumed - Burned + Goal context
└─ Context sections:
   ├─ User profile data
   ├─ Today's food log (with IDs)
   ├─ Today's exercises (with IDs)
   └─ Conversation history (last 10 messages)
```

#### API Call
```typescript
claude.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  system: systemPrompt,
  messages: [
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ]
})
```

**Response Format:** Claude returns either:
1. **Structured JSON action** (wrapped in ```json...```)
2. **Plain text** (for clarifications, general chat)

---

### Step 6: Action Parsing
**File:** `src/lib/services/actionParser.ts`

#### Primary Parser (Lines 177-189)
```typescript
parseStructuredAction(claudeResponse)
├─ Regex: /```json\n([\s\S]*?)\n```/
├─ If JSON found:
│  └─ Parse and extract:
│     ├─ action (string)
│     ├─ data (object)
│     └─ userMessage (string)
└─ If not found:
   └─ Return null
```

#### Confirmation Parser (Lines 193-198)
```typescript
parseActionFromContext(conversationHistory, messageText)
├─ Check if user said: "yes", "ya", "ok", "oke", "confirm", etc.
└─ If confirmed:
   ├─ Look at last assistant message
   ├─ Regex patterns to extract:
   │  ├─ save_calories: Extract food + calories
   │  └─ save_exercise: Extract exercise + duration + calories
   └─ Return reconstructed action
```

**Example:**
```
User: "I ate rice 200 calories"
Claude: "Save rice dengan 200 kalori?"
User: "ya"
→ Parser extracts: { action: 'save_calories', data: { ... } }
```

---

## Action Types & Execution

### A. Food Logging Actions

#### 1. `save_calories`
**File:** `src/app/api/webhook/route.ts` (Lines 436-460)

```typescript
{
  "action": "save_calories",
  "data": {
    "items": [
      {
        "foodDescription": "Rice with chicken",
        "calories": 350,
        "estimatedByAi": true
      }
    ]
  },
  "userMessage": "✅ Saved! Rice with chicken: 350 kcal (estimated)"
}

Execution:
├─ Loop through items array
├─ For each item:
│  └─ addCalorieEntry(userId, calories, foodDescription, estimatedByAi)
│     └─ INSERT INTO calorie_entries
│        ├─ userId (FK)
│        ├─ calories (DECIMAL)
│        ├─ foodDescription (TEXT)
│        ├─ estimatedByAi (BOOLEAN)
│        ├─ entryDate (DATE, default CURRENT_DATE)
│        └─ entryTime (TIMESTAMPTZ, default now())
└─ Return success
```

#### 2. `update_calories`
**File:** `src/app/api/webhook/route.ts` (Lines 462-473)

```typescript
{
  "action": "update_calories",
  "data": {
    "entryId": "uuid-here",
    "calories": 400,
    "foodDescription": "Rice with chicken and vegetables"
  },
  "userMessage": "✅ Updated!"
}

Execution:
├─ updateCalorieEntry(entryId, { calories, foodDescription, estimatedByAi })
│  └─ UPDATE calorie_entries
│     SET calories = ?, foodDescription = ?, estimatedByAi = ?
│     WHERE id = ?
└─ Return success/error
```

#### 3. `delete_calories`
**File:** `src/app/api/webhook/route.ts` (Lines 475-483)

```typescript
{
  "action": "delete_calories",
  "data": { "entryId": "uuid-here" },
  "userMessage": "✅ Deleted!"
}

Execution:
├─ deleteCalorieEntry(entryId)
│  └─ DELETE FROM calorie_entries WHERE id = ?
└─ Return success/error
```

---

### B. Exercise Logging Actions

#### 1. `save_exercise`
**File:** `src/app/api/webhook/route.ts` (Lines 485-496)

```typescript
{
  "action": "save_exercise",
  "data": {
    "exerciseType": "running",
    "durationMinutes": 30,
    "caloriesBurned": 250,
    "metValue": 8.0
  },
  "userMessage": "✅ Logged running for 30 minutes (250 kcal burned)"
}

Execution:
├─ findExerciseType(exerciseType)
│  └─ Match against MET_VALUES lookup table
│     - running: 8.0 MET
│     - walking: 3.5 MET
│     - cycling: 6.0 MET
│     - swimming: 7.0 MET
│     - weight_training: 5.0 MET
├─ addExerciseEntry(userId, type, duration, calories, metValue)
│  └─ INSERT INTO exercise_entries
│     ├─ userId (FK)
│     ├─ exerciseType (TEXT)
│     ├─ durationMinutes (INT)
│     ├─ caloriesBurned (DECIMAL)
│     ├─ metValue (DECIMAL)
│     ├─ entryDate (DATE, default CURRENT_DATE)
│     └─ entryTime (TIMESTAMPTZ, default now())
└─ Return success
```

**MET Calculation:**
```
Calories Burned = MET × Weight(kg) × Duration(hours)
Example: 8.0 × 70kg × 0.5hr = 280 kcal
```

#### 2. `replace_exercise` (Split Exercise)
**File:** `src/app/api/webhook/route.ts` (Lines 521-534)

```typescript
{
  "action": "replace_exercise",
  "data": {
    "originalExerciseId": "uuid-original",
    "newExercises": [
      { "type": "running", "duration": 30, "calories": 250, "met": 8.0 },
      { "type": "cycling", "duration": 30, "calories": 200, "met": 6.0 }
    ]
  },
  "userMessage": "✅ Split into running (30min) and cycling (30min)"
}

Execution (Transaction):
├─ BEGIN TRANSACTION
├─ deleteExerciseEntry(originalExerciseId)
├─ For each newExercise:
│  └─ addExerciseEntry(userId, type, duration, calories, met)
├─ COMMIT
└─ Return success (or ROLLBACK on error)
```

---

### C. Profile Management Actions

#### 1. `save_profile`
**File:** `src/app/api/webhook/route.ts` (Lines 536-571)

```typescript
{
  "action": "save_profile",
  "data": {
    "age": 25,
    "gender": "male",
    "weightKg": 70,
    "heightCm": 175,
    "activityLevel": "moderate"
  },
  "userMessage": "✅ Profile saved! Your daily goal is 2433 kcal"
}

Execution:
├─ calculateFitnessMetrics(age, gender, weight, height, activity)
│  ├─ BMR = Mifflin-St Jeor equation:
│  │  Male: 10×weight + 6.25×height - 5×age + 5
│  │  Female: 10×weight + 6.25×height - 5×age - 161
│  ├─ TDEE = BMR × activity multiplier:
│  │  sedentary: 1.2
│  │  light: 1.375
│  │  moderate: 1.55
│  │  active: 1.725
│  │  very_active: 1.9
│  └─ dailyGoal = TDEE (or TDEE - deficitTarget if set)
├─ updateFitnessProfile(userId, all fields)
│  └─ UPDATE users SET
│     age, gender, weightKg, heightCm, activityLevel,
│     bmr, tdee, dailyCalorieGoal, profileCompleted = true
│     WHERE id = userId
└─ Log metrics to console
```

#### 2. `update_profile`
**File:** `src/app/api/webhook/route.ts` (Lines 573-583)

```typescript
{
  "action": "update_profile",
  "data": {
    "deficitTarget": 500
  },
  "userMessage": "✅ Deficit target updated to 500 kcal"
}

Execution:
├─ updateUserProfile(userId, { deficitTarget: 500 })
│  └─ UPDATE users SET deficitTarget = 500 WHERE id = userId
├─ Recalculate dailyCalorieGoal = TDEE - deficitTarget
└─ Return success
```

---

### D. Query/Summary Actions

#### 1. `query_summary` (Today)
**File:** `src/app/api/webhook/route.ts` (Lines 585-600)

```typescript
{
  "action": "query_summary",
  "data": { "type": "today" },
  "userMessage": "📊 **Today's Summary:**\n\nFood: 1200 kcal\nExercise: -300 kcal\nNet: 900 kcal\nGoal: 1933 kcal (2433 - 500 deficit)\nRemaining: 1033 kcal"
}

Execution:
├─ For 'today' type:
│  └─ Use Claude's userMessage (already calculated from context)
└─ No additional DB query needed
```

#### 2. `query_summary` (Date Range)
**File:** `src/app/api/webhook/route.ts` (Lines 248-287)

```typescript
{
  "action": "query_summary",
  "data": {
    "type": "week",  // or: yesterday, month, last_n_days, date_range
    "startDate": "2025-01-06",
    "endDate": "2025-01-12"
  },
  "userMessage": "Generating weekly report..."
}

Execution:
├─ generateDateRangeSummary(action, userId, user)
│  ├─ Determine date range based on type:
│  │  - yesterday: today - 1 day
│  │  - week: today - 7 days
│  │  - month: today - 30 days
│  │  - last_n_days: today - data.days
│  │  - date_range: use data.startDate & endDate
│  ├─ getEntriesByDateRange(userId, startDate, endDate)
│  │  └─ SELECT * FROM calorie_entries
│  │     WHERE userId = ? AND entryDate BETWEEN ? AND ?
│  │     ORDER BY entryDate DESC, entryTime DESC
│  ├─ getExerciseSummaryByDateRange(userId, startDate, endDate)
│  │  └─ SELECT * FROM exercise_entries
│  │     WHERE userId = ? AND entryDate BETWEEN ? AND ?
│  │     ORDER BY entryDate DESC, entryTime DESC
│  ├─ Calculate:
│  │  - Total calories consumed
│  │  - Total calories burned
│  │  - Daily averages
│  │  - Net calories
│  │  - Goal adherence
│  ├─ Format multi-language summary:
│  │  └─ Use user.preferredLanguage or detect from recent messages
│  └─ Return formatted string
└─ Use returned summary as response
```

---

## Database Operations

### Schema Overview
**File:** `prisma/schema.prisma`

```prisma
// Users Table
model User {
  id                 String    @id @default(uuid())
  phoneNumber        String    @unique
  age                Int?
  gender             String?
  weightKg           Decimal?
  heightCm           Decimal?
  activityLevel      String?
  bmr                Decimal?
  tdee               Decimal?
  dailyCalorieGoal   Decimal?
  deficitTarget      Decimal?
  profileCompleted   Boolean   @default(false)
  preferredLanguage  String?
  calorieEntries     CalorieEntry[]
  exerciseEntries    ExerciseEntry[]

  @@index([phoneNumber], name: "idx_users_phone")
}

// Calorie Entries Table
model CalorieEntry {
  id               String    @id @default(uuid())
  userId           String
  calories         Decimal
  foodDescription  String
  estimatedByAi    Boolean   @default(false)
  entryDate        DateTime  @default(dbgenerated("CURRENT_DATE")) @db.Date
  entryTime        DateTime  @default(now())
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, entryDate], name: "idx_calorie_entries_user_date")
  @@index([entryTime], name: "idx_calorie_entries_created")
}

// Exercise Entries Table
model ExerciseEntry {
  id               String    @id @default(uuid())
  userId           String
  exerciseType     String
  durationMinutes  Int
  caloriesBurned   Decimal
  metValue         Decimal?
  entryDate        DateTime  @default(dbgenerated("CURRENT_DATE")) @db.Date
  entryTime        DateTime  @default(now())
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, entryDate], name: "idx_exercise_entries_user_date")
}

// Conversation Logs Table
model ConversationLog {
  id          String    @id @default(uuid())
  phoneNumber String
  messageType String    // 'incoming' | 'outgoing'
  messageBody String
  createdAt   DateTime  @default(now())

  @@index([phoneNumber], name: "idx_conversation_logs_phone")
  @@index([createdAt], name: "idx_conversation_logs_created")
}
```

### Key Indexes & Performance

| Table | Index | Purpose |
|-------|-------|---------|
| `users` | `phoneNumber (UNIQUE)` | Fast user lookup by chatId |
| `calorie_entries` | `userId + entryDate` | Efficient daily summaries |
| `exercise_entries` | `userId + entryDate` | Efficient daily exercise queries |
| `conversation_logs` | `phoneNumber + createdAt` | Fast conversation history retrieval |

**Cascade Behavior:**
- Deleting a user → Automatically deletes all their calorie_entries and exercise_entries
- Conversation logs are independent (no FK to users)

---

## Decision Tree

```
┌─────────────────────────────────────┐
│   Telegram Message Received         │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌──────────────┐
        │ Parse JSON   │
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐      NO
        │ Valid msg?   ├──────────► Return 200 OK
        └──────┬───────┘
               │ YES
               ▼
        ┌──────────────────┐
        │ Find/Create User │
        └──────┬───────────┘
               │
        ┌──────┴───────┐
        │              │
        ▼              ▼
     SUCCESS       FAILURE ──► Send Error ──► Return 200
        │
        ▼
┌──────────────────────────────────┐
│ Parallel Operations:             │
│ 1. Log conversation (DB)         │
│ 2. Cache message (LRU)           │
│ 3. Fetch conversation history    │
│ 4. Fetch today's food log        │
│ 5. Fetch today's exercises       │
└──────────────┬───────────────────┘
               │
               ▼
        ┌──────────────────┐
        │ Build Context    │
        │ - User profile   │
        │ - History        │
        │ - Today's data   │
        └──────┬───────────┘
               │
               ▼
        ┌──────────────────┐
        │ Call Claude API  │
        └──────┬───────────┘
               │
               ▼
        ┌──────────────────┐      NO (plain text)
        │ Structured JSON? ├─────────────────────┐
        └──────┬───────────┘                     │
               │ YES                              │
               ▼                                  ▼
    ┌──────────────────┐              ┌──────────────────┐
    │ Parse Action     │              │ Check for        │
    └──────┬───────────┘              │ confirmation?    │
           │                          └──────┬───────────┘
           │                                 │
    ┌──────┴────────┬──────────┬───────────┼──────────┬─────────┐
    │               │          │           │          │         │
    ▼               ▼          ▼           ▼          ▼         ▼
save_calories  save_exercise  save_profile  update_*  delete_*  query_summary
    │               │          │           │          │         │
    ▼               ▼          ▼           ▼          ▼         ▼
┌────────┐   ┌─────────┐  ┌─────────┐  ┌────────┐ ┌────────┐ ┌──────────┐
│ INSERT │   │ INSERT  │  │ UPDATE  │  │ UPDATE │ │ DELETE │ │ SELECT   │
│ food   │   │exercise │  │ profile │  │ entry  │ │ entry  │ │ date     │
│ entry  │   │ entry   │  │ + calc  │  │        │ │        │ │ range    │
└───┬────┘   └────┬────┘  └────┬────┘  └───┬────┘ └───┬────┘ └────┬─────┘
    │             │            │           │          │          │
    └─────────────┴────────────┴───────────┴──────────┴──────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Extract Response │
                    │ - userMessage    │
                    └──────┬───────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │ Format Markdown  │
                    │ - Escape special │
                    │ - Apply bold     │
                    └──────┬───────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │ Send to Telegram │
                    └──────┬───────────┘
                           │
                    ┌──────┴──────┬─────────────┐
                    │             │             │
                    ▼             ▼             ▼
              Log response   Cache response  Return 200
```

---

## Example Scenarios

### Scenario 1: New User - Profile Setup
```
┌─ Message: "Hi"
│
├─ findOrCreateUser("123456789")
│  └─ User created with profileCompleted = false
│
├─ Claude receives context:
│  - Profile not complete
│  - No history
│
├─ Claude responds (Indonesian detected):
│  "Halo! Mari kita setup profil kamu. Berapa umur kamu?"
│
├─ No structured action (type: 'none')
│
└─ Send response ──► Return 200

┌─ Message: "25"
│
├─ Claude asks: "Apa jenis kelamin kamu? (laki-laki/perempuan)"
│
└─ Return 200

┌─ Message: "laki-laki"
│
├─ Claude asks: "Berapa berat badan kamu (kg)?"
│
└─ Return 200

... (continues for height, activity level)

┌─ Message: "moderate"
│
├─ Claude responds with structured action:
│  {
│    "action": "save_profile",
│    "data": {
│      "age": 25,
│      "gender": "male",
│      "weightKg": 70,
│      "heightCm": 175,
│      "activityLevel": "moderate"
│    },
│    "userMessage": "✅ Profil tersimpan! BMR: 1699 kcal, TDEE: 2633 kcal"
│  }
│
├─ executeAction → save_profile:
│  ├─ Calculate: BMR = (10×70) + (6.25×175) - (5×25) + 5 = 1699
│  ├─ Calculate: TDEE = 1699 × 1.55 = 2633
│  ├─ Calculate: dailyGoal = 2633 (no deficit yet)
│  └─ UPDATE users SET age=25, gender='male', ..., profileCompleted=true
│
└─ Send: "✅ Profil tersimpan! BMR: 1699 kcal, TDEE: 2633 kcal"
```

---

### Scenario 2: Log Food with Confirmation
```
┌─ Message: "I ate rice"
│
├─ Claude (context-aware):
│  - User profile complete ✓
│  - Today's food: []
│  - Missing: calories
│
├─ Claude responds (plain text):
│  "How much rice did you eat? (in grams or portions)"
│
└─ Send response ──► Return 200

┌─ Message: "200 grams"
│
├─ Claude estimates calories:
│  - 200g white rice ≈ 260 kcal (130 kcal per 100g average)
│
├─ Claude responds (asking confirmation):
│  "Save 200 grams rice with 260 kcal (estimated)?"
│
└─ Send response ──► Return 200

┌─ Message: "yes"
│
├─ parseActionFromContext():
│  ├─ Detect confirmation keyword: "yes"
│  ├─ Extract from previous message:
│  │  - Food: "200 grams rice"
│  │  - Calories: 260
│  │  - Estimated: true
│  └─ Reconstruct action:
│     {
│       "action": "save_calories",
│       "data": {
│         "items": [{
│           "foodDescription": "200 grams rice",
│           "calories": 260,
│           "estimatedByAi": true
│         }]
│       }
│     }
│
├─ executeAction → save_calories:
│  └─ INSERT INTO calorie_entries
│     (userId, calories, foodDescription, estimatedByAi, entryDate, entryTime)
│     VALUES (uuid, 260, '200 grams rice', true, '2025-01-13', now())
│
└─ Send: "✅ Saved! Rice: 260 kcal (estimated)"
```

---

### Scenario 3: Log Exercise with Calculation
```
┌─ Message: "I ran for 30 minutes"
│
├─ Claude (context-aware):
│  - User weight: 70 kg
│  - Exercise: running
│  - Duration: 30 minutes
│
├─ Calculate calories burned:
│  - MET for running: 8.0
│  - Formula: 8.0 × 70kg × (30/60)hr = 280 kcal
│
├─ Claude responds (structured action):
│  {
│    "action": "save_exercise",
│    "data": {
│      "exerciseType": "running",
│      "durationMinutes": 30,
│      "caloriesBurned": 280,
│      "metValue": 8.0
│    },
│    "userMessage": "✅ Logged running for 30 minutes (280 kcal burned)"
│  }
│
├─ executeAction → save_exercise:
│  └─ INSERT INTO exercise_entries
│     (userId, exerciseType, durationMinutes, caloriesBurned, metValue, entryDate)
│     VALUES (uuid, 'running', 30, 280, 8.0, '2025-01-13')
│
└─ Send: "✅ Logged running for 30 minutes (280 kcal burned)"
```

---

### Scenario 4: Update Food Entry
```
┌─ Message: "Update my rice entry to 300 calories"
│
├─ Claude (context-aware):
│  - Today's food log:
│    - ID: abc123, Food: 200 grams rice, Calories: 260 kcal (estimated)
│
├─ Claude identifies:
│  - Entry to update: abc123 (rice)
│  - New calories: 300
│
├─ Claude responds (structured action):
│  {
│    "action": "update_calories",
│    "data": {
│      "entryId": "abc123",
│      "calories": 300,
│      "estimatedByAi": false
│    },
│    "userMessage": "✅ Updated rice to 300 kcal"
│  }
│
├─ executeAction → update_calories:
│  └─ UPDATE calorie_entries
│     SET calories = 300, estimatedByAi = false
│     WHERE id = 'abc123'
│
└─ Send: "✅ Updated rice to 300 kcal"
```

---

### Scenario 5: Weekly Summary
```
┌─ Message: "Show me this week's summary"
│
├─ Claude responds (structured action):
│  {
│    "action": "query_summary",
│    "data": {
│      "type": "week",
│      "startDate": "2025-01-06",
│      "endDate": "2025-01-13"
│    },
│    "userMessage": "Generating weekly summary..."
│  }
│
├─ executeAction → query_summary:
│  ├─ generateDateRangeSummary():
│  │  ├─ getEntriesByDateRange(userId, '2025-01-06', '2025-01-13')
│  │  │  └─ SELECT * FROM calorie_entries
│  │  │     WHERE userId = uuid AND entryDate BETWEEN dates
│  │  │     ORDER BY entryDate DESC
│  │  ├─ getExerciseSummaryByDateRange(userId, '2025-01-06', '2025-01-13')
│  │  │  └─ SELECT * FROM exercise_entries
│  │  │     WHERE userId = uuid AND entryDate BETWEEN dates
│  │  └─ Calculate:
│  │     - Total consumed: 12,500 kcal
│  │     - Total burned: 1,800 kcal
│  │     - Daily average: 1,785 kcal consumed
│  │     - Daily average: 257 kcal burned
│  │     - Goal: 2,133 kcal/day (TDEE 2633 - deficit 500)
│  │     - Net average: 1,528 kcal/day
│  │     - Weekly deficit: 4,235 kcal (goal: 3,500)
│  │
│  └─ Format response (multi-language):
│     "📊 **Weekly Summary (Jan 6-13)**
│
│     Food consumed: 12,500 kcal (avg 1,785/day)
│     Exercise burned: 1,800 kcal (avg 257/day)
│     Net calories: 10,700 kcal (avg 1,528/day)
│
│     Goal: 2,133 kcal/day
│     Deficit: 4,235 kcal this week ✅
│
│     You're on track! Keep it up! 💪"
│
└─ Send formatted summary
```

---

### Scenario 6: Split Exercise
```
┌─ Message: "Actually, I did 30 min running and 30 min cycling, not 1 hour cardio"
│
├─ Claude (context-aware):
│  - Today's exercises:
│    - ID: xyz789, Exercise: cardio, Duration: 60 min, Burned: 400 kcal
│
├─ Claude responds (structured action):
│  {
│    "action": "replace_exercise",
│    "data": {
│      "originalExerciseId": "xyz789",
│      "newExercises": [
│        {
│          "exerciseType": "running",
│          "durationMinutes": 30,
│          "caloriesBurned": 280,
│          "metValue": 8.0
│        },
│        {
│          "exerciseType": "cycling",
│          "durationMinutes": 30,
│          "caloriesBurned": 210,
│          "metValue": 6.0
│        }
│      ]
│    },
│    "userMessage": "✅ Updated! Split into:\n- Running: 30 min (280 kcal)\n- Cycling: 30 min (210 kcal)\nTotal: 490 kcal"
│  }
│
├─ executeAction → replace_exercise (transaction):
│  ├─ BEGIN TRANSACTION
│  ├─ DELETE FROM exercise_entries WHERE id = 'xyz789'
│  ├─ INSERT INTO exercise_entries (running, 30min, 280kcal, 8.0)
│  ├─ INSERT INTO exercise_entries (cycling, 30min, 210kcal, 6.0)
│  └─ COMMIT
│
└─ Send: "✅ Updated! Split into:\n- Running: 30 min (280 kcal)\n- Cycling: 30 min (210 kcal)\nTotal: 490 kcal"
```

---

## Performance Optimizations

### 1. Conversation Cache (LRU)
- **Hit Rate:** ~90% for active conversations
- **TTL:** 30 minutes (auto-expire stale data)
- **Size:** 10 messages per user max
- **Benefit:** Reduces DB queries by 90%

### 2. Database Indexes
- **User lookup:** O(1) via UNIQUE index on phoneNumber
- **Daily summary:** O(log n) via composite index (userId, entryDate)
- **Date range queries:** O(log n) via same composite index

### 3. Connection Pooling
- **Runtime:** Supabase Transaction Pooler (pgbouncer, port 6543)
- **Migrations:** Direct connection (port 5432)
- **Pool size:** 10 connections max
- **Timeout:** 2 seconds connection timeout

### 4. Prisma 7 Adapter Pattern
- **Adapter:** @prisma/adapter-pg with node-pg Pool
- **Benefit:** Better serverless compatibility
- **Config:** Separate runtime (DATABASE_URL) vs migration (DIRECT_URL)

---

## Error Handling

### Graceful Degradation
```
User Creation Failed
├─ Send error message to user
├─ Log error to console
└─ Return 200 OK (Telegram expects success)

Database Query Failed
├─ Catch error in try/catch
├─ Log detailed error
├─ Send user-friendly message
└─ Return 200 OK

Claude API Failed
├─ Retry logic (built into SDK)
├─ Timeout after 30 seconds
├─ Send fallback message: "Sorry, I'm having trouble..."
└─ Return 200 OK

Action Execution Failed
├─ Extract error message
├─ Send to user: "Failed to save: [reason]"
└─ Return 200 OK
```

**Philosophy:** Never return 4xx/5xx to Telegram (prevents webhook retry spam)

---

## Key Files Reference

| File | Purpose | Lines of Interest |
|------|---------|-------------------|
| `src/app/api/webhook/route.ts` | Main orchestrator, action execution | 62-609 |
| `src/lib/services/contextAwareProcessor.ts` | Claude integration, system prompt | 42-389 |
| `src/lib/services/actionParser.ts` | Parse JSON actions, extract confirmations | 39-198 |
| `src/lib/cache/conversationCache.ts` | LRU cache + DB fallback | Entire file |
| `src/lib/db/users.ts` | User CRUD operations | Entire file |
| `src/lib/db/calories.ts` | Food entry operations | Entire file |
| `src/lib/db/exercises.ts` | Exercise entry operations | Entire file |
| `src/lib/db/conversations.ts` | Conversation logging | Entire file |
| `src/lib/calculations/bmrCalculator.ts` | BMR, TDEE, daily goal calculations | Entire file |
| `src/lib/calculations/exerciseTracker.ts` | MET values, calorie burn | Entire file |
| `src/lib/telegram.ts` | Telegram API wrappers | Entire file |
| `prisma/schema.prisma` | Database schema | Entire file |
| `prisma.config.ts` | Prisma 7 configuration | Entire file |

---

## Summary

This fitness chatbot follows a **context-aware, conversational AI pattern** where:

1. **Every message** carries full context (profile, history, today's data)
2. **Claude AI** acts as the intelligent layer for:
   - Intent detection
   - Calorie estimation
   - Language detection and response generation
   - Deciding when to save vs ask for confirmation
3. **Structured actions** enable deterministic database operations
4. **Confirmation flow** provides safety before data modification
5. **Multi-language support** is automatic (Claude detects user's language)
6. **Performance** is optimized via caching and indexes

The system is designed for **serverless deployment** (Vercel) with **Supabase PostgreSQL**, using **Prisma 7** as the ORM and **Claude Sonnet 4** as the conversational AI engine.

---

*Last Updated: 2025-01-13*
*Codebase Version: Based on latest production deployment*
