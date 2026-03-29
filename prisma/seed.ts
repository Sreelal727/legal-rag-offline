/**
 * Database Seed Script — Clean Product Setup
 *
 * Creates a single admin user and seeds generic notice templates.
 * All values come from environment variables — no hardcoded client data.
 *
 * Required env vars:
 *   ADMIN_EMAIL    — Admin login email    (default: admin@legalrag.com)
 *   ADMIN_NAME     — Admin display name   (default: System Admin)
 *   SEED_PASSWORD  — Password for seeded users (default: changeme123)
 *
 * Usage:
 *   npm run db:seed
 *   SEED_PASSWORD=strongpass ADMIN_EMAIL=me@firm.com npm run db:seed
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

// ---------------------------------------------------------------------------
// Generic notice templates — these are standard Indian legal formats,
// not client-specific. They use {{variable}} placeholders.
// ---------------------------------------------------------------------------

const NOTICE_TEMPLATES = [
  {
    name: "Legal Notice under Section 80 CPC",
    description: "Mandatory pre-suit notice before filing suit against Government/Public Officer",
    category: "CPC",
    content: `LEGAL NOTICE UNDER SECTION 80 OF THE CODE OF CIVIL PROCEDURE, 1908

To,
{{recipientName}}
{{recipientDesignation}}
{{recipientAddress}}

Date: {{date}}

Subject: Legal Notice under Section 80 of the Code of Civil Procedure, 1908

Sir/Madam,

Under instructions from and on behalf of my client {{clientName}}, {{clientAddress}}, I do hereby serve upon you the following notice:

1. That my client {{clientDetails}}

2. That {{grievanceDetails}}

3. That my client has suffered loss/damage to the tune of Rs. {{amount}} on account of {{reason}}.

4. That you are hereby called upon to {{demandDetails}} within a period of two months from the date of receipt of this notice, failing which my client shall be constrained to initiate appropriate legal proceedings against you before the competent court of law, at your risk and costs.

5. A copy of this notice is retained in my office for further reference and record.

{{senderName}}
Advocate
{{barCouncilNumber}}
{{firmAddress}}`,
    variables: JSON.stringify(["recipientName", "recipientDesignation", "recipientAddress", "date", "clientName", "clientAddress", "clientDetails", "grievanceDetails", "amount", "reason", "demandDetails", "senderName", "barCouncilNumber", "firmAddress"]),
  },
  {
    name: "Demand Notice",
    description: "General demand notice for recovery of dues",
    category: "GENERAL",
    content: `DEMAND NOTICE

To,
{{recipientName}}
{{recipientAddress}}

Date: {{date}}

Subject: Demand Notice for Recovery of Rs. {{amount}}

Dear Sir/Madam,

Under instructions from my client {{clientName}}, I hereby serve this demand notice upon you.

My client states that {{factualBackground}}

That a sum of Rs. {{amount}} (Rupees {{amountInWords}} only) is due and payable by you to my client on account of {{reason}}.

You are hereby called upon to pay the aforesaid amount within {{days}} days from the receipt of this notice, failing which my client will be compelled to initiate legal proceedings for recovery of the said amount along with interest, costs and damages.

Please treat this notice as final opportunity.

{{senderName}}
Advocate
{{barCouncilNumber}}`,
    variables: JSON.stringify(["recipientName", "recipientAddress", "date", "amount", "clientName", "factualBackground", "amountInWords", "reason", "days", "senderName", "barCouncilNumber"]),
  },
  {
    name: "Eviction Notice",
    description: "Notice to tenant for eviction under Rent Control Act",
    category: "PROPERTY",
    content: `EVICTION NOTICE

To,
{{tenantName}}
{{tenantAddress}}

Date: {{date}}

Subject: Notice for Eviction of Premises at {{propertyAddress}}

Dear Sir/Madam,

Under instructions from my client {{landlordName}}, the owner/landlord of the premises situated at {{propertyAddress}}, I hereby serve this eviction notice upon you.

{{evictionGrounds}}

You are hereby required to vacate and hand over peaceful possession of the said premises within {{days}} days from the date of receipt of this notice.

In the event of your failure to comply, my client shall be constrained to initiate eviction proceedings before the competent authority/court.

{{senderName}}
Advocate
{{barCouncilNumber}}`,
    variables: JSON.stringify(["tenantName", "tenantAddress", "date", "propertyAddress", "landlordName", "evictionGrounds", "days", "senderName", "barCouncilNumber"]),
  },
  {
    name: "Cease and Desist Notice",
    description: "Notice to cease unlawful activity",
    category: "GENERAL",
    content: `CEASE AND DESIST NOTICE

To,
{{recipientName}}
{{recipientAddress}}

Date: {{date}}

Subject: Cease and Desist Notice

Dear Sir/Madam,

This notice is served on behalf of my client {{clientName}}.

It has come to the notice of my client that you have been {{unlawfulActivity}}.

Such conduct on your part constitutes {{legalBasis}} and is in violation of {{applicableLaw}}.

You are hereby called upon to immediately cease and desist from {{activity}} and {{remedialAction}}.

Failure to comply within {{days}} days shall result in legal proceedings being initiated against you.

{{senderName}}
Advocate
{{barCouncilNumber}}`,
    variables: JSON.stringify(["recipientName", "recipientAddress", "date", "clientName", "unlawfulActivity", "legalBasis", "applicableLaw", "activity", "remedialAction", "days", "senderName", "barCouncilNumber"]),
  },
  {
    name: "Reply to Legal Notice",
    description: "Standard reply/response to a received legal notice",
    category: "GENERAL",
    content: `REPLY TO LEGAL NOTICE

To,
{{senderAdvocateName}}
{{senderAddress}}

Date: {{date}}

Subject: Reply to your Legal Notice dated {{originalNoticeDate}} on behalf of {{clientName}}

Dear Sir/Madam,

I have been instructed by my client {{clientName}} to send this reply to your legal notice dated {{originalNoticeDate}}.

At the outset, the contents of your notice are denied in toto except what is specifically admitted herein.

{{replyContent}}

My client reserves all rights to take appropriate legal action as may be advised.

{{responderName}}
Advocate
{{barCouncilNumber}}`,
    variables: JSON.stringify(["senderAdvocateName", "senderAddress", "date", "originalNoticeDate", "clientName", "replyContent", "responderName", "barCouncilNumber"]),
  },
  {
    name: "Cheque Bounce Notice (Section 138 NI Act)",
    description: "Statutory notice under Section 138 of the Negotiable Instruments Act, 1881",
    category: "NI_ACT",
    content: `LEGAL NOTICE UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881

To,
{{drawerName}}
{{drawerAddress}}

Date: {{date}}

Subject: Legal Notice under Section 138 of the Negotiable Instruments Act, 1881

Dear Sir/Madam,

Under instructions from my client {{payeeName}}, {{payeeAddress}}, I serve this notice upon you as under:

1. That you had issued Cheque No. {{chequeNumber}} dated {{chequeDate}} for Rs. {{amount}} (Rupees {{amountInWords}} only) drawn on {{bankName}}, Branch: {{branchName}}, in favour of my client towards {{purpose}}.

2. That the said cheque was presented for encashment on {{presentationDate}} but was returned/dishonoured by the bank on {{dishonourDate}} with the remark "{{dishonourReason}}".

3. You are hereby called upon to make the payment of the said sum of Rs. {{amount}} within 15 days from the date of receipt of this notice.

4. In the event of your failure to make the payment within the stipulated period of 15 days, my client shall be constrained to initiate criminal proceedings against you under Section 138 of the Negotiable Instruments Act, 1881.

{{senderName}}
Advocate
{{barCouncilNumber}}`,
    variables: JSON.stringify(["drawerName", "drawerAddress", "date", "payeeName", "payeeAddress", "chequeNumber", "chequeDate", "amount", "amountInWords", "bankName", "branchName", "purpose", "presentationDate", "dishonourDate", "dishonourReason", "senderName", "barCouncilNumber"]),
  },
  {
    name: "Rent Demand Notice",
    description: "Notice demanding payment of rent arrears",
    category: "PROPERTY",
    content: `RENT DEMAND NOTICE

To,
{{tenantName}}
{{tenantAddress}}

Date: {{date}}

Subject: Demand for Payment of Rent Arrears

Dear Sir/Madam,

Under instructions from my client {{landlordName}}, I serve this notice upon you.

My client is the owner/landlord of premises situated at {{propertyAddress}} which has been let out to you at a monthly rent of Rs. {{monthlyRent}}.

You have failed to pay rent for the period {{arrearsPeriod}}, and the total arrears amount to Rs. {{totalArrears}} (Rupees {{arrearsInWords}} only).

You are hereby called upon to pay the entire arrears within {{days}} days from receipt of this notice, failing which eviction proceedings shall be initiated.

{{senderName}}
Advocate
{{barCouncilNumber}}`,
    variables: JSON.stringify(["tenantName", "tenantAddress", "date", "landlordName", "propertyAddress", "monthlyRent", "arrearsPeriod", "totalArrears", "arrearsInWords", "days", "senderName", "barCouncilNumber"]),
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const dbPath = process.env.DATABASE_PATH || "./data/legal-rag.db";
  console.log("Connecting to local SQLite:", dbPath);

  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  const prisma = new PrismaClient({ adapter } as any);

  // Read config from env vars
  const orgName = process.env.ORG_NAME || "My Law Firm";
  const orgSlug = process.env.ORG_SLUG || "my-law-firm";
  const orgEmail = process.env.ORG_EMAIL || "";
  const orgAddress = process.env.ORG_ADDRESS || "";
  const orgPhone = process.env.ORG_PHONE || "";

  const adminEmail = process.env.ADMIN_EMAIL || "admin@legalrag.com";
  const adminName = process.env.ADMIN_NAME || "System Admin";
  const seedPassword = process.env.SEED_PASSWORD || "changeme123";
  const hashedPassword = await bcrypt.hash(seedPassword, 12);

  // --- Create organization ---
  const org = await prisma.organization.upsert({
    where: { slug: orgSlug },
    update: {},
    create: {
      name: orgName,
      slug: orgSlug,
      address: orgAddress || null,
      phone: orgPhone || null,
      email: orgEmail || null,
      plan: "PROFESSIONAL",
      maxUsers: 25,
      maxCases: 500,
      maxDocuments: 5000,
      maxAiQueries: 1000,
    },
  });

  // --- Create admin user ---
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: adminName,
      role: "ADMIN",
      organizationId: org.id,
    },
  });

  // --- Seed generic notice templates ---
  let noticeCount = 0;
  for (const template of NOTICE_TEMPLATES) {
    const templateId = template.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    await prisma.noticeTemplate.upsert({
      where: { id: templateId },
      update: {},
      create: {
        id: templateId,
        organizationId: org.id,
        ...template,
      },
    });
    noticeCount++;
  }

  // --- Summary ---
  console.log("\n========================================");
  console.log("  Database Seed Complete");
  console.log("========================================");
  console.log(`  Organization : ${orgName}`);
  console.log(`  Admin Email  : ${adminEmail}`);
  console.log(`  Templates    : ${noticeCount} notice templates`);
  console.log("----------------------------------------");
  console.log("  Set these env vars to customize:");
  console.log("    SEED_PASSWORD, ADMIN_EMAIL, ADMIN_NAME");
  console.log("    ORG_NAME, ORG_SLUG, ORG_EMAIL");
  console.log("========================================\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
