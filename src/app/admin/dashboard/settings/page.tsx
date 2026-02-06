"use client";

import { useState, useEffect } from "react";

type ModelType = "gemini" | "gpt";

interface Settings {
  food_estimate_model: ModelType;
  food_estimate_model_id_gemini: string;
  food_estimate_model_id_gpt: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettings({
        food_estimate_model: data.food_estimate_model || "gemini",
        food_estimate_model_id_gemini:
          data.food_estimate_model_id_gemini || "google/gemini-2.5-flash",
        food_estimate_model_id_gpt:
          data.food_estimate_model_id_gpt || "openai/gpt-4o",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function updateSetting(key: string, value: string) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update setting");
      }

      // Update local state
      setSettings((prev) =>
        prev ? { ...prev, [key]: value } : null
      );
      setSuccess(`Setting "${key}" updated successfully`);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update setting");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 pt-8">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <div className="animate-pulse bg-card rounded-lg border border-border p-6">
          <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-6 pt-8">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <div className="text-destructive">Failed to load settings</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-8">
      <h1 className="text-2xl font-semibold text-foreground">Settings</h1>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Food Estimation Model */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-medium text-foreground mb-4">
          Food Estimation Model
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Choose which AI model to use for food calorie estimation. This allows
          you to compare accuracy between Gemini and GPT.
        </p>

        <div className="space-y-4">
          {/* Model Toggle */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Active Model
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => updateSetting("food_estimate_model", "gemini")}
                disabled={saving}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  settings.food_estimate_model === "gemini"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                } disabled:opacity-50`}
              >
                Gemini
              </button>
              <button
                onClick={() => updateSetting("food_estimate_model", "gpt")}
                disabled={saving}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  settings.food_estimate_model === "gpt"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                } disabled:opacity-50`}
              >
                GPT
              </button>
            </div>
          </div>

          {/* Model IDs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Gemini Model ID
              </label>
              <input
                type="text"
                value={settings.food_estimate_model_id_gemini}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev
                      ? { ...prev, food_estimate_model_id_gemini: e.target.value }
                      : null
                  )
                }
                onBlur={(e) =>
                  updateSetting("food_estimate_model_id_gemini", e.target.value)
                }
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="google/gemini-2.5-flash"
              />
              <p className="text-xs text-muted-foreground mt-1">
                e.g., google/gemini-2.5-flash, google/gemini-2.0-flash-001
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                GPT Model ID
              </label>
              <input
                type="text"
                value={settings.food_estimate_model_id_gpt}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev
                      ? { ...prev, food_estimate_model_id_gpt: e.target.value }
                      : null
                  )
                }
                onBlur={(e) =>
                  updateSetting("food_estimate_model_id_gpt", e.target.value)
                }
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="openai/gpt-4o"
              />
              <p className="text-xs text-muted-foreground mt-1">
                e.g., openai/gpt-4o, openai/gpt-4.1
              </p>
            </div>
          </div>

          {/* Current Status */}
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Current:</span>{" "}
              {settings.food_estimate_model === "gemini"
                ? settings.food_estimate_model_id_gemini
                : settings.food_estimate_model_id_gpt}
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Info */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-medium text-foreground mb-4">
          Model Pricing Reference
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-foreground">Model</th>
                <th className="text-right py-2 font-medium text-foreground">Input/1M</th>
                <th className="text-right py-2 font-medium text-foreground">Output/1M</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border">
                <td className="py-2">Gemini 2.5 Flash</td>
                <td className="text-right py-2">$0.30</td>
                <td className="text-right py-2">$2.50</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2">Gemini 2.5 Flash-Lite</td>
                <td className="text-right py-2">$0.10</td>
                <td className="text-right py-2">$0.40</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2">GPT-4o Mini</td>
                <td className="text-right py-2">$0.15</td>
                <td className="text-right py-2">$0.60</td>
              </tr>
              <tr>
                <td className="py-2">GPT-4o</td>
                <td className="text-right py-2">$2.50</td>
                <td className="text-right py-2">$10.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
