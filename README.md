# Realtime Feedback CMS — Dynamic Session Architecture

A session-centric realtime feedback system designed for experience centers, lectures, workshops, and events. Every lecture/event is managed as an isolated live session with its own lifecycle, dynamic QR code, feedback stream, and analytics.

---

## 🏗️ Architecture Overview

```text
                    ADMIN
                      │
                      ▼
              Create New Session
                      │
                      ▼
              Dynamic Session ID
                 e.g. 8FJ29K
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
     Generate QR             Admin Live View
          │                       │
          ▼                       │
  /feedback/8FJ29K               │
          │                       │
          ▼                       │
      STUDENTS                    │
          │                       │
       👍 / 👎                    │
          │                       │
          ▼                       │
       Database                  │
          │                       │
          ▼                       │
    Realtime Event ──────────────┘
          │
          ▼
    Live Analytics
```

---

## ⚡ Core Concept: Dynamic Sessions

Instead of a single, static feedback URL (`/feedback`), every event or lecture receives a unique, isolated session identifier:

- Lecture A: `/feedback/8FJ29K`
- Lecture B: `/feedback/72KD91`
- Lecture C: `/feedback/X92MKA`

> [!IMPORTANT]
> **Session Isolation**: Each session is completely isolated in the database (`WHERE publicId = ?` or `WHERE sessionId = ?`). Realtime subscriptions on the admin dashboard bind specifically to the active `sessionId`.

---

## 🔄 Session Lifecycle

Each session progresses through a clean lifecycle:

```text
  ┌─────────┐        Start Session        ┌────────┐        End Session        ┌───────────┐
  │  DRAFT  │ ──────────────────────────► │  LIVE  │ ────────────────────────► │ COMPLETED │
  └─────────┘                             └────────┘                           └───────────┘
```

| Status | Description | Student Access | QR Code Display |
| :--- | :--- | :--- | :--- |
| `DRAFT` | Session created, configuration being verified | ❌ Closed / Unavailable | ⚠️ Admin Preview Only |
| `LIVE` | Session in progress, accepts real-time feedback | ✅ Active (👍 / 👎) | ✅ Displayed on Projector |
| `COMPLETED` | Session ended, analytics archived | ❌ Closed ("Session Ended") | ℹ️ Static Thank You View |

*(Extensible in future versions to include `PAUSED` and `CANCELLED` states).*

---

## 📱 User & Admin Flows

```text
ADMIN                                               PROJECTOR / DISPLAY                                     STUDENTS
  │                                                          │                                                 │
  ├─ 1. Create Session (/admin/sessions/new)                 │                                                 │
  │    └── Generates Public ID: 8FJ29K                       │                                                 │
  │                                                          │                                                 │
  ├─ 2. Click [ Start Session ]                              │                                                 │
  │    └── Status: DRAFT ➔ LIVE                              │                                                 │
  │                                                          │                                                 │
  ├─ 3. Open Display View ─────────────────────────────────► │ 4. Shows Title & Dynamic QR                     │
  │                                                          │    (https://.../feedback/8FJ29K)                │
  │                                                          │                                  Scan QR        │
  │                                                          │ ──────────────────────────────────────────────► │
  │                                                                                                            │ 5. Land on /feedback/8FJ29K
  │                                                                                                            │    (Validates & displays 👍 / 👎)
  │                                                                                                            │
  │                                                          │                                  Submit Vote    │
  │ 7. Realtime Dashboard updates ◄──────────────────────────┼──────────────────────────────────────────────── │
  │    (👍 87 | 👎 13 | Live Timeline)                       │   PostgreSQL ➔ Supabase Realtime                │
  │                                                          │                                                 │
  ├─ 8. Click [ End Session ]                                │                                                 │
  │    └── Status: LIVE ➔ COMPLETED                          │ 9. Display updates: Session Closed ───────────► │ 10. Student view displays:
  │                                                          │                                                 │     "Session Ended"
  └─ 11. Review Historical Analytics                         │                                                 │
```

---

## 📺 QR Display Page (`/admin/sessions/[publicId]/display`)

Designed for big-screen projectors in Experience Centers and lecture halls:

```text
┌───────────────────────────────────────────────────────────┐
│                                                           │
│               AI & FUTURE TECHNOLOGY                      │
│                                                           │
│                   GIVE FEEDBACK                           │
│                                                           │
│                     ████████                              │
│                     ██ QR ██                              │
│                     ████████                              │
│                                                           │
│                    Scan Me                                │
│                                                           │
│                 👍        👎                              │
│                                                           │
│            Feedback updates in real-time                  │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema Specification

```prisma
enum SessionStatus {
  DRAFT
  LIVE
  PAUSED
  COMPLETED
  CANCELLED
}

