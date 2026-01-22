-- CreateTable
CREATE TABLE "system_settings" (
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- Insert default settings
INSERT INTO "system_settings" ("key", "value") VALUES
    ('food_estimate_model', 'gemini'),
    ('food_estimate_model_id_gemini', 'google/gemini-2.5-flash'),
    ('food_estimate_model_id_gpt', 'openai/gpt-4o-mini');
