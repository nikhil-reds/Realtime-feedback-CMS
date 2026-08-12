import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;

    const session = await prisma.session.findUnique({
      where: { publicId },
      select: { id: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    const events = await prisma.sessionEvent.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, events });
  } catch (error: any) {
    console.error("Error fetching session events:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch session events" },
      { status: 500 }
    );
  }
}
