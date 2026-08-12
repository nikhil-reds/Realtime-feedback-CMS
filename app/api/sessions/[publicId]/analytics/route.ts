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
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    const upVotes = session.feedbacks.filter((f) => f.vote === "UP").length;
    const downVotes = session.feedbacks.filter((f) => f.vote === "DOWN").length;
    const totalVotes = upVotes + downVotes;
    const satisfaction = totalVotes > 0 ? Math.round((upVotes / totalVotes) * 100) : 0;

    // Time series grouping by 1-minute or 5-minute buckets
    const timelineMap: Record<string, { time: string; up: number; down: number; total: number }> = {};

    session.feedbacks.forEach((f) => {
      const date = new Date(f.createdAt);
      const timeBucket = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      if (!timelineMap[timeBucket]) {
        timelineMap[timeBucket] = { time: timeBucket, up: 0, down: 0, total: 0 };
      }

      if (f.vote === "UP") timelineMap[timeBucket].up += 1;
      if (f.vote === "DOWN") timelineMap[timeBucket].down += 1;
      timelineMap[timeBucket].total += 1;
    });

    const timeline = Object.values(timelineMap);

    return NextResponse.json({
      success: true,
      analytics: {
        summary: {
          totalVotes,
          upVotes,
          downVotes,
          satisfaction,
        },
        timeline,
      },
    });
  } catch (error: any) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
