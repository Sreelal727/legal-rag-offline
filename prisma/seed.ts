import dotenv from "dotenv";
import path from "path";

// Load .env.local first (Next.js convention), fall back to .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

async function main() {
  const dbPath = process.env.DATABASE_PATH || "./data/legal-rag.db";
  console.log("Connecting to local SQLite:", dbPath);

  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  const prisma = new PrismaClient({ adapter } as any);
  const seedPassword = process.env.SEED_PASSWORD || "changeme123";
  const hashedPassword = await bcrypt.hash(seedPassword, 12);

  // Create default organization
  const org = await prisma.organization.upsert({
    where: { id: "default-org" },
    update: {},
    create: {
      id: "default-org",
      name: "Kumar & Associates",
      slug: "kumar-associates",
      address: "123, Law Chambers, High Court Road, Mumbai - 400001",
      phone: "+91-22-23456789",
      email: "office@kumarassociates.com",
      gstin: "27AABCK1234A1Z5",
      plan: "PROFESSIONAL",
      maxUsers: 25,
      maxCases: 500,
      maxDocuments: 5000,
      maxAiQueries: 1000,
    },
  });

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@legalrag.com" },
    update: {},
    create: {
      email: "admin@legalrag.com",
      password: hashedPassword,
      name: "System Admin",
      role: "ADMIN",
      phone: "+91-9999999999",
      organizationId: org.id,
    },
  });

  // Create demo senior advocate
  const senior = await prisma.user.upsert({
    where: { email: "senior@legalrag.com" },
    update: {},
    create: {
      email: "senior@legalrag.com",
      password: await bcrypt.hash(seedPassword, 12),
      name: "Adv. Rajesh Kumar",
      role: "SENIOR_ADVOCATE",
      phone: "+91-9876543210",
      barCouncilNumber: "MAH/1234/2005",
      organizationId: org.id,
    },
  });

  // Create demo junior advocate
  await prisma.user.upsert({
    where: { email: "junior@legalrag.com" },
    update: {},
    create: {
      email: "junior@legalrag.com",
      password: await bcrypt.hash(seedPassword, 12),
      name: "Adv. Priya Sharma",
      role: "JUNIOR_ADVOCATE",
      phone: "+91-9876543211",
      barCouncilNumber: "DEL/5678/2018",
      organizationId: org.id,
    },
  });

  // Create clerk
  await prisma.user.upsert({
    where: { email: "clerk@legalrag.com" },
    update: {},
    create: {
      email: "clerk@legalrag.com",
      password: await bcrypt.hash(seedPassword, 12),
      name: "Ramesh Patel",
      role: "CLERK",
      phone: "+91-9876543212",
      organizationId: org.id,
    },
  });

  // Create intern
  await prisma.user.upsert({
    where: { email: "intern@legalrag.com" },
    update: {},
    create: {
      email: "intern@legalrag.com",
      password: await bcrypt.hash(seedPassword, 12),
      name: "Ananya Singh",
      role: "INTERN",
      phone: "+91-9876543213",
      organizationId: org.id,
    },
  });

  // Notice templates
  const templates = [
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

  for (const template of templates) {
    await prisma.noticeTemplate.upsert({
      where: { id: template.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() },
      update: {},
      create: {
        id: template.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
        organizationId: org.id,
        ...template,
      },
    });
  }

  // Sample clients
  const client1 = await prisma.client.upsert({
    where: { id: "client-1" },
    update: {},
    create: {
      id: "client-1",
      organizationId: org.id,
      name: "Mahesh Industries Pvt. Ltd.",
      email: "mahesh@industries.com",
      phone: "+91-9812345678",
      address: "45, Industrial Area, Phase-II, Pune - 411001",
      clientType: "COMPANY",
      gstNumber: "27AABCM1234K1Z5",
      notes: "Long-standing client. Multiple ongoing matters.",
    },
  });

  const client2 = await prisma.client.upsert({
    where: { id: "client-2" },
    update: {},
    create: {
      id: "client-2",
      organizationId: org.id,
      name: "Smt. Kavita Deshmukh",
      email: "kavita.d@gmail.com",
      phone: "+91-9823456789",
      address: "12, Shivaji Nagar, Mumbai - 400028",
      clientType: "INDIVIDUAL",
      aadharNumber: "1234-5678-9012",
      notes: "Property dispute matter.",
    },
  });

  // Sample case
  const case1 = await prisma.case.upsert({
    where: { caseNumber: "CS/123/2024" },
    update: {},
    create: {
      organizationId: org.id,
      caseNumber: "CS/123/2024",
      title: "Mahesh Industries vs. ABC Traders - Recovery Suit",
      description: "Recovery suit for unpaid invoices worth Rs. 25,00,000",
      caseType: "CIVIL",
      courtName: "City Civil Court, Mumbai",
      courtType: "DISTRICT_COURT",
      judge: "Hon'ble Judge S.M. Patil",
      filingDate: new Date("2024-03-15"),
      nextHearingDate: new Date("2026-03-20"),
      status: "ACTIVE",
      priority: "HIGH",
    },
  });

  // Link client to case
  await prisma.caseClient.upsert({
    where: { caseId_clientId: { caseId: case1.id, clientId: client1.id } },
    update: {},
    create: {
      caseId: case1.id,
      clientId: client1.id,
      role: "PETITIONER",
    },
  });

  // Assign senior advocate
  await prisma.caseAssignment.upsert({
    where: { caseId_userId: { caseId: case1.id, userId: senior.id } },
    update: {},
    create: {
      caseId: case1.id,
      userId: senior.id,
      role: "LEAD",
    },
  });

  // Sample diary entry
  await prisma.diaryEntry.create({
    data: {
      organizationId: org.id,
      caseId: case1.id,
      date: new Date("2026-03-20"),
      courtName: "City Civil Court, Mumbai",
      caseNumber: "CS/123/2024",
      description: "Arguments on behalf of plaintiff",
      stage: "Arguments",
      nextDate: new Date("2026-04-10"),
    },
  });

  console.log("Seed completed successfully!");
  console.log(`All users seeded with password: ${seedPassword}`);
  console.log("Admin: admin@legalrag.com");
  console.log("Senior Advocate: senior@legalrag.com");
  console.log("Junior Advocate: junior@legalrag.com");
  console.log("Clerk: clerk@legalrag.com");
  console.log("Intern: intern@legalrag.com");
  console.log("Set SEED_PASSWORD env var to customize the password.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
