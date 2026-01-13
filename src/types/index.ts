// Database Models
export interface User {
  id: string;
  phoneNumber: string;
  fullName: string | null;
  nickname: string | null;
  createdAt: string;
  updatedAt: string;
  // Fitness Profile
  age: number | null;
  gender: string | null;
  weightKg: { toNumber: () => number } | null;
  heightCm: { toNumber: () => number } | null;
  activityLevel: string | null;
  bmr: { toNumber: () => number } | null;
  tdee: { toNumber: () => number } | null;
  dailyCalorieGoal: { toNumber: () => number } | null;
  deficitTarget: { toNumber: () => number } | null;
  profileCompleted: boolean;
  preferredLanguage: string | null;
}

export interface CalorieEntry {
  id: string;
  userId: string;
  calories: number;
  foodDescription: string | null;
  estimatedByAi: boolean;
  entryDate: string;
  entryTime: string;
  createdAt: string;
}

export interface ConversationLog {
  id: string;
  phoneNumber: string;
  messageType: 'incoming' | 'outgoing';
  messageBody: string;
  createdAt: string;
}

export interface ExerciseEntry {
  id: string;
  userId: string;
  exerciseType: string;
  durationMinutes: number;
  caloriesBurned: { toNumber: () => number };
  metValue: { toNumber: () => number } | null;
  entryDate: string;
  entryTime: string;
  createdAt: string;
}

// Message Types
export enum MessageType {
  DIRECT_CALORIE = 'direct_calorie',
  FOOD_DESCRIPTION = 'food_description',
  QUERY_TODAY = 'query_today',
  QUERY_WEEK = 'query_week',
  HELP = 'help',
  CASUAL_CHAT = 'casual_chat',
  UNKNOWN = 'unknown',
}

export interface ParsedMessage {
  type: MessageType;
  calories?: number;
  description?: string;
}

// Claude API Response
export interface ClaudeCalorieEstimate {
  calories: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

// Twilio Webhook Payload
export interface TwilioWebhookPayload {
  From: string;
  To: string;
  Body: string;
  MessageSid: string;
  AccountSid: string;
  NumMedia?: string;
  [key: string]: string | undefined;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CalorieSummary {
  totalCalories: number;
  entryCount: number;
  entries: CalorieEntry[];
  startDate: string;
  endDate: string;
}

// Database Operation Results
export interface DbResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
