-- Enable pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateTable
CREATE TABLE "food_calories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "name_normalized" VARCHAR(255) NOT NULL,
    "calories_per_100g" INTEGER NOT NULL,
    "default_serving" VARCHAR(50),
    "serving_grams" INTEGER,
    "source" VARCHAR(20) NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_calories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraint on normalized name
CREATE UNIQUE INDEX "food_calories_name_normalized_key" ON "food_calories"("name_normalized");

-- CreateIndex: GIN trigram index for fuzzy search
CREATE INDEX "food_calorie_name_trgm_idx" ON "food_calories" USING GIN ("name" gin_trgm_ops);
