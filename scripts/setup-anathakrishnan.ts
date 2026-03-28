/**
 * Setup script for Advocate G. Ananthakrishnan - Gouriankar Associates, Palakkad.
 *
 * Creates org, users, seeds ALL standard templates, plus custom templates
 * specific to Ananthakrishnan's practice.
 *
 * Usage:
 *   npx tsx scripts/setup-anathakrishnan.ts
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

// ---------------------------------------------------------------------------
// Custom templates specific to Ananthakrishnan's Palakkad practice
// ---------------------------------------------------------------------------

const CUSTOM_CASE_TEMPLATES = [
  // 1. EP Affidavit (Palakkad Court)
  {
    name: "Execution Petition Affidavit - Palakkad",
    category: "EXECUTION",
    documentType: "EP_AFFIDAVIT",
    description: "Affidavit in support of Execution Petition before the Subordinate Judge of Palakkad",
    courtType: "DISTRICT_COURT",
    variables: JSON.stringify([
      "courtName", "osNumber", "osYear", "epNumber", "epYear",
      "bankName", "bankBranch", "respondentName",
      "deponentName", "deponentRelation", "deponentAge", "affidavitDate",
    ]),
    content: `IN THE COURT OF THE {{courtName}}

O.S. No. {{osNumber}}/{{osYear}}
E.P. No. {{epNumber}}/{{epYear}}

{{bankName}}, {{bankBranch}} Branch,
rep. by its Branch Manager
                                              ... Petitioner/Decree-holder

              VERSUS

{{respondentName}}
                                              ... Respondent/Judgement-debtor

AFFIDAVIT

I, {{deponentName}}, {{deponentRelation}}, aged {{deponentAge}} years, the Branch Manager of {{bankName}}, {{bankBranch}} Branch, do hereby solemnly affirm and state as follows:

1. That I am the Branch Manager of {{bankName}}, {{bankBranch}} Branch, the decree-holder in the above Execution Petition and am competent and authorized to swear this affidavit on behalf of the decree-holder bank.

2. That I am well acquainted with the facts and circumstances of the case and am competent to swear this affidavit.

3. That O.S. No. {{osNumber}}/{{osYear}} was decreed in favour of the petitioner bank against the respondent/judgement-debtor and the decree has become final and executable.

4. That the respondent/judgement-debtor has not paid any amount towards the decree amount despite the decree being passed, and no amount has been adjusted or paid towards satisfaction of the decree.

5. That I have made due and diligent enquiries and I am satisfied that the respondent/judgement-debtor is possessed of sufficient means to satisfy the decree but is wilfully refusing and neglecting to pay the decreed amount.

6. That the respondent/judgement-debtor has not preferred any appeal against the decree passed in O.S. No. {{osNumber}}/{{osYear}} and the decree has become final.

7. That this affidavit is sworn in support of the Execution Petition filed by the decree-holder for the recovery of the decreed amount.

8. That the facts stated herein are true and correct to my knowledge and belief, and nothing material has been concealed therefrom.

DEPONENT

Place: Palakkad
Date: {{affidavitDate}}

VERIFICATION:
I, {{deponentName}}, the deponent above named, do hereby verify that the contents of paragraphs 1 to 8 of the above affidavit are true and correct to my personal knowledge and belief. No part of this affidavit is false and nothing material has been concealed therefrom.

Verified at Palakkad on this {{affidavitDate}}.

                                                      DEPONENT`,
  },

  // 2. EP Statement (12-field format)
  {
    name: "Execution Petition Statement - Palakkad",
    category: "EXECUTION",
    documentType: "EP_STATEMENT",
    description: "12-field structured Execution Petition statement for Palakkad courts",
    courtType: "DISTRICT_COURT",
    variables: JSON.stringify([
      "courtName", "osNumber", "osYear", "epNumber", "epYear",
      "plaintiffName", "plaintiffBranch", "defendantName",
      "decreeDate", "appealPreferred", "paymentAdjustment",
      "previousApplication", "assignmentOfDecree",
      "amountDecreed", "costAwarded", "interestAmount",
      "interestRate", "interestFromDate", "interestToDate",
      "interestDays", "totalBalance", "stampCost", "noticeBatta",
      "ecCost", "advocateFees", "totalOtherCosts",
      "executeAgainst", "modeOfAssistance",
      "petitionDate", "verificationName", "schedulContent",
    ]),
    content: `IN THE COURT OF THE {{courtName}}

O.S. No. {{osNumber}}/{{osYear}}
E.P. No. {{epNumber}}/{{epYear}}

EXECUTION PETITION STATEMENT

1. No. of the Suit             : O.S. No. {{osNumber}}/{{osYear}}

2. Name of the Plaintiff       : {{plaintiffName}}, {{plaintiffBranch}} Branch,
                                  rep. by its Branch Manager

3. Name of the Defendant       : {{defendantName}}

4. Date of the Decree          : {{decreeDate}}

5. Whether any appeal has been : {{appealPreferred}}
   preferred against the decree

6. Whether any payment or      : {{paymentAdjustment}}
   adjustment has been made
   towards the decree

7. Whether there has been any  : {{previousApplication}}
   previous application for
   execution of the decree,
   if so, with what result

8. Whether there has been any  : {{assignmentOfDecree}}
   assignment of the decree,
   if so, by whom

9. Amount Decreed with interest:
   (a) Amount Decreed           : Rs. {{amountDecreed}}/-
   (b) Cost awarded             : Rs. {{costAwarded}}/-
   (c) Interest @ {{interestRate}}%
       from {{interestFromDate}}
       to {{interestToDate}}
       ({{interestDays}} days)  : Rs. {{interestAmount}}/-
                                  _______________
       Total                    : Rs. {{totalBalance}}/-

10. Other Costs:
    (a) Stamp cost              : Rs. {{stampCost}}/-
    (b) Notice & Batta          : Rs. {{noticeBatta}}/-
    (c) E.C. Cost               : Rs. {{ecCost}}/-
    (d) Advocate fees            : Rs. {{advocateFees}}/-
                                  _______________
        Total                   : Rs. {{totalOtherCosts}}/-

11. Against whom to be executed: {{executeAgainst}}

12. Mode of assistance required: {{modeOfAssistance}}

SCHEDULE OF PROPERTY
{{schedulContent}}

Place: Palakkad
Date: {{petitionDate}}

                                              PETITIONER
                                              through Advocate

VERIFICATION:
I, {{verificationName}}, the authorized representative of the petitioner/decree-holder, do hereby verify that the contents of the above statement are true and correct to my knowledge and belief, and nothing material has been concealed therefrom.

Verified at Palakkad on this {{petitionDate}}.

                                              PETITIONER`,
  },

  // 3. Bank Loan Recovery Notice
  {
    name: "Bank Loan Recovery Notice - Palakkad",
    category: "BANKING",
    documentType: "BANK_LOAN_NOTICE",
    description: "Bank loan recovery demand notice on Gourisankar & Ananthakrishnan letterhead",
    courtType: null,
    variables: JSON.stringify([
      "recipientName", "recipientAddress",
      "bankName", "bankBranch", "loanType", "loanAmount",
      "accountNumber", "loanPurpose", "loanDate",
      "instalmentAmount", "amountPaid", "balanceOutstanding",
      "interestFromDate", "noticeCost", "noticeDate", "daysToComply",
    ]),
    content: `GOURISANKAR & ANANTHAKRISHNAN
ADVOCATES
Lakshmi Sadan, H.P.O College Road,
Palakkad - 678 001, Kerala
Phone: 0491-2544549

                                              Registered with A.D.

Date: {{noticeDate}}

To,
{{recipientName}}
{{recipientAddress}}

Sir/Madam,

        Sub: Recovery of loan amount - Demand notice - Reg.

Under instructions from and on behalf of my client {{bankName}}, {{bankBranch}} Branch, I do hereby serve upon you the following notice:

1. That my client bank had sanctioned and disbursed a {{loanType}} loan bearing Account No. {{accountNumber}} for a sum of Rs. {{loanAmount}}/- (Rupees {{loanAmount}} only) to you on {{loanDate}} for the purpose of {{loanPurpose}}.

2. That you had agreed to repay the said loan amount together with interest in regular monthly instalments of Rs. {{instalmentAmount}}/- each.

3. That you have paid only a sum of Rs. {{amountPaid}}/- towards the above loan and have thereafter wilfully and deliberately defaulted in repayment of the remaining loan amount.

4. That the total outstanding balance due from you to my client bank as on date is Rs. {{balanceOutstanding}}/- (inclusive of principal and interest accrued from {{interestFromDate}}).

5. That despite repeated oral demands and reminders by my client bank, you have failed and neglected to repay the outstanding amount, which clearly shows your malafide intention to avoid repayment of the lawful dues.

6. That you are hereby called upon to pay the entire outstanding amount of Rs. {{balanceOutstanding}}/- together with further interest accruing thereon and notice cost of Rs. {{noticeCost}}/- within {{daysToComply}} days from the date of receipt of this notice, failing which my client bank shall be constrained to initiate appropriate civil and criminal proceedings against you for recovery of the said amount, together with interest, costs, damages and all other consequential reliefs, at your risk and costs.

7. That this notice is issued without prejudice to the rights and remedies available to my client bank under the applicable laws, including but not limited to the provisions of the Recovery of Debts Due to Banks and Financial Institutions Act, 1993 and the Securitisation and Reconstruction of Financial Assets and Enforcement of Security Interest Act, 2002 (SARFAESI Act).

A copy of this notice is retained in my office for further reference and record.

                                              Yours faithfully,

                                              Sd/-
                                              G. ANANTHAKRISHNAN
                                              Advocate, Palakkad`,
  },

  // 4. Court Petition (Section 151 CPC)
  {
    name: "Petition under Section 151 CPC - Palakkad",
    category: "INTERLOCUTORY",
    documentType: "PETITION_151_CPC",
    description: "Interlocutory petition under Section 151 CPC for Palakkad courts",
    courtType: "DISTRICT_COURT",
    variables: JSON.stringify([
      "courtType", "courtLocation",
      "osNumber", "osYear", "epNumber", "epYear",
      "petitionerName", "petitionerDesignation",
      "respondentName", "respondentDesignation",
      "sectionReference", "prayerContent", "petitionDate",
    ]),
    content: `IN THE COURT OF THE {{courtType}} OF {{courtLocation}}

O.S. No. {{osNumber}}/{{osYear}}
E.P. No. {{epNumber}}/{{epYear}}

{{petitionerName}}
                                              ... {{petitionerDesignation}}

              VERSUS

{{respondentName}}
                                              ... {{respondentDesignation}}

PETITION UNDER {{sectionReference}} OF THE CODE OF CIVIL PROCEDURE

The petitioner above named most respectfully submits as follows:

1. That the above O.S. No. {{osNumber}}/{{osYear}} was filed by the petitioner and the same was decreed in favour of the petitioner.

2. That for the execution of the decree passed in the above Original Suit, the petitioner has filed E.P. No. {{epNumber}}/{{epYear}} before this Hon'ble Court.

3. That in the interest of justice, it is necessary and expedient to invoke the inherent powers of this Hon'ble Court under {{sectionReference}} of the Code of Civil Procedure, 1908.

4. That this petition is filed bonafide and in the interest of justice.

PRAYER:

In the premises, it is most respectfully prayed that this Hon'ble Court may be pleased to:

{{prayerContent}}

and pass such other order or orders as this Hon'ble Court may deem fit and proper in the circumstances of the case.

Place: {{courtLocation}}
Date: {{petitionDate}}

                                              PETITIONER
                                              through
                                              Advocate G. Ananthakrishnan
                                              Palakkad`,
  },

  // 5. Arrest EP
  {
    name: "Execution Petition for Arrest - Palakkad",
    category: "EXECUTION",
    documentType: "EP_ARREST",
    description: "Execution Petition for arrest and detention of judgement-debtor",
    courtType: "DISTRICT_COURT",
    variables: JSON.stringify([
      "courtName", "osNumber", "osYear", "epNumber", "epYear",
      "bankName", "bankBranch", "respondentName",
      "decreeAmount", "interestDetails", "totalDue", "petitionDate",
    ]),
    content: `IN THE COURT OF THE {{courtName}}

O.S. No. {{osNumber}}/{{osYear}}
E.P. No. {{epNumber}}/{{epYear}}

{{bankName}}, {{bankBranch}} Branch,
rep. by its Branch Manager
                                              ... Petitioner/Decree-holder

              VERSUS

{{respondentName}}
                                              ... Respondent/Judgement-debtor

EXECUTION PETITION FOR ARREST AND DETENTION

The petitioner/decree-holder above named most respectfully submits as follows:

1. That the petitioner bank obtained a decree in O.S. No. {{osNumber}}/{{osYear}} against the respondent/judgement-debtor for a sum of Rs. {{decreeAmount}}/- together with {{interestDetails}} and costs.

2. That despite the passage of the decree, the respondent/judgement-debtor has wilfully failed and neglected to satisfy the decree.

3. That the total amount due and recoverable from the respondent/judgement-debtor as on date is Rs. {{totalDue}}/-.

4. That the petitioner has made due enquiries and is satisfied that the respondent/judgement-debtor is possessed of sufficient means to satisfy the decree but is wilfully refusing to pay the decreed amount.

5. That the respondent/judgement-debtor is likely to abscond or leave the local limits of the jurisdiction of this Hon'ble Court with the intent to delay the execution of the decree and to obstruct and avoid the due process of this Hon'ble Court.

6. That in the circumstances, the petitioner/decree-holder is constrained to seek the arrest and detention of the respondent/judgement-debtor in civil prison as provided under Order XXI Rules 37 to 40 of the Code of Civil Procedure, 1908.

PRAYER:

In the premises, it is most respectfully prayed that this Hon'ble Court may be pleased to:

(a) Issue a notice of arrest to the respondent/judgement-debtor calling upon him/her to appear before this Hon'ble Court and show cause why he/she should not be committed to civil prison in execution of the decree;

(b) In default of payment, order the arrest and detention of the respondent/judgement-debtor in civil prison for such period as this Hon'ble Court may deem fit;

(c) Award costs of this execution petition to the petitioner;

(d) Pass such other order or orders as this Hon'ble Court may deem fit and proper in the circumstances of the case.

Place: Palakkad
Date: {{petitionDate}}

                                              PETITIONER/DECREE-HOLDER
                                              through
                                              Advocate G. Ananthakrishnan
                                              Palakkad`,
  },

  // 6. Attachment & Sale EP
  {
    name: "EP for Attachment and Sale - Palakkad",
    category: "EXECUTION",
    documentType: "EP_ATTACHMENT_SALE",
    description: "Execution Petition for attachment and sale of judgement-debtor's property",
    courtType: "DISTRICT_COURT",
    variables: JSON.stringify([
      "courtName", "osNumber", "osYear", "epNumber", "epYear",
      "bankName", "bankBranch", "respondentName",
      "propertyDescription", "decreeAmount", "petitionDate",
    ]),
    content: `IN THE COURT OF THE {{courtName}}

O.S. No. {{osNumber}}/{{osYear}}
E.P. No. {{epNumber}}/{{epYear}}

{{bankName}}, {{bankBranch}} Branch,
rep. by its Branch Manager
                                              ... Petitioner/Decree-holder

              VERSUS

{{respondentName}}
                                              ... Respondent/Judgement-debtor

EXECUTION PETITION FOR ATTACHMENT AND SALE OF PROPERTY

The petitioner/decree-holder above named most respectfully submits as follows:

1. That the petitioner bank obtained a decree in O.S. No. {{osNumber}}/{{osYear}} against the respondent/judgement-debtor for a sum of Rs. {{decreeAmount}}/- together with interest and costs.

2. That despite the passage of the decree and demand for payment, the respondent/judgement-debtor has wilfully failed and neglected to satisfy the decree.

3. That the respondent/judgement-debtor is the owner and is in possession of the immovable property more fully described in the Schedule hereunder.

4. That the petitioner/decree-holder has made all reasonable efforts for recovery of the decreed amount but the respondent/judgement-debtor has failed and refused to pay the same.

5. That in the circumstances, the petitioner/decree-holder is constrained to seek the attachment and sale of the property belonging to the respondent/judgement-debtor for realization of the decreed amount as provided under Order XXI Rules 54 to 57 of the Code of Civil Procedure, 1908.

6. That the petitioner/decree-holder is not aware of any other property belonging to the respondent/judgement-debtor from which the decreed amount can be recovered.

PRAYER:

In the premises, it is most respectfully prayed that this Hon'ble Court may be pleased to:

(a) Order the attachment of the immovable property described in the Schedule hereunder belonging to the respondent/judgement-debtor;

(b) After due proclamation under Order XXI Rule 66 of CPC, order the sale of the attached property and apply the sale proceeds towards satisfaction of the decree;

(c) Award costs of this execution petition to the petitioner;

(d) Pass such other order or orders as this Hon'ble Court may deem fit and proper in the circumstances of the case.

SCHEDULE OF PROPERTY

{{propertyDescription}}

Place: Palakkad
Date: {{petitionDate}}

                                              PETITIONER/DECREE-HOLDER
                                              through
                                              Advocate G. Ananthakrishnan
                                              Palakkad

VERIFICATION:

I, the authorized representative of the petitioner bank, do hereby verify that the contents of paragraphs 1 to 6 of the above petition are true and correct to my knowledge and belief, and nothing material has been concealed therefrom.

Verified at Palakkad on this {{petitionDate}}.

                                              PETITIONER/DECREE-HOLDER`,
  },
];

// ---------------------------------------------------------------------------
// Notice templates
// ---------------------------------------------------------------------------

const NOTICE_TEMPLATES = [
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const dbPath = process.env.DATABASE_PATH || "./data/legal-rag.db";
  console.log("Connecting to local SQLite:", dbPath);

  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  const prisma = new PrismaClient({ adapter } as any);

  // --- Organization ---
  const org = await prisma.organization.upsert({
    where: { slug: "gouriankar-associates" },
    update: {},
    create: {
      name: "Gouriankar Associates",
      slug: "gouriankar-associates",
      address: "Lakshmi Sadan, H.P.O College Road, Palakkad - 678 001",
      phone: "0491-2544549",
      email: "pgtgak@gmail.com",
      plan: "PROFESSIONAL",
      maxUsers: 25,
      maxCases: 500,
      maxDocuments: 5000,
      maxAiQueries: 1000,
    },
  });
  console.log(`Organization: ${org.name} (${org.id})`);

  // --- Users ---
  const adminPassword = await bcrypt.hash("gak2024", 12);

  const ananthakrishnan = await prisma.user.upsert({
    where: { email: "anathakrishnan@legalrag.com" },
    update: {},
    create: {
      email: "anathakrishnan@legalrag.com",
      password: adminPassword,
      name: "G. Ananthakrishnan",
      role: "SENIOR_ADVOCATE",
      phone: "0491-2544549",
      organizationId: org.id,
    },
  });
  console.log(`User: ${ananthakrishnan.name} (${ananthakrishnan.email})`);

  const gourisankar = await prisma.user.upsert({
    where: { email: "gourisankar@legalrag.com" },
    update: {},
    create: {
      email: "gourisankar@legalrag.com",
      password: adminPassword,
      name: "A. Gourisankar",
      role: "SENIOR_ADVOCATE",
      phone: "0491-2544549",
      barCouncilNumber: "KER/1234/1990",
      organizationId: org.id,
    },
  });
  console.log(`User: ${gourisankar.name} (${gourisankar.email})`);

  // --- Seed ALL standard case templates ---
  const existingCaseTemplates = await prisma.caseTemplate.findMany({
    where: { organizationId: org.id },
    select: { documentType: true },
  });
  const existingCaseTypes = new Set(existingCaseTemplates.map((t: any) => t.documentType));

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
  console.log(`Standard case templates seeded: ${caseTemplatesCreated}`);

  // --- Seed custom case templates ---
  let customCreated = 0;
  for (const template of CUSTOM_CASE_TEMPLATES) {
    if (existingCaseTypes.has(template.documentType)) {
      console.log(`  Skipping custom template (exists): ${template.documentType}`);
      continue;
    }
    await prisma.caseTemplate.create({
      data: {
        name: template.name,
        category: template.category,
        documentType: template.documentType,
        description: template.description,
        content: template.content,
        variables: template.variables,
        courtType: template.courtType || null,
        organizationId: org.id,
      },
    });
    customCreated++;
  }
  console.log(`Custom case templates seeded: ${customCreated}`);

  // --- Seed notice templates ---
  const existingNotice = await prisma.noticeTemplate.findMany({
    where: { organizationId: org.id },
    select: { name: true },
  });
  const existingNoticeNames = new Set(existingNotice.map((t: any) => t.name));

  let noticeTemplatesCreated = 0;
  for (const template of NOTICE_TEMPLATES) {
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

  // --- Summary ---
  console.log("\n========================================================");
  console.log("  Gouriankar Associates - Setup Complete!");
  console.log("========================================================");
  console.log(`  Organization  : Gouriankar Associates`);
  console.log(`  Slug          : gouriankar-associates`);
  console.log(`  Address       : Lakshmi Sadan, H.P.O College Road, Palakkad - 678 001`);
  console.log(`  Phone         : 0491-2544549`);
  console.log(`  Email         : pgtgak@gmail.com`);
  console.log("--------------------------------------------------------");
  console.log(`  User 1        : G. Ananthakrishnan`);
  console.log(`    Email       : anathakrishnan@legalrag.com`);
  console.log(`    Password    : gak2024`);
  console.log(`    Role        : SENIOR_ADVOCATE`);
  console.log("--------------------------------------------------------");
  console.log(`  User 2        : A. Gourisankar`);
  console.log(`    Email       : gourisankar@legalrag.com`);
  console.log(`    Password    : gak2024`);
  console.log(`    Role        : SENIOR_ADVOCATE`);
  console.log("--------------------------------------------------------");
  console.log(`  Templates     : ${caseTemplatesCreated} standard + ${customCreated} custom case + ${noticeTemplatesCreated} notice`);
  console.log("========================================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
