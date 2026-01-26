import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getBestFoodMatch, saveFoodCalorie } from "@/lib/services/foodCalorie/service"
import { estimateCaloriesWithClaude } from "@/lib/services/calorieEstimator"

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { foodName, portion } = body

    if (!foodName || typeof foodName !== "string") {
      return NextResponse.json(
        { error: "Food name is required" },
        { status: 400 }
      )
    }

    // Combine food name and portion for better context
    const searchTerm = foodName.trim()
    const fullDescription = portion
      ? `${searchTerm} ${portion}`.trim()
      : searchTerm

    // Step 1: Try to find in cached food calories database
    const cachedFood = await getBestFoodMatch(searchTerm)

    if (cachedFood && cachedFood.similarity && cachedFood.similarity >= 0.5) {
      // Good match found - calculate calories based on portion if provided
      let estimatedCalories = cachedFood.caloriesPer100g

      // Try to extract portion from user input and calculate
      // Support decimal values and various gram notations
      const portionMatch = fullDescription.match(/(\d+(?:\.\d+)?)\s*(?:g|gr|gram|grams)/i)
      if (portionMatch) {
        const grams = parseFloat(portionMatch[1])
        estimatedCalories = Math.round((cachedFood.caloriesPer100g * grams) / 100)
      }

      return NextResponse.json({
        estimatedCalories,
        caloriesPer100g: cachedFood.caloriesPer100g,
        source: "cached" as const,
        confidence: cachedFood.similarity >= 0.8 ? "high" : "medium",
        matchedFood: cachedFood.name,
      })
    }

    // Step 2: Use AI to estimate if not found in cache
    const aiEstimate = await estimateCaloriesWithClaude(fullDescription)

    if (aiEstimate.calories > 0) {
      // Save the AI estimate to database for future use
      // Calculate per 100g if we can determine portion
      const portionMatch = fullDescription.match(/(\d+(?:\.\d+)?)\s*(?:g|gr|gram|grams)/i)
      if (portionMatch) {
        const grams = parseFloat(portionMatch[1])
        const caloriesPer100g = Math.round((aiEstimate.calories * 100) / grams)

        // Save to food calorie cache
        await saveFoodCalorie({
          name: searchTerm,
          caloriesPer100g,
          source: "ai",
        }).catch((err) => {
          console.error("Failed to save AI estimate to cache:", err)
        })

        return NextResponse.json({
          estimatedCalories: aiEstimate.calories,
          caloriesPer100g,
          source: "ai" as const,
          confidence: aiEstimate.confidence,
        })
      }

      // No portion info - use calories directly and estimate per 100g
      // Assume the user described a standard portion (~150g)
      const assumedGrams = 150
      const caloriesPer100g = Math.round(
        (aiEstimate.calories * 100) / assumedGrams
      )

      await saveFoodCalorie({
        name: searchTerm,
        caloriesPer100g,
        source: "ai",
      }).catch((err) => {
        console.error("Failed to save AI estimate to cache:", err)
      })

      return NextResponse.json({
        estimatedCalories: aiEstimate.calories,
        caloriesPer100g,
        source: "ai" as const,
        confidence: aiEstimate.confidence,
      })
    }

    // AI couldn't estimate
    return NextResponse.json(
      {
        error: "Could not estimate calories for this food",
        reasoning: aiEstimate.reasoning,
      },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error estimating calories:", error)
    return NextResponse.json(
      { error: "Failed to estimate calories" },
      { status: 500 }
    )
  }
}
