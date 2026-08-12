import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePublicId } from "@/lib/session";

export async function GET() {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        feedbacks: {
          select: {
            vote: true,
          },
        },
        _count: {
          select: { feedbacks: true },
        },
      },
    });

    const formatted = sessions.map((s) => {
      const upVotes = s.feedbacks.filter((f) => f.vote === "UP").length;
      const downVotes = s.feedbacks.filter((f) => f.vote === "DOWN").length;
      const totalVotes = upVotes + downVotes;
      const satisfaction = totalVotes > 0 ? Math.round((upVotes / totalVotes) * 100) : 0;

      return {
        id: s.id,
        publicId: s.publicId,
        name: s.name,
        speaker: s.speaker,
        location: s.location,
        description: s.description,
        status: s.status,
        scheduledAt: s.scheduledAt,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        createdAt: s.createdAt,
        totalVotes,
        upVotes,
        downVotes,
        satisfaction,
      };
    });

    return NextResponse.json({ success: true, sessions: formatted });
  } catch (error: any) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, speaker, location, description, scheduledAt } = body;

    if (!name || !speaker || !location) {
      return NextResponse.json(
        { success: false, error: "Name, Speaker, and Location are required" },
        { status: 400 }
      );
    }

    // Generate unique publicId
    let publicId = generatePublicId();
    let existing = await prisma.session.findUnique({ where: { publicId } });
    while (existing) {
      publicId = generatePublicId();
      existing = await prisma.session.findUnique({ where: { publicId } });
    }

    const newSession = await prisma.session.create({
      data: {
        publicId,
        name,
        speaker,
        location,
        description: description || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: "DRAFT",
        events: {
          create: {
            eventType: "SESSION_CREATED",
            metadata: {
              name,
              speaker,
              location,
              createdVia: "Admin Panel",
            },
          },
        },
      },
    });

    return NextResponse.json(
      { success: true, session: newSession },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create session" },
      { status: 500 }
    );
  }
}
