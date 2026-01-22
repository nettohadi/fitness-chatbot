import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { clearSettingsCache } from '@/lib/services/settings';

// GET /api/admin/settings - Get all settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.systemSetting.findMany();

    // Convert to key-value object
    const settingsObj: Record<string, string> = {};
    for (const setting of settings) {
      settingsObj[setting.key] = setting.value;
    }

    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings - Update a setting
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Missing key or value' },
        { status: 400 }
      );
    }

    // Validate allowed keys
    const allowedKeys = [
      'food_estimate_model',
      'food_estimate_model_id_gemini',
      'food_estimate_model_id_gpt',
    ];

    if (!allowedKeys.includes(key)) {
      return NextResponse.json(
        { error: 'Invalid setting key' },
        { status: 400 }
      );
    }

    // Validate food_estimate_model value
    if (key === 'food_estimate_model' && !['gemini', 'gpt'].includes(value)) {
      return NextResponse.json(
        { error: 'Invalid value for food_estimate_model. Must be "gemini" or "gpt"' },
        { status: 400 }
      );
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    // Clear cache so next request uses updated value
    clearSettingsCache();

    return NextResponse.json(setting);
  } catch (error) {
    console.error('Error updating setting:', error);
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    );
  }
}
