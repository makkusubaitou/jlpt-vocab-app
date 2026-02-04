import { NextResponse } from 'next/server';
import { db, userSettings } from '@/lib/db';
import { eq } from 'drizzle-orm';

// Get current settings (create default if not exists)
export async function GET() {
  try {
    const settings = await db.select().from(userSettings).limit(1);
    
    if (settings.length === 0) {
      // Create default settings
      const newSettings = await db
        .insert(userSettings)
        .values({
          activePoolSize: 50,
          selectedLevels: 'N5,N4,N3,N2,N1',
        })
        .returning();
      
      return NextResponse.json(newSettings[0]);
    }
    
    return NextResponse.json(settings[0]);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// Update settings
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { activePoolSize, selectedLevels } = body;

    // Get existing settings
    const existing = await db.select().from(userSettings).limit(1);
    
    if (existing.length === 0) {
      // Create new settings
      const newSettings = await db
        .insert(userSettings)
        .values({
          activePoolSize: activePoolSize ?? 50,
          selectedLevels: selectedLevels ?? 'N5,N4,N3,N2,N1',
        })
        .returning();
      
      return NextResponse.json(newSettings[0]);
    }

    // Update existing
    const updated = await db
      .update(userSettings)
      .set({
        ...(activePoolSize !== undefined && { activePoolSize }),
        ...(selectedLevels !== undefined && { selectedLevels }),
        updatedAt: new Date(),
      })
      .where(eq(userSettings.id, existing[0].id))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
