import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";
import { semanticSearch } from "@/lib/rag/pipeline";
import { chatCompletion, buildRAGPrompt } from "@/lib/llm";
import { searchAndSummarize } from "@/lib/indian-kanoon";
import { format } from "date-fns";

function fmt(d: Date | string | null) {
  if (!d) return "N/A";
  return format(new Date(d), "dd MMM yyyy");
}

async function gatherDatabaseContext(query: string) {
  const sections: string[] = [];
  const q = query.toLowerCase();

  // Always fetch summary counts
  const [clientCount, caseCount, docCount, pendingNotices] = await Promise.all([
    prisma.client.count({ where: { isActive: true } }),
    prisma.case.count({ where: { status: { not: "CLOSED" } } }),
    prisma.document.count(),
    prisma.notice.count({ where: { status: "PENDING_APPROVAL" } }),
  ]);

  sections.push(
    `[SYSTEM OVERVIEW]\nActive Clients: ${clientCount}\nOpen Cases: ${caseCount}\nDocuments: ${docCount}\nPending Notices: ${pendingNotices}`
  );

  // Fetch cases (always useful context)
  const cases = await prisma.case.findMany({
    where: { status: { not: "CLOSED" } },
    include: {
      caseClients: { include: { client: true } },
      caseAssignments: { include: { user: { select: { name: true, role: true } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  if (cases.length > 0) {
    const caseLines = cases.map((c) => {
      const clients = c.caseClients.map((cc) => `${cc.client.name} (${cc.role})`).join(", ");
      const advocates = c.caseAssignments.map((a) => a.user.name).join(", ");
      return `- ${c.caseNumber} | ${c.title} | Type: ${c.caseType} | Status: ${c.status} | Priority: ${c.priority} | Court: ${c.courtName || "N/A"} | Judge: ${c.judge || "N/A"} | Next Hearing: ${fmt(c.nextHearingDate)} | Filing: ${fmt(c.filingDate)} | Clients: ${clients || "None"} | Advocates: ${advocates || "None"}`;
    });
    sections.push(`[CASES]\n${caseLines.join("\n")}`);
  }

  // Fetch clients
  const clients = await prisma.client.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { caseClients: true, invoices: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  if (clients.length > 0) {
    const clientLines = clients.map((c) => {
      return `- ${c.name} | Type: ${c.clientType} | Email: ${c.email || "N/A"} | Phone: ${c.phone || "N/A"} | Address: ${c.address || "N/A"} | Cases: ${c._count.caseClients} | Invoices: ${c._count.invoices}`;
    });
    sections.push(`[CLIENTS]\n${clientLines.join("\n")}`);
  }

  // Upcoming hearings & diary
  const upcomingHearings = await prisma.case.findMany({
    where: {
      nextHearingDate: { gte: new Date() },
      status: "ACTIVE",
    },
    orderBy: { nextHearingDate: "asc" },
    take: 10,
    include: { caseClients: { include: { client: true } } },
  });

  if (upcomingHearings.length > 0) {
    const hearingLines = upcomingHearings.map((c) => {
      const clients = c.caseClients.map((cc) => cc.client.name).join(", ");
      return `- ${fmt(c.nextHearingDate)} | ${c.caseNumber} - ${c.title} | Court: ${c.courtName || "N/A"} | Judge: ${c.judge || "N/A"} | Clients: ${clients}`;
    });
    sections.push(`[UPCOMING HEARINGS]\n${hearingLines.join("\n")}`);
  }

  // Diary entries
  const diaryEntries = await prisma.diaryEntry.findMany({
    orderBy: { date: "desc" },
    take: 15,
    include: { case: { select: { caseNumber: true, title: true } } },
  });

  if (diaryEntries.length > 0) {
    const diaryLines = diaryEntries.map((d) => {
      return `- ${fmt(d.date)} | ${d.caseNumber || d.case?.caseNumber} | ${d.description || "N/A"} | Stage: ${d.stage || "N/A"} | Court: ${d.courtName || "N/A"} | Next: ${fmt(d.nextDate)}`;
    });
    sections.push(`[DIARY ENTRIES]\n${diaryLines.join("\n")}`);
  }

  // Limitation trackers
  if (q.includes("limitation") || q.includes("deadline") || q.includes("expir") || q.includes("urgent")) {
    const trackers = await prisma.limitationTracker.findMany({
      where: { status: "ACTIVE" },
      orderBy: { deadlineDate: "asc" },
      take: 15,
      include: {
        case: { select: { caseNumber: true, title: true } },
        client: { select: { name: true } },
      },
    });

    if (trackers.length > 0) {
      const trackerLines = trackers.map((t) => {
        const daysLeft = Math.ceil((new Date(t.deadlineDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return `- ${t.title} | Category: ${t.category} | Deadline: ${fmt(t.deadlineDate)} | Days Left: ${daysLeft} | Case: ${t.case?.caseNumber || "N/A"} | Client: ${t.client?.name || "N/A"}`;
      });
      sections.push(`[LIMITATION TRACKERS]\n${trackerLines.join("\n")}`);
    }
  }

  // Notices
  if (q.includes("notice") || q.includes("draft") || q.includes("approv") || q.includes("pending")) {
    const notices = await prisma.notice.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        client: { select: { name: true } },
        case: { select: { caseNumber: true } },
        drafter: { select: { name: true } },
        approver: { select: { name: true } },
      },
    });

    if (notices.length > 0) {
      const noticeLines = notices.map((n) => {
        return `- ${n.title} | Status: ${n.status} | Client: ${n.client?.name || "N/A"} | Case: ${n.case?.caseNumber || "N/A"} | Drafted by: ${n.drafter.name} | Approved by: ${n.approver?.name || "Pending"}`;
      });
      sections.push(`[NOTICES]\n${noticeLines.join("\n")}`);
    }
  }

  // Billing - invoices & time entries
  if (q.includes("bill") || q.includes("invoice") || q.includes("payment") || q.includes("revenue") || q.includes("fee") || q.includes("amount") || q.includes("paid") || q.includes("unpaid")) {
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        client: { select: { name: true } },
        case: { select: { caseNumber: true } },
      },
    });

    if (invoices.length > 0) {
      const invoiceLines = invoices.map((inv) => {
        return `- ${inv.invoiceNumber} | Client: ${inv.client.name} | Case: ${inv.case?.caseNumber || "N/A"} | Amount: Rs.${inv.totalAmount.toFixed(2)} (Subtotal: Rs.${inv.subtotal.toFixed(2)} + GST: Rs.${inv.gstAmount.toFixed(2)}) | Status: ${inv.status} | Due: ${fmt(inv.dueDate)} | Paid: ${fmt(inv.paidDate)}`;
      });
      sections.push(`[INVOICES]\n${invoiceLines.join("\n")}`);
    }

    const unbilledEntries = await prisma.timeEntry.findMany({
      where: { isBilled: false },
      orderBy: { date: "desc" },
      take: 15,
      include: {
        user: { select: { name: true } },
        client: { select: { name: true } },
        case: { select: { caseNumber: true } },
      },
    });

    if (unbilledEntries.length > 0) {
      const timeLines = unbilledEntries.map((t) => {
        return `- ${fmt(t.date)} | ${t.description} | ${t.hours}hrs @ Rs.${t.rate}/hr = Rs.${t.amount} | By: ${t.user.name} | Client: ${t.client?.name || "N/A"} | Case: ${t.case?.caseNumber || "N/A"}`;
      });
      sections.push(`[UNBILLED TIME ENTRIES]\n${timeLines.join("\n")}`);
    }
  }

  // Schedule events
  if (q.includes("schedule") || q.includes("calendar") || q.includes("event") || q.includes("today") || q.includes("tomorrow") || q.includes("week") || q.includes("upcoming")) {
    const events = await prisma.scheduleEvent.findMany({
      where: { date: { gte: new Date() } },
      orderBy: { date: "asc" },
      take: 15,
    });

    if (events.length > 0) {
      const eventLines = events.map((e) => {
        return `- ${fmt(e.date)} | ${e.title} | Type: ${e.eventType} | ${e.description || ""}`;
      });
      sections.push(`[UPCOMING SCHEDULE]\n${eventLines.join("\n")}`);
    }
  }

  return sections.join("\n\n");
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("chat:use");
  if (error) return error;

  const { message, sessionId, caseId, documentId } = await request.json();

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Get or create chat session
  let chatSession;
  if (sessionId) {
    chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
    });
  }

  if (!chatSession) {
    chatSession = await prisma.chatSession.create({
      data: {
        userId: session!.user.id,
        title: message.substring(0, 50),
        caseId: caseId || null,
        documentId: documentId || null,
      },
      include: { messages: true },
    });
  }

  // Save user message
  await prisma.chatMessage.create({
    data: {
      sessionId: chatSession.id,
      role: "USER",
      content: message,
    },
  });

  // Gather live database context
  const dbContext = await gatherDatabaseContext(message);

  // Perform semantic search on uploaded documents
  let docContext: string[] = [];
  let sources: any[] = [];
  try {
    const searchResults = await semanticSearch(message, caseId, 10);
    docContext = searchResults.map((r) => r.content).filter((c): c is string => c !== null);
    sources = searchResults.map((r) => ({
      content: (r.content || "").substring(0, 200),
      document: r.metadata.documentTitle,
      relevance: ((1 - r.distance) * 100).toFixed(1),
    }));
  } catch (err) {
    console.error("Semantic search failed:", err);
  }

  // Check if this is a document drafting request — if so, find matching format samples
  const q = message.toLowerCase();
  const draftKeywords = ["draft", "prepare", "write", "create", "generate", "format", "notice", "petition", "affidavit", "suit", "application", "complaint", "reply", "statement", "scrutiny"];
  const isDraftRequest = draftKeywords.some((kw) => q.includes(kw));
  let matchedFormatSampleId: string | null = null;

  if (isDraftRequest) {
    try {
      const formatSamples = await prisma.formatSample.findMany({
        where: { isActive: true },
        select: { id: true, name: true, category: true, subcategory: true, textContent: true },
        take: 3,
      });

      // Try to find the most relevant format sample based on message content
      const categoryMap: Record<string, string[]> = {
        LEGAL_NOTICE: ["notice", "legal notice", "cheque bounce", "138", "recovery"],
        BANK_SCRUTINY_REPORT: ["bank", "scrutiny", "account", "transaction"],
        SUIT_FORMAT: ["suit", "civil suit", "plaint"],
        FAMILY_COURT_PETITION: ["family", "divorce", "custody", "maintenance", "domestic"],
        COUNTER_STATEMENT: ["counter", "reply", "written statement", "defence"],
        AFFIDAVIT: ["affidavit", "sworn", "declaration"],
        MACT_WRITTEN_STATEMENT: ["mact", "motor accident", "accident claim"],
        INTERLOCUTORY_APPLICATION: ["interlocutory", "interim", "application", "ia"],
        DLSA_PETITION: ["dlsa", "legal aid", "legal services"],
        EXECUTION_PETITION: ["execution", "decree", "enforce"],
        COMMERCIAL_SUIT: ["commercial", "commercial suit", "trade"],
      };

      let matchedSamples = formatSamples;
      for (const [category, keywords] of Object.entries(categoryMap)) {
        if (keywords.some((kw) => q.includes(kw))) {
          const categoryMatch = await prisma.formatSample.findMany({
            where: { isActive: true, category },
            select: { id: true, name: true, category: true, subcategory: true, textContent: true },
            take: 2,
          });
          if (categoryMatch.length > 0) {
            matchedSamples = categoryMatch;
            break;
          }
        }
      }

      if (matchedSamples.length > 0) {
        matchedFormatSampleId = matchedSamples[0].id;
        const formatContext = matchedSamples.map((s) =>
          `[Format: ${s.name} | Category: ${s.category}${s.subcategory ? ` | Sub: ${s.subcategory}` : ""}]\n${s.textContent.substring(0, 3000)}`
        ).join("\n\n---\n\n");
        docContext.push(`FORMAT LIBRARY SAMPLES (use these as structural references for drafting):\n${formatContext}`);
      }
    } catch (err) {
      console.error("Format sample lookup failed:", err);
    }
  }

  // Search Indian Kanoon for case law when the query involves legal research
  const legalKeywords = ["section", "act", "judgment", "case law", "precedent", "ruling", "court", "supreme court", "high court", "ipc", "crpc", "cpc", "constitution", "article", "order", "bail", "quash", "writ", "habeas", "mandamus", "certiorari", "appeal", "revision", "review", "sentence", "conviction", "acquittal", "decree", "injunction", "specific relief", "limitation", "evidence", "witness", "cognizable", "bailable", "anticipatory", "compensation", "negligence", "defamation", "fraud", "breach", "contract", "tort", "property", "succession", "inheritance", "motor vehicle", "consumer", "arbitration", "negotiable instrument", "138", "420", "302", "498", "354", "506", "34"];
  const isLegalQuery = legalKeywords.some((kw) => q.includes(kw));

  if (isLegalQuery) {
    try {
      const ikContext = await searchAndSummarize(message, 5);
      if (ikContext) {
        docContext.push(ikContext);
      }
    } catch (err) {
      console.error("Indian Kanoon search failed:", err);
    }
  }

  // Build prompt with both database and document context
  const messages = buildRAGPrompt(message, docContext, dbContext);

  // Include recent chat history for continuity
  if (chatSession.messages && chatSession.messages.length > 0) {
    const history = chatSession.messages.slice(-10).map((m) => ({
      role: m.role.toLowerCase() as "user" | "assistant",
      content: m.content,
    }));
    // Insert history between system prompt and current user message
    messages.splice(1, 0, ...history);
  }

  try {
    const response = await chatCompletion(messages);

    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        role: "ASSISTANT",
        content: response,
        sources: sources.length > 0 ? JSON.stringify(sources) : null,
      },
    });

    return NextResponse.json({
      sessionId: chatSession.id,
      message: response,
      sources,
      formatSampleId: matchedFormatSampleId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `AI response failed: ${err.message}` },
      { status: 500 }
    );
  }
}
