import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateVisitorCode } from "@/lib/session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;
    const body = await req.json();
    const { vote, rating, visitorId, visitorCode: incomingCode } = body;

    let voteType: "UP" | "DOWN" | null = null;
    if (vote === "UP" || vote === "DOWN") {
      voteType = vote;
    } else if (typeof rating === "number" && rating >= 1 && rating <= 7) {
      voteType = rating <= 3 ? "UP" : "DOWN";
    }

    if (!voteType) {
      return NextResponse.json(
        { success: false, error: "Invalid vote type or rating. Must be UP/DOWN or rating 1-7" },
        { status: 400 }
      );
    }
    const finalVote = voteType;
    const finalRating: number =
      typeof rating === "number" && rating >= 1 && rating <= 7
        ? rating
        : finalVote === "UP"
        ? 2
        : 6;

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

    // 15-Minute Cooldown Check (900,000 ms)
    const COOLDOWN_MS = 15 * 60 * 1000;
    const cookieHeader = req.headers.get("cookie") || "";
    const cooldownCookieName = `fb_cooldown_${publicId}`;

    // Check if cooldown cookie exists in request
    let cookieTimestamp: number | null = null;
    const match = cookieHeader.match(new RegExp(`${cooldownCookieName}=([^;]+)`));
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed)) cookieTimestamp = parsed;
    }

    const now = Date.now();
    let lastVoteTime: number | null = cookieTimestamp;

    // Also check DB for recent vote by visitorId or IP in the last 15 minutes
    if (!lastVoteTime && visitorId) {
      const recentVote = await prisma.feedback.findFirst({
        where: {
          sessionId: session.id,
          visitorId: visitorId,
          createdAt: {
            gte: new Date(now - COOLDOWN_MS),
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (recentVote) {
        lastVoteTime = new Date(recentVote.createdAt).getTime();
      }
    }

    // If a vote occurred within the last 15 minutes, reject request
    if (lastVoteTime && now - lastVoteTime < COOLDOWN_MS) {
      const elapsed = now - lastVoteTime;
      const remainingMs = COOLDOWN_MS - elapsed;
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);

      return NextResponse.json(
        {
          success: false,
          error: `Feedback cooldown active. You can submit feedback again in ${remainingMinutes} minute${
            remainingMinutes > 1 ? "s" : ""
          }.`,
          remainingSeconds,
          cooldownMs: remainingMs,
        },
        { status: 429 }
      );
    }

    // Capture user-agent & client details
    const userAgent = req.headers.get("user-agent") || undefined;
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipHash = forwardedFor ? forwardedFor.split(",")[0].trim() : "anonymous";

    // Resolve visitor code: reuse the cookie-retained code if the client already has one,
    // otherwise mint a new one that's unique within this session.
    const validIncomingCode =
      typeof incomingCode === "string" && /^[A-Z0-9]{4}$/.test(incomingCode) ? incomingCode : null;

    let visitorCode: string = validIncomingCode ?? "";
    if (!validIncomingCode) {
      let candidate = generateVisitorCode();
      while (
        await prisma.feedback.findFirst({
          where: { sessionId: session.id, visitorCode: candidate },
        })
      ) {
        candidate = generateVisitorCode();
      }
      visitorCode = candidate;
    }

    // Save feedback record
    const feedback = await prisma.feedback.create({
      data: {
        sessionId: session.id,
        vote: finalVote,
        rating: finalRating,
        visitorId: visitorId || null,
        visitorCode,
        ipHash,
        userAgent,
      },
    });

    // Create event log
    await prisma.sessionEvent.create({
      data: {
        sessionId: session.id,
        eventType: finalVote === "UP" ? "FEEDBACK_UP" : "FEEDBACK_DOWN",
        metadata: {
          vote: finalVote,
          rating: finalRating,
          visitorId: visitorId || null,
          visitorCode,
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

    // Create response and set 15-minute HTTP cookie
    const response = NextResponse.json({
      success: true,
      feedbackId: feedback.id,
      visitorCode,
      cooldownMs: COOLDOWN_MS,
      stats: {
        upVotes: upCount,
        downVotes: downCount,
        totalVotes: total,
        satisfaction,
      },
    });

    // Set 15-minute cooldown cookie (900 seconds = 15 minutes)
    response.cookies.set(cooldownCookieName, now.toString(), {
      httpOnly: false, // Accessible to client JS for live countdown
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });

    // Persist the visitor code for a year so returning visitors keep the same identity
    response.cookies.set(`pulse_code_${publicId}`, visitorCode, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error: any) {
    console.error("Error submitting feedback:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