enum VoteType {
  UP
  DOWN
}

model Session {
  id          String        @id @default(uuid())
  publicId    String        @unique // e.g. "8FJ29K" for QR & URLs
  name        String
  description String?
  speaker     String
  location    String
  status      SessionStatus @default(DRAFT)
  scheduledAt DateTime?
  startedAt   DateTime?
  endedAt     DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  feedbacks   Feedback[]
  events      SessionEvent[]

  @@index([publicId])
  @@index([status])
}

model Feedback {
  id        String   @id @default(uuid())
  sessionId String
  session   Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  visitorId String?  // Optional anonymous cookie/device identifier
  vote      VoteType
  ipHash    String?
  userAgent String?
  createdAt DateTime @default(now())

  @@index([sessionId])
  @@index([createdAt])
}

model SessionEvent {
  id        String   @id @default(uuid())
  sessionId String
  session   Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  eventType String   // SESSION_CREATED, SESSION_STARTED, QR_GENERATED, FEEDBACK_UP, FEEDBACK_DOWN, SESSION_COMPLETED
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([sessionId])
}
```

---

## 🛣️ Application Routing

```text
experience-center-feedback/
│
├── app/
│   ├── (student)/
│   │   └── feedback/
│   │       └── [publicId]/
│   │           └── page.tsx         # Student vote interface (👍 / 👎)
│   │
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx             # Admin authentication
│   │   ├── dashboard/
│   │   │   └── page.tsx             # Global overview & metrics
│   │   └── sessions/
│   │       ├── page.tsx             # Session management list
│   │       ├── new/
│   │       │   └── page.tsx         # Create dynamic session form
│   │       └── [publicId]/
│   │           ├── page.tsx         # Dynamic session real-time control room
│   │           ├── qr/
│   │           │   └── page.tsx     # Downloadable/printable QR code view
│   │           ├── display/
│   │           │   └── page.tsx     # Projector / Kiosk full-screen view
│   │           └── analytics/
│   │               └── page.tsx     # Post-session historical reporting
│   │
│   └── api/
│       └── sessions/
│           ├── route.ts             # POST (Create), GET (List)
│           └── [publicId]/
│               ├── route.ts         # GET (Details), PATCH (Update)
│               ├── start/
│               │   └── route.ts     # POST (DRAFT ➔ LIVE)
│               ├── end/
│               │   └── route.ts     # POST (LIVE ➔ COMPLETED)
│               ├── feedback/
│               │   └── route.ts     # POST (Submit vote)
│               ├── analytics/
│               │   └── route.ts     # GET (Aggregated metrics)
│               └── events/
│                   └── route.ts     # GET (Audit log events)
```

---

## 📡 API Endpoints Summary

### Sessions

- `POST /api/sessions`: Create new session (`name`, `speaker`, `location`, `description`, `scheduledAt`). Returns `publicId` (e.g. `8FJ29K`).
- `GET /api/sessions`: Fetch session list filtered by status/date.
- `GET /api/sessions/:publicId`: Fetch details of a single session.
- `POST /api/sessions/:publicId/start`: Transition session status to `LIVE`.
- `POST /api/sessions/:publicId/end`: Transition session status to `COMPLETED`.

### Feedback & Analytics

- `POST /api/sessions/:publicId/feedback`: Submit vote (`vote`: `"UP"` \| `"DOWN"`). Validates `status === 'LIVE'`.
- `GET /api/sessions/:publicId/analytics`: Returns realtime/historical aggregates (total responses, positive %, negative %, timeline intervals).
- `GET /api/sessions/:publicId/events`: Fetch full lifecycle audit trail (`SESSION_CREATED`, `FEEDBACK_UP`, etc.).

---

## 💻 Tech Stack & Integrations

- **Framework**: Next.js (App Router, React 19, TypeScript)
- **Database & ORM**: PostgreSQL with Prisma ORM
- **Realtime Layer**: Supabase Realtime (Postgres Changes / WebSockets)
- **Styling**: Modern CSS Modules / TailwindCSS with dark mode & high-contrast display layout
- **QR Engine**: `qrcode.react` / `node-qrcode`
- **Analytics & Charts**: Recharts / Chart.js

---

## 🚀 Future Scalability

Because feedback is tied to an isolated **Session Entity**, the architecture seamlessly supports future capabilities without core redesigns:
- Multi-question feedback & star ratings
- Live audience polling & Q&A
- Sentiment analysis & textual feedback comments
- Multi-room / Multi-Experience Center management
