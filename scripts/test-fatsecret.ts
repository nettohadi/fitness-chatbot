/**
 * Test script for FatSecret API integration
 * Run with: npx tsx scripts/test-fatsecret.ts
 */

import 'dotenv/config';
import { searchFoods, parseCaloriesFromDescription, parseServingFromDescription } from '../src/lib/services/fatSecret/client';

async function main() {
  console.log('Testing FatSecret API...\n');

  // Test 1: Search for Indonesian food
  console.log('Test 1: Search "nasi goreng"');
  const nasiGoreng = await searchFoods('nasi goreng', 3);
  if (nasiGoreng.length > 0) {
    console.log(`✅ Found ${nasiGoreng.length} results:`);
    nasiGoreng.forEach((food, i) => {
      const calories = parseCaloriesFromDescription(food.food_description);
      const serving = parseServingFromDescription(food.food_description);
      console.log(`   ${i + 1}. ${food.food_name}`);
      console.log(`      Calories: ${calories} kcal per ${serving}`);
      console.log(`      Description: ${food.food_description}`);
    });
  } else {
    console.log('❌ No results found');
  }

  console.log('\n---\n');

  // Test 2: Search for English food
  console.log('Test 2: Search "fried rice"');
  const friedRice = await searchFoods('fried rice', 3);
  if (friedRice.length > 0) {
    console.log(`✅ Found ${friedRice.length} results:`);
    friedRice.forEach((food, i) => {
      const calories = parseCaloriesFromDescription(food.food_description);
      const serving = parseServingFromDescription(food.food_description);
      console.log(`   ${i + 1}. ${food.food_name}`);
      console.log(`      Calories: ${calories} kcal per ${serving}`);
    });
  } else {
    console.log('❌ No results found');
  }

  console.log('\n---\n');

  // Test 3: Search for another Indonesian food
  console.log('Test 3: Search "ayam goreng"');
  const ayamGoreng = await searchFoods('ayam goreng', 3);
  if (ayamGoreng.length > 0) {
    console.log(`✅ Found ${ayamGoreng.length} results:`);
    ayamGoreng.forEach((food, i) => {
      const calories = parseCaloriesFromDescription(food.food_description);
      const serving = parseServingFromDescription(food.food_description);
      console.log(`   ${i + 1}. ${food.food_name}`);
      console.log(`      Calories: ${calories} kcal per ${serving}`);
    });
  } else {
    console.log('❌ No results found');
  }

  console.log('\n---\n');

  // Test 4: Test the service layer with normalized per-100g values
  console.log('Test 4: Test getBestFoodMatch with per-100g normalization');
  const { getBestFoodMatch, clearCache } = await import('../src/lib/services/fatSecret');

  clearCache(); // Clear cache for fresh test

  const match = await getBestFoodMatch('nasi goreng');
  if (match) {
    console.log(`✅ Best match:`);
    console.log(`   Name: ${match.name}`);
    console.log(`   Calories: ${match.calories} kcal per ${match.serving}`);
    console.log(`   Per 100g: ${match.caloriesPer100g} kcal ← LLM uses this for calculation`);
    console.log(`   Source: ${match.source}`);
    console.log(`   FatSecret ID: ${match.fatSecretId}`);

    // Example calculation
    if (match.caloriesPer100g) {
      const userGrams = 200;
      const estimated = Math.round((userGrams * match.caloriesPer100g) / 100);
      console.log(`\n   Example: User says "200g nasi goreng"`);
      console.log(`   Calculation: ${userGrams}g × ${match.caloriesPer100g}/100 = ${estimated} kcal`);
    }
  } else {
    console.log('❌ No match found');
  }

  console.log('\nDone!');
}

main().catch(console.error);
