import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { findUserByEmail } from "@/modules/auth/repositories/user.repository";
import { z } from "zod";

/** Read the session user from the frontend cookie forwarded in the request. */
async function getSessionUser(request: NextRequest) {
  // The frontend sends its session cookie in every request (same domain via BFF proxy)
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/sentinews_session=([^;]+)/);
  if (!match) return null;

  try {
    const decoded = decodeURIComponent(match[1]);
    return JSON.parse(decoded) as { email: string; name: string; role: string };
  } catch {
    return null;
  }
}

const preferencesSchema = z.object({
  favoriteStocks: z.array(z.string()).optional(),
  preferredSectors: z.array(z.string()).optional(),
  notificationPreferences: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      alerts: z.boolean().optional(),
    })
    .optional(),
});

/**
 * GET /api/v1/user/preferences
 * Returns the user's stored preferences from the database.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser?.email) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const user = await findUserByEmail(sessionUser.email);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const preference = await prisma.preference.findUnique({
      where: { userId: user.id },
    });

    // Fetch watchlist from user's own column (stored as JSON field if exists, else empty)
    // Currently schema has Preference model for notification prefs. FavoriteStocks
    // are kept in the session cookie as the schema doesn't yet have a JSON field.
    // This GET endpoint returns what's available.
    return NextResponse.json({
      success: true,
      data: {
        emailAlerts: preference?.emailAlerts ?? true,
        inAppAlerts: preference?.inAppAlerts ?? true,
        weeklyDigest: preference?.weeklyDigest ?? true,
      },
    });
  } catch (error) {
    console.error("[/api/v1/user/preferences GET]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

/**
 * PUT /api/v1/user/preferences
 * Upserts user preferences in the database.
 */
export async function PUT(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser?.email) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = preferencesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? "Validation failed" },
        { status: 422 }
      );
    }

    const user = await findUserByEmail(sessionUser.email);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Upsert notification preferences into the Preference table
    const notifPrefs = parsed.data.notificationPreferences ?? {};
    await prisma.preference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        emailAlerts: notifPrefs.email ?? true,
        inAppAlerts: notifPrefs.alerts ?? true,
        weeklyDigest: notifPrefs.push ?? false,
      },
      update: {
        ...(notifPrefs.email !== undefined && { emailAlerts: notifPrefs.email }),
        ...(notifPrefs.alerts !== undefined && { inAppAlerts: notifPrefs.alerts }),
        ...(notifPrefs.push !== undefined && { weeklyDigest: notifPrefs.push }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Preferences saved.",
      data: parsed.data,
    });
  } catch (error) {
    console.error("[/api/v1/user/preferences PUT]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
