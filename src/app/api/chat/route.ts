import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";
import { semanticSearch } from "@/lib/rag/pipeline";
import { searchFormats } from "@/lib/rag/format-pipeline";
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

  // Check if this is a document drafting request — if so, find matching format samples via semantic search
  const q = message.toLowerCase();
  const draftKeywords = ["draft", "prepare", "write", "create", "generate", "format", "notice", "petition", "affidavit", "suit", "application", "complaint", "reply", "statement", "scrutiny"];
  const isDraftRequest = draftKeywords.some((kw) => q.includes(kw));
  let matchedFormatSampleId: string | null = null;

  if (isDraftRequest) {
    try {
      // Use semantic search on ChromaDB "legal_formats" collection
      const formatResults = await searchFormats(message, 2);

      if (formatResults.length > 0) {
        matchedFormatSampleId = formatResults[0].formatSampleId;

        // Fetch full text content from DB for the matched formats
        const matchedIds = formatResults.map((r) => r.formatSampleId);
        const fullSamples = await prisma.formatSample.findMany({
          where: { id: { in: matchedIds }, isActive: true },
          select: { id: true, name: true, category: true, subcategory: true, textContent: true },
        });

        if (fullSamples.length > 0) {
          const formatContext = fullSamples.map((s) => {
            const relevance = formatResults.find((r) => r.formatSampleId === s.id);
            const score = relevance ? ((1 - relevance.bestDistance) * 100).toFixed(1) : "N/A";
            return `[Format: ${s.name} | Category: ${s.category}${s.subcategory ? ` | Sub: ${s.subcategory}` : ""} | Relevance: ${score}%]\n${s.textContent.substring(0, 4000)}`;
          }).join("\n\n---\n\n");
          docContext.push(`FORMAT LIBRARY SAMPLES (use these as structural references for drafting):\n${formatContext}`);
        }
      } else {
        // Fallback: if ChromaDB has no indexed formats, use DB keyword matching
        const fallbackSamples = await prisma.formatSample.findMany({
          where: { isActive: true },
          select: { id: true, name: true, category: true, subcategory: true, textContent: true },
          take: 2,
        });

        if (fallbackSamples.length > 0) {
          matchedFormatSampleId = fallbackSamples[0].id;
          const formatContext = fallbackSamples.map((s) =>
            `[Format: ${s.name} | Category: ${s.category}${s.subcategory ? ` | Sub: ${s.subcategory}` : ""}]\n${s.textContent.substring(0, 3000)}`
          ).join("\n\n---\n\n");
          docContext.push(`FORMAT LIBRARY SAMPLES (use these as structural references for drafting):\n${formatContext}`);
        }
      }
    } catch (err) {
      console.error("Format sample lookup failed:", err);
      // Fallback to simple DB query if semantic search fails
      try {
        const fallbackSamples = await prisma.formatSample.findMany({
          where: { isActive: true },
          select: { id: true, name: true, category: true, subcategory: true, textContent: true },
          take: 2,
        });
        if (fallbackSamples.length > 0) {
          matchedFormatSampleId = fallbackSamples[0].id;
          const formatContext = fallbackSamples.map((s) =>
            `[Format: ${s.name} | Category: ${s.category}]\n${s.textContent.substring(0, 3000)}`
          ).join("\n\n---\n\n");
          docContext.push(`FORMAT LIBRARY SAMPLES:\n${formatContext}`);
        }
      } catch {}
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

  // Check if user is asking for documents related to a case
  const docRequestKeywords = ["document", "documents", "files", "file", "download", "get all", "show all", "list all", "give me", "send me", "attached", "attachments", "uploaded"];
  const isDocRequest = docRequestKeywords.some((kw) => q.includes(kw));
  let caseDocuments: any[] = [];

  if (isDocRequest) {
    try {
      // Try to find which case the user is asking about
      const allCases = await prisma.case.findMany({
        where: { status: { not: "CLOSED" } },
        select: { id: true, caseNumber: true, title: true },
      });

      let matchedCaseId: string | null = caseId || null;

      if (!matchedCaseId) {
        // Try matching case number or title from the message
        for (const c of allCases) {
          if (q.includes(c.caseNumber.toLowerCase()) || q.includes(c.title.toLowerCase())) {
            matchedCaseId = c.id;
            break;
          }
          // Also try partial matches on case number parts
          const parts = c.caseNumber.toLowerCase().split(/[\/\-\s]+/);
          if (parts.length > 1 && parts.some((p) => p.length > 2 && q.includes(p))) {
            matchedCaseId = c.id;
            break;
          }
        }
      }

      if (matchedCaseId) {
        const docs = await prisma.document.findMany({
          where: { caseId: matchedCaseId },
          select: {
            id: true,
            title: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        });
        caseDocuments = docs;

        if (docs.length > 0) {
          const docList = docs.map((d) => `- ${d.title} (${d.fileName}, ${(d.fileSize / 1024).toFixed(1)} KB)`).join("\n");
          docContext.push(`DOCUMENTS FOUND FOR THIS CASE:\n${docList}\n\nTell the user these documents are available for download below your response.`);
        } else {
          docContext.push("No documents were found uploaded for this case. Let the user know.");
        }
      } else {
        // If no specific case matched, search all documents
        const allDocs = await prisma.document.findMany({
          select: {
            id: true,
            title: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            createdAt: true,
            case: { select: { caseNumber: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        });
        if (allDocs.length > 0) {
          caseDocuments = allDocs;
          const docList = allDocs.map((d) => `- ${d.title} (${d.fileName}) ${d.case ? `| Case: ${d.case.caseNumber}` : ""}`).join("\n");
          docContext.push(`ALL AVAILABLE DOCUMENTS:\n${docList}\n\nList these documents for the user and mention they are available for download below.`);
        }
      }
    } catch (err) {
      console.error("Document lookup failed:", err);
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

    // Parse action blocks and document blocks from AI response
    let displayMessage = response;
    let documentContent: string | null = null;
    let actionResult: { type: string; success: boolean; message: string; data?: any } | null = null;

    // Extract document block (the actual legal document for export)
    const docMatch = response.match(/```document\s*\n([\s\S]*?)\n```/);
    if (docMatch) {
      documentContent = docMatch[1].trim();
      // Keep the document visible in chat but strip the code fence markers for display
      displayMessage = displayMessage
        .replace(/```document\s*\n/, "\n")
        .replace(/\n```(\s*$|\s*\n)/, "\n")
        .trim();
    }

    const actionMatch = response.match(/```action\s*\n([\s\S]*?)\n```/);
    if (actionMatch) {
      try {
        const action = JSON.parse(actionMatch[1].trim());
        displayMessage = response.replace(/```action\s*\n[\s\S]*?\n```/, "").trim();

        if (action.type === "CREATE_CLIENT") {
          const { name, email, phone, address, clientType, panNumber, aadharNumber, gstNumber, notes } = action.data;
          if (!name) {
            actionResult = { type: "CREATE_CLIENT", success: false, message: "Client name is required." };
          } else {
            const newClient = await prisma.client.create({
              data: {
                name,
                email: email || null,
                phone: phone || null,
                address: address || null,
                clientType: clientType || "INDIVIDUAL",
                panNumber: panNumber || null,
                aadharNumber: aadharNumber || null,
                gstNumber: gstNumber || null,
                notes: notes || null,
              },
            });
            actionResult = {
              type: "CREATE_CLIENT",
              success: true,
              message: `Client "${newClient.name}" has been saved successfully!`,
              data: { id: newClient.id, name: newClient.name },
            };
            displayMessage += `\n\n**Client "${newClient.name}" has been saved successfully to the system.**`;
          }
        } else if (action.type === "CREATE_CASE") {
          const { caseNumber, title, clientName, description, caseType, courtName, courtType, judge, filingDate, status: caseStatus, priority } = action.data;
          if (!caseNumber || !title || !clientName) {
            actionResult = { type: "CREATE_CASE", success: false, message: "Case number, title, and client name are required." };
          } else {
            // Find the client
            const client = await prisma.client.findFirst({
              where: { name: { contains: clientName } },
            });
            if (!client) {
              actionResult = { type: "CREATE_CASE", success: false, message: `Client "${clientName}" not found. Please create the client first.` };
              displayMessage += `\n\n**Could not create the case — client "${clientName}" was not found in the system. Please add the client first.**`;
            } else {
              const newCase = await prisma.case.create({
                data: {
                  caseNumber,
                  title,
                  description: description || null,
                  caseType: caseType || "CIVIL",
                  courtName: courtName || null,
                  courtType: courtType || null,
                  judge: judge || null,
                  filingDate: filingDate ? new Date(filingDate) : null,
                  status: caseStatus || "ACTIVE",
                  priority: priority || "MEDIUM",
                  caseClients: {
                    create: {
                      clientId: client.id,
                      role: "PETITIONER",
                    },
                  },
                },
              });
              actionResult = {
                type: "CREATE_CASE",
                success: true,
                message: `Case "${newCase.caseNumber} - ${newCase.title}" has been saved successfully!`,
                data: { id: newCase.id, caseNumber: newCase.caseNumber, title: newCase.title },
              };
              displayMessage += `\n\n**Case "${newCase.caseNumber} - ${newCase.title}" has been saved successfully and linked to client "${client.name}".**`;
            }
          }
        }
      } catch (parseErr) {
        console.error("Failed to parse/execute action block:", parseErr);
      }
    }

    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        role: "ASSISTANT",
        content: displayMessage,
        sources: sources.length > 0 ? JSON.stringify(sources) : null,
      },
    });

    return NextResponse.json({
      sessionId: chatSession.id,
      message: displayMessage,
      documentContent,
      sources,
      formatSampleId: matchedFormatSampleId,
      actionResult,
      documents: caseDocuments.length > 0 ? caseDocuments : undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `AI response failed: ${err.message}` },
      { status: 500 }
    );
  }
}
