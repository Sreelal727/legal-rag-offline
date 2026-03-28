/**
 * CLI script to set up a new organization with admin user and seed templates.
 *
 * Usage:
 *   npx tsx scripts/setup-org.ts \
 *     --name "Firm Name" \
 *     --slug "firm-slug" \
 *     --email "admin@email.com" \
 *     --password "pass" \
 *     --address "addr" \
 *     --phone "phone"
 */

import dotenv from "dotenv";
import path from "path";

// Load .env.local first (Next.js convention), fall back to .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { ALL_TEMPLATES } from "../src/lib/court-templates";

// --- Parse CLI args ---
function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--") && i + 1 < argv.length) {
      const key = argv[i].replace(/^--/, "");
      args[key] = argv[i + 1];
      i++;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();

  const orgName = args.name;
  const orgSlug = args.slug;
  const adminEmail = args.email;
  const adminPassword = args.password;
  const address = args.address || "";
  const phone = args.phone || "";

  if (!orgName || !orgSlug || !adminEmail || !adminPassword) {
    console.error(
      "Usage: npx tsx scripts/setup-org.ts --name \"Firm Name\" --slug \"firm-slug\" --email \"admin@email.com\" --password \"pass\" [--address \"addr\"] [--phone \"phone\"]"
    );
    process.exit(1);
  }

  const dbPath = process.env.DATABASE_PATH || "./data/legal-rag.db";
  console.log("Connecting to local SQLite:", dbPath);

  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  const prisma = new PrismaClient({ adapter } as any);

  // Create organization
  const org = await prisma.organization.upsert({
    where: { slug: orgSlug },
    update: {},
    create: {
      name: orgName,
      slug: orgSlug,
      address,
      phone,
      email: adminEmail,
      plan: "PROFESSIONAL",
      maxUsers: 25,
      maxCases: 500,
      maxDocuments: 5000,
      maxAiQueries: 1000,
    },
  });
  console.log(`Organization: ${org.name} (${org.id})`);

  // Create admin user
  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: `Admin - ${orgName}`,
      role: "ADMIN",
      organizationId: org.id,
    },
  });
  console.log(`Admin user: ${admin.email} (${admin.id})`);

  // Seed case templates
  const existingCaseTemplates = await prisma.caseTemplate.findMany({
    where: { organizationId: org.id },
    select: { documentType: true },
  });
  const existingCaseTypes = new Set(existingCaseTemplates.map((t) => t.documentType));

  let caseTemplatesCreated = 0;
  for (const template of ALL_TEMPLATES) {
    if (existingCaseTypes.has(template.documentType)) continue;
    await prisma.caseTemplate.create({
      data: {
        name: template.name,
        category: template.category,
        documentType: template.documentType,
        description: template.description,
        content: template.content,
        variables: template.variables,
        courtType: (template as any).courtType || null,
        organizationId: org.id,
      },
    });
    caseTemplatesCreated++;
  }
  console.log(`Case templates seeded: ${caseTemplatesCreated}`);

  // Seed notice templates
  const noticeTemplates = [
    {
      name: "Legal Notice under Section 80 CPC",
      description: "Mandatory pre-suit notice before filing suit against Government/Public Officer",
      category: "CPC",
      content: `LEGAL NOTICE UNDER SECTION 80 OF THE CODE OF CIVIL PROCEDURE, 1908\n\nTo,\n{{recipientName}}\n{{recipientDesignation}}\n{{recipientAddress}}\n\nDate: {{date}}\n\nSubject: Legal Notice under Section 80 of the Code of Civil Procedure, 1908\n\nSir/Madam,\n\nUnder instructions from and on behalf of my client {{clientName}}, {{clientAddress}}, I do hereby serve upon you the following notice:\n\n1. That my client {{clientDetails}}\n\n2. That {{grievanceDetails}}\n\n3. That my client has suffered loss/damage to the tune of Rs. {{amount}} on account of {{reason}}.\n\n4. That you are hereby called upon to {{demandDetails}} within a period of two months from the date of receipt of this notice, failing which my client shall be constrained to initiate appropriate legal proceedings against you before the competent court of law, at your risk and costs.\n\n5. A copy of this notice is retained in my office for further reference and record.\n\n{{senderName}}\nAdvocate\n{{barCouncilNumber}}\n{{firmAddress}}`,
      variables: JSON.stringify(["recipientName", "recipientDesignation", "recipientAddress", "date", "clientName", "clientAddress", "clientDetails", "grievanceDetails", "amount", "reason", "demandDetails", "senderName", "barCouncilNumber", "firmAddress"]),
    },
    {
      name: "Demand Notice",
      description: "General demand notice for recovery of dues",
      category: "GENERAL",
      content: `DEMAND NOTICE\n\nTo,\n{{recipientName}}\n{{recipientAddress}}\n\nDate: {{date}}\n\nSubject: Demand Notice for Recovery of Rs. {{amount}}\n\nDear Sir/Madam,\n\nUnder instructions from my client {{clientName}}, I hereby serve this demand notice upon you.\n\nMy client states that {{factualBackground}}\n\nThat a sum of Rs. {{amount}} (Rupees {{amountInWords}} only) is due and payable by you to my client on account of {{reason}}.\n\nYou are hereby called upon to pay the aforesaid amount within {{days}} days from the receipt of this notice, failing which my client will be compelled to initiate legal proceedings for recovery of the said amount along with interest, costs and damages.\n\nPlease treat this notice as final opportunity.\n\n{{senderName}}\nAdvocate\n{{barCouncilNumber}}`,
      variables: JSON.stringify(["recipientName", "recipientAddress", "date", "amount", "clientName", "factualBackground", "amountInWords", "reason", "days", "senderName", "barCouncilNumber"]),
    },
    {
      name: "Cheque Bounce Notice (Section 138 NI Act)",
      description: "Statutory notice under Section 138 of the Negotiable Instruments Act, 1881",
      category: "NI_ACT",
      content: `LEGAL NOTICE UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881\n\nTo,\n{{drawerName}}\n{{drawerAddress}}\n\nDate: {{date}}\n\nSubject: Legal Notice under Section 138 of the Negotiable Instruments Act, 1881\n\nDear Sir/Madam,\n\nUnder instructions from my client {{payeeName}}, {{payeeAddress}}, I serve this notice upon you as under:\n\n1. That you had issued Cheque No. {{chequeNumber}} dated {{chequeDate}} for Rs. {{amount}} (Rupees {{amountInWords}} only) drawn on {{bankName}}, Branch: {{branchName}}, in favour of my client towards {{purpose}}.\n\n2. That the said cheque was presented for encashment on {{presentationDate}} but was returned/dishonoured by the bank on {{dishonourDate}} with the remark "{{dishonourReason}}".\n\n3. You are hereby called upon to make the payment of the said sum of Rs. {{amount}} within 15 days from the date of receipt of this notice.\n\n4. In the event of your failure to make the payment within the stipulated period of 15 days, my client shall be constrained to initiate criminal proceedings against you under Section 138 of the Negotiable Instruments Act, 1881.\n\n{{senderName}}\nAdvocate\n{{barCouncilNumber}}`,
      variables: JSON.stringify(["drawerName", "drawerAddress", "date", "payeeName", "payeeAddress", "chequeNumber", "chequeDate", "amount", "amountInWords", "bankName", "branchName", "purpose", "presentationDate", "dishonourDate", "dishonourReason", "senderName", "barCouncilNumber"]),
    },
    {
      name: "Eviction Notice",
      description: "Notice to tenant for eviction under Rent Control Act",
      category: "PROPERTY",
      content: `EVICTION NOTICE\n\nTo,\n{{tenantName}}\n{{tenantAddress}}\n\nDate: {{date}}\n\nSubject: Notice for Eviction of Premises at {{propertyAddress}}\n\nDear Sir/Madam,\n\nUnder instructions from my client {{landlordName}}, the owner/landlord of the premises situated at {{propertyAddress}}, I hereby serve this eviction notice upon you.\n\n{{evictionGrounds}}\n\nYou are hereby required to vacate and hand over peaceful possession of the said premises within {{days}} days from the date of receipt of this notice.\n\nIn the event of your failure to comply, my client shall be constrained to initiate eviction proceedings before the competent authority/court.\n\n{{senderName}}\nAdvocate\n{{barCouncilNumber}}`,
      variables: JSON.stringify(["tenantName", "tenantAddress", "date", "propertyAddress", "landlordName", "evictionGrounds", "days", "senderName", "barCouncilNumber"]),
    },
    {
      name: "Rent Demand Notice",
      description: "Notice demanding payment of rent arrears",
      category: "PROPERTY",
      content: `RENT DEMAND NOTICE\n\nTo,\n{{tenantName}}\n{{tenantAddress}}\n\nDate: {{date}}\n\nSubject: Demand for Payment of Rent Arrears\n\nDear Sir/Madam,\n\nUnder instructions from my client {{landlordName}}, I serve this notice upon you.\n\nMy client is the owner/landlord of premises situated at {{propertyAddress}} which has been let out to you at a monthly rent of Rs. {{monthlyRent}}.\n\nYou have failed to pay rent for the period {{arrearsPeriod}}, and the total arrears amount to Rs. {{totalArrears}} (Rupees {{arrearsInWords}} only).\n\nYou are hereby called upon to pay the entire arrears within {{days}} days from receipt of this notice, failing which eviction proceedings shall be initiated.\n\n{{senderName}}\nAdvocate\n{{barCouncilNumber}}`,
      variables: JSON.stringify(["tenantName", "tenantAddress", "date", "landlordName", "propertyAddress", "monthlyRent", "arrearsPeriod", "totalArrears", "arrearsInWords", "days", "senderName", "barCouncilNumber"]),
    },
    {
      name: "Cease and Desist Notice",
      description: "Notice to cease unlawful activity",
      category: "GENERAL",
      content: `CEASE AND DESIST NOTICE\n\nTo,\n{{recipientName}}\n{{recipientAddress}}\n\nDate: {{date}}\n\nSubject: Cease and Desist Notice\n\nDear Sir/Madam,\n\nThis notice is served on behalf of my client {{clientName}}.\n\nIt has come to the notice of my client that you have been {{unlawfulActivity}}.\n\nSuch conduct on your part constitutes {{legalBasis}} and is in violation of {{applicableLaw}}.\n\nYou are hereby called upon to immediately cease and desist from {{activity}} and {{remedialAction}}.\n\nFailure to comply within {{days}} days shall result in legal proceedings being initiated against you.\n\n{{senderName}}\nAdvocate\n{{barCouncilNumber}}`,
      variables: JSON.stringify(["recipientName", "recipientAddress", "date", "clientName", "unlawfulActivity", "legalBasis", "applicableLaw", "activity", "remedialAction", "days", "senderName", "barCouncilNumber"]),
    },
    {
      name: "Reply to Legal Notice",
      description: "Standard reply/response to a received legal notice",
      category: "GENERAL",
      content: `REPLY TO LEGAL NOTICE\n\nTo,\n{{senderAdvocateName}}\n{{senderAddress}}\n\nDate: {{date}}\n\nSubject: Reply to your Legal Notice dated {{originalNoticeDate}} on behalf of {{clientName}}\n\nDear Sir/Madam,\n\nI have been instructed by my client {{clientName}} to send this reply to your legal notice dated {{originalNoticeDate}}.\n\nAt the outset, the contents of your notice are denied in toto except what is specifically admitted herein.\n\n{{replyContent}}\n\nMy client reserves all rights to take appropriate legal action as may be advised.\n\n{{responderName}}\nAdvocate\n{{barCouncilNumber}}`,
      variables: JSON.stringify(["senderAdvocateName", "senderAddress", "date", "originalNoticeDate", "clientName", "replyContent", "responderName", "barCouncilNumber"]),
    },
  ];

  const existingNotice = await prisma.noticeTemplate.findMany({
    where: { organizationId: org.id },
    select: { name: true },
  });
  const existingNoticeNames = new Set(existingNotice.map((t) => t.name));

  let noticeTemplatesCreated = 0;
  for (const template of noticeTemplates) {
    if (existingNoticeNames.has(template.name)) continue;
    await prisma.noticeTemplate.create({
      data: {
        id: template.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase(),
        organizationId: org.id,
        ...template,
      },
    });
    noticeTemplatesCreated++;
  }
  console.log(`Notice templates seeded: ${noticeTemplatesCreated}`);

  console.log("\n========================================");
  console.log("  Organization Setup Complete!");
  console.log("========================================");
  console.log(`  Organization : ${orgName}`);
  console.log(`  Slug         : ${orgSlug}`);
  console.log(`  Admin Email  : ${adminEmail}`);
  console.log(`  Admin Pass   : ${adminPassword}`);
  console.log(`  Templates    : ${caseTemplatesCreated} case + ${noticeTemplatesCreated} notice`);
  console.log("========================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
