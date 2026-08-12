import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    // Calculate votes and build time-series aggregation for 3 realtime graphs
    const allFeedbacks = await prisma.feedback.findMany({
      where: { sessionId: session.id },
      select: { vote: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const upVotes = allFeedbacks.filter((f) => f.vote === "UP").length;
    const downVotes = allFeedbacks.filter((f) => f.vote === "DOWN").length;
    const totalVotes = upVotes + downVotes;
    const satisfaction = totalVotes > 0 ? Math.round((upVotes / totalVotes) * 100) : 0;

    // Group feedbacks into continuous minute buckets from session start to now/end
    const sessionStartTime = new Date(session.startedAt || session.createdAt);
    const sessionEndTime = session.endedAt ? new Date(session.endedAt) : new Date();

    // Ensure clean minute timestamps without milliseconds
    let startTime = new Date(sessionStartTime.getTime());
    startTime.setSeconds(0, 0);
    startTime.setMilliseconds(0);

    let endTime = new Date(sessionEndTime.getTime());
    endTime.setSeconds(0, 0);
    endTime.setMilliseconds(0);

    // If duration is less than 5 minutes, pad to a 5-minute window for visual timeline continuity
    if (endTime.getTime() - startTime.getTime() < 4 * 60 * 1000) {
      startTime = new Date(endTime.getTime() - 4 * 60 * 1000);
    }

    // Helper to get minute ISO key (e.g., 2026-08-12T05:49:00.000Z)
    const getMinuteKey = (date: Date) => {
      const copy = new Date(date.getTime());
      copy.setSeconds(0, 0);
      copy.setMilliseconds(0);
      return copy.toISOString();
    };

    // Map votes to minute timestamps
    const voteBucketMap = new Map<string, { up: number; down: number }>();
    allFeedbacks.forEach((f) => {
      const key = getMinuteKey(new Date(f.createdAt));
      if (!voteBucketMap.has(key)) {
        voteBucketMap.set(key, { up: 0, down: 0 });
      }
      const b = voteBucketMap.get(key)!;
      if (f.vote === "UP") b.up += 1;
      if (f.vote === "DOWN") b.down += 1;
    });

    // Generate continuous minute-by-minute buckets
    const timeSeries: Array<{
      timestamp: string;
      timeLabel: string;
      up: number;
      down: number;
      total: number;
      cumUp: number;
      cumDown: number;
      cumTotal: number;
      cumSatisfaction: number;
      velocity: number;
    }> = [];

    let curr = new Date(startTime.getTime());
    let cumulativeUp = 0;
    let cumulativeDown = 0;

    // Prior cumulative count before startTime (if any)
    allFeedbacks.forEach((f) => {
      if (new Date(f.createdAt) < startTime) {
        if (f.vote === "UP") cumulativeUp += 1;
        if (f.vote === "DOWN") cumulativeDown += 1;
      }
    });

    while (curr.getTime() <= endTime.getTime()) {
      const iso = getMinuteKey(curr);
      const timeLabel = curr.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const votesInBucket = voteBucketMap.get(iso) || { up: 0, down: 0 };

      cumulativeUp += votesInBucket.up;
      cumulativeDown += votesInBucket.down;
      const bucketTotal = votesInBucket.up + votesInBucket.down;
      const cumTotal = cumulativeUp + cumulativeDown;
      const cumSatisfaction = cumTotal > 0 ? Math.round((cumulativeUp / cumTotal) * 100) : 0;

      timeSeries.push({
        timestamp: iso,
        timeLabel,
        up: votesInBucket.up,
        down: votesInBucket.down,
        total: bucketTotal,
        cumUp: cumulativeUp,
        cumDown: cumulativeDown,
        cumTotal,
        cumSatisfaction,
        velocity: bucketTotal,
      });

      // Increment by 1 minute
      curr = new Date(curr.getTime() + 60 * 1000);
    }

    return NextResponse.json({
      success: true,
      session: {
        ...session,
        upVotes,
        downVotes,
        totalVotes,
        satisfaction,
        allFeedbacks,
        timeSeries,
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
