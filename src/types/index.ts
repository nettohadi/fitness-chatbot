// Database Models
export interface User {
  id: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
}

export interface CalorieEntry {
  id: string;
  user_id: string;
  calories: number;
  food_description: string | null;
  estimated_by_ai: boolean;
  entry_date: string;
  entry_time: string;
  created_at: string;
}

export interface ConversationLog {
  id: string;
  phone_number: string;
  message_type: 'incoming' | 'outgoing';
  message_body: string;
  created_at: string;
}

// Message Types
export enum MessageType {
  DIRECT_CALORIE = 'direct_calorie',
  FOOD_DESCRIPTION = 'food_description',
  QUERY_TODAY = 'query_today',
  QUERY_WEEK = 'query_week',
  HELP = 'help',
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
