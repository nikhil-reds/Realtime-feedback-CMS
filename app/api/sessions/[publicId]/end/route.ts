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
        status: "COMPLETED",
        endedAt: new Date(),
        events: {
          create: {
            eventType: "SESSION_COMPLETED",
            metadata: {
              timestamp: new Date().toISOString(),
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, session: updated });
  } catch (error: any) {
    console.error("Error ending session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to end session" },
      { status: 500 }
    );
  }
}
