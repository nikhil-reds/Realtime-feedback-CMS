import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;

    const existing = await prisma.session.findUnique({
      where: { publicId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.session.update({
      where: { publicId },
      data: {
        status: "LIVE",
        startedAt: existing.startedAt || new Date(),
        events: {
          create: {
            eventType: "SESSION_STARTED",
            metadata: {
              timestamp: new Date().toISOString(),
              previousStatus: existing.status,
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, session: updated });
  } catch (error: any) {
    console.error("Error starting session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to start session" },
      { status: 500 }
    );
  }
}
