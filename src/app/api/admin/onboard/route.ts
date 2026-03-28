import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";
import { ALL_TEMPLATES } from "@/lib/court-templates";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("settings:write");
  if (error) return error;

  try {
    const body = await request.json();
    const {
      orgName,
      orgSlug,
      address,
      phone,
      email,
      gstin,
      adminName,
      adminEmail,
      adminPassword,
      advocateNames,
      barCouncilNumbers,
    } = body;

    // Validate required fields
    if (!orgName || !orgSlug || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "orgName, orgSlug, adminName, adminEmail, and adminPassword are required" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });
    if (existingOrg) {
      return NextResponse.json(
        { error: `Organization with slug "${orgSlug}" already exists` },
        { status: 409 }
      );
    }

    // Check if admin email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: `User with email "${adminEmail}" already exists` },
        { status: 409 }
      );
    }

    // Create the organization
    const organization = await prisma.organization.create({
      data: {
        name: orgName,
        slug: orgSlug,
        address: address || null,
        phone: phone || null,
        email: email || null,
        gstin: gstin || null,
        plan: "PROFESSIONAL",
        maxUsers: 25,
        maxCases: 500,
        maxDocuments: 5000,
        maxAiQueries: 1000,
      },
    });

    // Create admin user
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 12);
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedAdminPassword,
        name: adminName,
        role: "ADMIN",
        organizationId: organization.id,
      },
    });

    const users = [adminUser];

    // Create additional advocate users if provided
    if (advocateNames && advocateNames.length > 0) {
      for (let i = 0; i < advocateNames.length; i++) {
        const advocateName = advocateNames[i];
        const barCouncilNumber = barCouncilNumbers?.[i] || null;
        // Generate email from name if not provided
        const advocateSlug = advocateName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ".")
          .replace(/^\.+|\.+$/g, "");
        const advocateEmail = `${advocateSlug}@${orgSlug}.legalrag.com`;

        // Default password same as admin for initial setup
        const hashedAdvPassword = await bcrypt.hash(adminPassword, 12);

        const advocate = await prisma.user.create({
          data: {
            email: advocateEmail,
            password: hashedAdvPassword,
            name: advocateName,
            role: "SENIOR_ADVOCATE",
            barCouncilNumber,
            organizationId: organization.id,
          },
        });
        users.push(advocate);
      }
    }

    // Seed case templates from court-templates.ts
    let templatesCreated = 0;
    for (const template of ALL_TEMPLATES) {
      await prisma.caseTemplate.create({
        data: {
          name: template.name,
          category: template.category,
          documentType: template.documentType,
          description: template.description,
          content: template.content,
          variables: template.variables,
          courtType: (template as any).courtType || null,
          organizationId: organization.id,
        },
      });
      templatesCreated++;
    }

    // Seed default notice templates
    const noticeTemplates = [
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
    ];

    let noticeTemplatesCreated = 0;
    for (const template of noticeTemplates) {
      await prisma.noticeTemplate.create({
        data: {
          id: template.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase(),
          organizationId: organization.id,
          ...template,
        },
      });
      noticeTemplatesCreated++;
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: "ONBOARD_ORGANIZATION",
        entity: "Organization",
        entityId: organization.id,
        details: `Onboarded organization "${orgName}" with ${users.length} users and ${templatesCreated + noticeTemplatesCreated} templates`,
        organizationId: getOrgId(session!),
      },
    });

    return NextResponse.json(
      {
        organization,
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
        })),
        templatesCreated: templatesCreated + noticeTemplatesCreated,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Onboard error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to onboard organization" },
      { status: 500 }
    );
  }
}
