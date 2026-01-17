/**
 * Barrel export for all prompts
 */

// Types
export * from './types';

// Shared utilities
export { LANG_RULES, buildUserContext, buildProfileStatus, formatFoodEntries, formatExerciseEntries } from './shared';

// Prompt builders (require LLM call)
export { buildIntentDetectorPrompt } from './intentDetector';
export { buildConversationPrompt } from './conversationHandler';
export { buildFoodClarificationPrompt } from './foodClarification';
export { buildFoodEstimatorPrompt } from './foodEstimator';
export { buildFoodLoggerPrompt } from './foodLogger';
export { buildFoodUpdatePrompt } from './foodUpdate';
export { buildExerciseClarificationPrompt } from './exerciseClarification';
export { buildExerciseEstimatorPrompt } from './exerciseEstimator';
export { buildExerciseLoggerPrompt } from './exerciseLogger';
export { buildExerciseUpdatePrompt } from './exerciseUpdate';
export { buildSummaryPrompt } from './summaryGenerator';
export { buildSummaryPeriodExtractorPrompt } from './summaryPeriodExtractor';
export { buildProfileSetupPrompt } from './profileSetup';
export { buildProfileUpdatePrompt } from './profileUpdate';
