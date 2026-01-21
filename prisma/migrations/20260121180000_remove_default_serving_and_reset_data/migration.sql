-- Remove default_serving and serving_grams columns from food_calories
-- These are no longer needed as we now get calPer100g directly from LLM

ALTER TABLE "food_calories" DROP COLUMN IF EXISTS "default_serving";
ALTER TABLE "food_calories" DROP COLUMN IF EXISTS "serving_grams";

-- Delete all existing food_calories data because the caloriesPer100g values
-- were calculated incorrectly (regex bug extracted decimal digits instead of full number)
-- The system will repopulate with correct values from LLM's calPer100g field
DELETE FROM "food_calories";
