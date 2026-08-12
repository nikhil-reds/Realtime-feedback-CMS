import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;
    const body = await req.json();
    const { vote, visitorId } = body;

    if (!vote || (vote !== "UP" && vote !== "DOWN")) {
      return NextResponse.json(
        { success: false, error: "Invalid vote type. Must be UP or DOWN" },
        { status: 400 }
      );
    }

    const session = await prisma.session.findUnique({
      where: { publicId },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    if (session.status !== "LIVE") {
      return NextResponse.json(
        {
          success: false,
          error:
            session.status === "COMPLETED"
              ? "This session has ended and is no longer accepting feedback."
              : "This session is not live yet. Please wait for the host to start the session.",
          status: session.status,
        },
        { status: 403 }
      );
    }

    // Capture user-agent & client details
    const userAgent = req.headers.get("user-agent") || undefined;
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipHash = forwardedFor ? forwardedFor.split(",")[0].trim() : "anonymous";

    // Save feedback record
    const feedback = await prisma.feedback.create({
      data: {
        sessionId: session.id,
        vote: vote as "UP" | "DOWN",
        visitorId: visitorId || null,
        ipHash,
        userAgent,
      },
    });

    // Create event log
    await prisma.sessionEvent.create({
      data: {
        sessionId: session.id,
        eventType: vote === "UP" ? "FEEDBACK_UP" : "FEEDBACK_DOWN",
        metadata: {
          vote,
          visitorId: visitorId || null,
          time: new Date().toISOString(),
        },
      },
    });

    // Aggregate updated stats
    const upCount = await prisma.feedback.count({
      where: { sessionId: session.id, vote: "UP" },
    });
    const downCount = await prisma.feedback.count({
      where: { sessionId: session.id, vote: "DOWN" },
    });

    const total = upCount + downCount;
    const satisfaction = total > 0 ? Math.round((upCount / total) * 100) : 0;

    return NextResponse.json({
      success: true,
      feedbackId: feedback.id,
      stats: {
        upVotes: upCount,
        downVotes: downCount,
        totalVotes: total,
        satisfaction,
      },
    });
  } catch (error: any) {
    console.error("Error submitting feedback:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
