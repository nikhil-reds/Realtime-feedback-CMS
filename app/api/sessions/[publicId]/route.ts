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
      include: {
        feedbacks: {
          orderBy: { createdAt: "desc" },
          take: 50, // Recent feedback items for live activity feed
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 30,
        },
        _count: {
          select: { feedbacks: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    // Calculate votes
    const allFeedbacks = await prisma.feedback.findMany({
      where: { sessionId: session.id },
      select: { vote: true, createdAt: true },
    });

    const upVotes = allFeedbacks.filter((f) => f.vote === "UP").length;
    const downVotes = allFeedbacks.filter((f) => f.vote === "DOWN").length;
    const totalVotes = upVotes + downVotes;
    const satisfaction = totalVotes > 0 ? Math.round((upVotes / totalVotes) * 100) : 0;

    return NextResponse.json({
      success: true,
      session: {
        ...session,
        upVotes,
        downVotes,
        totalVotes,
        satisfaction,
      },
    });
  } catch (error: any) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;
    const body = await req.json();
    const { name, speaker, location, description, scheduledAt } = body;

    const updated = await prisma.session.update({
      where: { publicId },
      data: {
        ...(name && { name }),
        ...(speaker && { speaker }),
        ...(location && { location }),
        ...(description !== undefined && { description }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
      },
    });

    return NextResponse.json({ success: true, session: updated });
  } catch (error: any) {
    console.error("Error updating session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update session" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;

    await prisma.session.delete({
      where: { publicId },
    });

    return NextResponse.json({ success: true, message: "Session deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
