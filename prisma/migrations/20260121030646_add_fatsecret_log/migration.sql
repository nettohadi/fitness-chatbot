-- CreateTable
CREATE TABLE "fatsecret_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "search_query" VARCHAR(255) NOT NULL,
    "result_count" INTEGER NOT NULL,
    "top_result" VARCHAR(255),
    "top_calories" INTEGER,
    "top_serving" VARCHAR(100),
    "cal_per_100g" INTEGER,
    "response_json" JSONB,
    "error_message" TEXT,
    "latency_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fatsecret_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fatsecret_logs_created_at_idx" ON "fatsecret_logs"("created_at");

-- CreateIndex
CREATE INDEX "fatsecret_logs_search_query_idx" ON "fatsecret_logs"("search_query");
