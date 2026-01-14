-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "calorie_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "calories" DECIMAL(10,2) NOT NULL,
    "food_description" TEXT,
    "estimated_by_ai" BOOLEAN NOT NULL DEFAULT false,
    "entry_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "entry_time" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calorie_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone_number" VARCHAR(20) NOT NULL,
    "message_type" VARCHAR(20),
    "message_body" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "exercise_type" VARCHAR(100) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "calories_burned" DECIMAL(8,2) NOT NULL,
    "met_value" DECIMAL(4,2),
    "entry_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "entry_time" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone_number" VARCHAR(20) NOT NULL,
    "full_name" VARCHAR(100),
    "nickname" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activity_level" VARCHAR(20),
    "age" INTEGER,
    "bmr" DECIMAL(6,2),
    "daily_calorie_goal" DECIMAL(6,2),
    "gender" VARCHAR(10),
    "height_cm" DECIMAL(5,2),
    "preferred_language" VARCHAR(10),
    "profile_completed" BOOLEAN NOT NULL DEFAULT false,
    "tdee" DECIMAL(6,2),
    "weight_kg" DECIMAL(5,2),
    "deficit_target" DECIMAL(6,2),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claude_api_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "model" VARCHAR(50) NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "response" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "total_cost" DECIMAL(10,6) NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claude_api_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone_number" VARCHAR(20) NOT NULL,
    "otp_code" VARCHAR(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_calorie_entries_created" ON "calorie_entries"("created_at");

-- CreateIndex
CREATE INDEX "idx_calorie_entries_user_date" ON "calorie_entries"("user_id", "entry_date");

-- CreateIndex
CREATE INDEX "idx_conversation_logs_created" ON "conversation_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_conversation_logs_phone" ON "conversation_logs"("phone_number");

-- CreateIndex
CREATE INDEX "idx_exercise_entries_user_date" ON "exercise_entries"("user_id", "entry_date");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE INDEX "idx_users_phone" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "claude_api_logs_user_id_created_at_idx" ON "claude_api_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "claude_api_logs_created_at_idx" ON "claude_api_logs"("created_at");

-- CreateIndex
CREATE INDEX "otp_sessions_phone_number_expires_at_idx" ON "otp_sessions"("phone_number", "expires_at");

-- AddForeignKey
ALTER TABLE "calorie_entries" ADD CONSTRAINT "calorie_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_entries" ADD CONSTRAINT "exercise_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claude_api_logs" ADD CONSTRAINT "claude_api_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

