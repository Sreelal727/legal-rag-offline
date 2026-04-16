/**
 * Banking matter pipeline templates.
 * Based on actual filed documents from Gourisankar Associates archive (D:\anadhakrishnan).
 *
 * Variable placeholders use {{variableName}} syntax.
 * Variables are auto-filled from case data / extracted data card.
 */

// ============================================================
// 1. BANK DEMAND NOTICE
// ============================================================
export const BANK_DEMAND_NOTICE_TEMPLATE = {
  name: "Bank Demand Notice",
  category: "BANKING_MATTER",
  documentType: "DEMAND_NOTICE",
  description: "Advocate letterhead demand notice on behalf of bank for loan recovery",
  courtType: null,
  variables: JSON.stringify([
    "bankName", "branchName", "borrowerName", "borrowerAddress",
    "guarantorBlock", "loanType", "loanAccountNumber", "loanAmount",
    "outstandingAmount", "interestRate", "lastPaymentDate",
    "advocateName", "advocateAddress", "date", "place",
  ]),
  content: `GOURISANKAR ASSOCIATES
Advocates & Notary
{{advocateAddress}}

Ref: {{bankName}}/{{loanAccountNumber}}                              Date: {{date}}

To,
{{borrowerName}},
{{borrowerAddress}}.

{{guarantorBlock}}

Dear Sir/Madam,

    Under instructions from and on behalf of my client, {{bankName}}, {{branchName}}, I do hereby issue the following notice to you.

    My client bank has granted you {{loanType}} facility bearing Account No. {{loanAccountNumber}} for a sum of Rs. {{loanAmount}}/- (Rupees {{loanAmountWords}} only). You have executed the necessary loan documents including demand promissory note, loan agreement and other security documents in favour of my client bank.

    Despite repeated demands and reminders, you have failed and neglected to repay the said loan amount together with interest due thereon. As on date, a sum of Rs. {{outstandingAmount}}/- (Rupees {{outstandingAmountWords}} only) is due and payable by you to my client bank towards the principal, interest at {{interestRate}}% p.a. and other charges.

    I, therefore, call upon you to pay the entire outstanding amount of Rs. {{outstandingAmount}}/- together with further interest thereon within 15 days from the date of receipt of this notice, failing which my client will be constrained to initiate legal proceedings against you for recovery of the said amount with interest, cost and all consequential expenses, which please note.

    This notice is issued without prejudice to the other rights and remedies available to my client under law.

Place: {{place}}
Date: {{date}}

                                                    Yours faithfully,

                                                    {{advocateName}}
                                                    Advocate
                                                    {{advocateAddress}}`,
};

// ============================================================
// 2. BANKING OS PLAINT (Original Suit — Money Recovery)
// ============================================================
export const BANKING_OS_PLAINT_TEMPLATE = {
  name: "Banking Money Recovery OS Plaint",
  category: "BANKING_MATTER",
  documentType: "OS_PLAINT",
  description: "Original Suit plaint for bank money recovery — Order VII Rule 1 CPC",
  courtType: "DISTRICT_COURT",
  variables: JSON.stringify([
    "courtName", "bankName", "branchName", "bankAddress", "bankCorpDescription",
    "authorizedOfficerName", "authorizedOfficerDesignation",
    "advocateName", "advocateAddress",
    "defendantBlock", "defendantCount",
    "loanFacilitiesBlock", "documentsExecutedBlock",
    "acknowledgementsBlock", "securityBlock",
    "defaultDescription", "outstandingAmount", "outstandingDate",
    "interestRate", "penalRate", "interestRests",
    "demandNoticeDate", "demandNoticeMode",
    "causeOfActionDates", "causeOfActionPlace",
    "valuationBlock", "courtFeeBlock",
    "prayerInterestRate", "prayerPenalRate",
    "verificationOfficerName", "verificationOfficerDesignation",
    "verificationOfficerRelation",
    "listOfDocuments",
    "date", "place",
  ]),
  content: `IN THE COURT OF THE {{courtName}}

                              O.S.No.           of {{year}}

{{bankName}}, through its {{branchName}},      )
represented by its {{authorizedOfficerDesignation}}   )     Plaintiff
{{bankAddress}}                                       )
                                                      )

                                    Vs.

{{defendantBlock}}

              PLAINT PRESENTED UNDER ORDER VII RULE 1
                     OF THE CIVIL PROCEDURE CODE

    A. The Plaintiff {{bankName}} is a body corporate, {{bankCorpDescription}}. The plaint is signed and verified by the {{authorizedOfficerDesignation}}, {{branchName}} who is the principal officer authorised by the plaintiff bank and who is aware and is able to depose about all the facts stated below. The address for service of all notices and processes on the plaintiff is that of its counsels herein {{advocateName}}, Advocates, {{advocateAddress}}.

    B. {{defendantIntroBlock}}

    The plaintiff begs to submit as follows:-

{{loanFacilitiesBlock}}

{{documentsExecutedBlock}}

{{acknowledgementsBlock}}

{{securityBlock}}

{{defaultDescription}}

{{outstandingBlock}}

    The plaintiff sent notice on {{demandNoticeDate}} by {{demandNoticeMode}} demanding the repayment of the entire outstanding amounts in lump from the defendants to which there has been no response. Hence the suit.

    There is thus a sum of Rs. {{outstandingAmount}}/- under the loan account as on {{outstandingDate}} with interest calculated up to {{outstandingDate}}, as evidenced by the true copy of the statement of accounts maintained by the plaintiff in respect of the loan account granted to the defendants. Interest has been applied at the rate of {{interestRate}}% p.a. with {{interestRests}} rests besides {{penalRate}}% penal interest as per the terms of the loan agreement and as permitted by Reserve Bank of India directives.

    The cause of action for the suit arose on and after {{causeOfActionDates}} at {{causeOfActionPlace}} which is within the jurisdiction of this Honourable Court.

    The valuation of the suit for the purpose of court fee and jurisdiction is as per the details given below:-

    The plaintiff therefore claims and prays for a decree:-

    (a) To recover Rs. {{outstandingAmount}}/- together with future interest thereon at {{prayerInterestRate}}% p.a. with {{interestRests}} rests and {{prayerPenalRate}}% penal interest from the date of suit till realisation from the defendants, personally and out of their assets;

    (b) For the entire cost of this suit; and

    (c) For such other and further reliefs as the plaintiff may pray for and this Honourable Court deems fit and proper to grant in the circumstances of the case.

                      PARTICULARS OF VALUATION

{{valuationBlock}}

{{courtFeeBlock}}

          Dated this the        day of  {{date}}.

                                VERIFICATION

    I, {{verificationOfficerName}}, {{verificationOfficerRelation}} {{verificationOfficerDesignation}}, {{bankName}}, {{branchName}}, do hereby declare that the facts stated above are true and correct to the best of my knowledge and belief and signed this plaint at {{place}} on this the     day of {{date}}.

                              LIST OF DOCUMENTS

{{listOfDocuments}}

          Dated this the        day of {{date}}

                              (Advocate for Plaintiff)`,
};

// ============================================================
// 3. BANKING CS PLAINT (Commercial Suit)
// ============================================================
export const BANKING_CS_PLAINT_TEMPLATE = {
  name: "Banking Money Recovery CS Plaint",
  category: "BANKING_MATTER",
  documentType: "CS_PLAINT",
  description: "Commercial Suit plaint for bank recovery — Order VII Rule 1 CPC r/w Commercial Courts Act 2015",
  courtType: "COMMERCIAL_COURT",
  variables: JSON.stringify([
    "courtName", "bankName", "branchName", "bankAddress", "bankCorpDescription",
    "bankPAN", "bankEmail", "bankPhone",
    "authorizedOfficerName", "authorizedOfficerDesignation",
    "advocateName", "advocateAddress",
    "defendantBlock",
    "loanFacilitiesBlock", "documentsExecutedBlock",
    "acknowledgementsBlock", "securityBlock",
    "defaultDescription", "outstandingAmount", "outstandingDate",
    "interestRate", "penalRate", "interestRests",
    "demandNoticeDate", "demandNoticeMode",
    "mediationComplianceBlock",
    "causeOfActionDates", "causeOfActionPlace",
    "valuationBlock", "courtFeeBlock",
    "prayerInterestRate", "prayerPenalRate",
    "verificationOfficerName", "verificationOfficerDesignation",
    "verificationOfficerRelation",
    "listOfDocuments",
    "date", "place",
  ]),
  content: `BEFORE THE COMMERCIAL COURT AT {{courtName}}

                              C.S.No.           of {{year}}

{{bankName}}, through its {{branchName}},      )
represented by its {{authorizedOfficerDesignation}}   )     Plaintiff
{{bankAddress}}                                       )
PAN: {{bankPAN}}                                      )
Email: {{bankEmail}}                                  )
Phone: {{bankPhone}}                                  )

                                    Vs.

{{defendantBlock}}

              PLAINT UNDER ORDER VII RULE 1 OF C.P.C.
              READ WITH THE COMMERCIAL COURTS ACT, 2015

    A. The Plaintiff {{bankName}} is a body corporate, {{bankCorpDescription}}. The plaint is signed and verified by the {{authorizedOfficerDesignation}}, {{branchName}} who is the principal officer authorised by the plaintiff bank. The address for service of all notices and processes on the plaintiff is that of its counsels herein {{advocateName}}, Advocates, {{advocateAddress}}.

    B. {{defendantIntroBlock}}

    C. The plaintiff has complied with Section 12A of the Commercial Courts Act, 2015 by exhausting the remedy of pre-institution mediation. {{mediationComplianceBlock}}

    The plaintiff begs to submit as follows:-

{{loanFacilitiesBlock}}

{{documentsExecutedBlock}}

{{acknowledgementsBlock}}

{{securityBlock}}

{{defaultDescription}}

{{outstandingBlock}}

    The plaintiff sent notice on {{demandNoticeDate}} by {{demandNoticeMode}} demanding repayment of the entire outstanding amounts from the defendants, to which there has been no response. Hence the suit.

    There is thus a sum of Rs. {{outstandingAmount}}/- under the loan account as on {{outstandingDate}} with interest calculated up to {{outstandingDate}}, as evidenced by the certified statement of accounts maintained by the plaintiff. Interest has been applied at the rate of {{interestRate}}% p.a. with {{interestRests}} rests besides {{penalRate}}% penal interest as per loan agreement terms and RBI directives.

    The cause of action for the suit arose on and after {{causeOfActionDates}} at {{causeOfActionPlace}} which is within the jurisdiction of this Honourable Court.

    The suit is a commercial dispute of a specified value exceeding the threshold under the Commercial Courts Act, 2015.

    The valuation of the suit for the purpose of court fee and jurisdiction is as per the details given below:-

    The plaintiff therefore claims and prays for a decree:-

    (a) To recover Rs. {{outstandingAmount}}/- together with future interest thereon at {{prayerInterestRate}}% p.a. with {{interestRests}} rests and {{prayerPenalRate}}% penal interest from the date of suit till realisation from the defendants, personally and out of their assets;

    (b) For the entire cost of this suit; and

    (c) For such other and further reliefs as this Honourable Court deems fit and proper.

                      PARTICULARS OF VALUATION

{{valuationBlock}}

{{courtFeeBlock}}

          Dated this the        day of {{date}}.

                                VERIFICATION

    I, {{verificationOfficerName}}, {{verificationOfficerRelation}} {{verificationOfficerDesignation}}, {{bankName}}, {{branchName}}, do hereby declare that the facts stated above are true and correct to the best of my knowledge and belief.

    Verified at {{place}} on this the     day of {{date}}.

                              LIST OF DOCUMENTS

{{listOfDocuments}}

          Dated this the        day of {{date}}

                              (Advocate for Plaintiff)`,
};

// ============================================================
// 4. FACT AFFIDAVIT (Banking Matter)
// ============================================================
export const FACT_AFFIDAVIT_TEMPLATE = {
  name: "Fact Affidavit (Banking)",
  category: "BANKING_MATTER",
  documentType: "FACT_AFFIDAVIT",
  description: "Affidavit in lieu of examination-in-chief — banking matter",
  courtType: null,
  variables: JSON.stringify([
    "courtName", "caseNumber", "year", "caseType",
    "bankName", "branchName",
    "defendantBlock",
    "deponentName", "deponentDesignation", "deponentRelation",
    "deponentAge", "deponentAddress",
    "factsBlock", "documentsProvedBlock",
    "date", "place",
  ]),
  content: `IN THE COURT OF THE {{courtName}}

                              {{caseType}} No. {{caseNumber}} of {{year}}

{{bankName}}, through its {{branchName}},     )
represented by its {{deponentDesignation}}    )     Plaintiff
                                              )
                                    Vs.       )
                                              )
{{defendantBlock}}

          AFFIDAVIT IN LIEU OF EXAMINATION-IN-CHIEF

    I, {{deponentName}}, aged {{deponentAge}} years, {{deponentRelation}} {{deponentDesignation}}, {{bankName}}, {{branchName}}, do hereby solemnly affirm and state as follows:

    1. I am the {{deponentDesignation}} of the plaintiff bank and I am acquainted with the facts of the case. I am authorized to file this affidavit on behalf of the plaintiff bank.

{{factsBlock}}

{{documentsProvedBlock}}

    The above facts are true and correct to the best of my knowledge and belief.

    Dated this the          day of {{date}}.

                                                    DEPONENT

VERIFICATION

    I, {{deponentName}}, the deponent above named, do hereby verify that the contents of the above affidavit are true and correct to my knowledge and belief and nothing material has been concealed therefrom.

    Verified at {{place}} on this the {{date}}.

                                                    DEPONENT`,
};

// ============================================================
// 5. VERIFICATION AFFIDAVIT (OS only)
// ============================================================
export const VERIFICATION_AFFIDAVIT_TEMPLATE = {
  name: "Verification Affidavit (OS)",
  category: "BANKING_MATTER",
  documentType: "VERIFICATION_AFFIDAVIT",
  description: "Sworn verification affidavit for OS plaint — banking matter",
  courtType: null,
  variables: JSON.stringify([
    "courtName", "caseNumber", "year",
    "bankName", "branchName",
    "defendantBlock",
    "deponentName", "deponentDesignation", "deponentRelation",
    "deponentAge", "deponentAddress",
    "paragraphCount",
    "date", "place",
  ]),
  content: `IN THE COURT OF THE {{courtName}}

                              O.S.No. {{caseNumber}} of {{year}}

{{bankName}}, through its {{branchName}},     )
represented by its {{deponentDesignation}}    )     Plaintiff
                                              )
                                    Vs.       )
                                              )
{{defendantBlock}}

                        VERIFICATION AFFIDAVIT

    I, {{deponentName}}, aged {{deponentAge}} years, {{deponentRelation}} {{deponentDesignation}}, {{bankName}}, {{branchName}}, residing at {{deponentAddress}}, do hereby solemnly affirm and state as follows:

    1. I am the {{deponentDesignation}} of the plaintiff bank in the above suit and I am competent and authorised to swear this affidavit.

    2. I have read and understood the contents of the plaint filed in the above suit.

    3. The facts stated in paragraphs 1 to {{paragraphCount}} of the plaint are true and correct to my knowledge derived from the records of the plaintiff bank and nothing material has been concealed therefrom.

    4. I swear this affidavit bonafide and in the interests of justice.

    The above facts are true.

    Dated this the          day of {{date}}.

                                                    DEPONENT

VERIFICATION

    Verified at {{place}} on this the {{date}}.

                                                    DEPONENT`,
};

// ============================================================
// 6. STATEMENT OF TRUTH (CS only)
// ============================================================
export const STATEMENT_OF_TRUTH_TEMPLATE = {
  name: "Statement of Truth (CS)",
  category: "BANKING_MATTER",
  documentType: "STATEMENT_OF_TRUTH",
  description: "Statement of Truth for Commercial Suit plaint — replaces Verification Affidavit",
  courtType: "COMMERCIAL_COURT",
  variables: JSON.stringify([
    "courtName", "caseNumber", "year",
    "bankName", "branchName",
    "defendantBlock",
    "deponentName", "deponentDesignation", "deponentRelation",
    "deponentAge", "deponentAddress",
    "date", "place",
  ]),
  content: `BEFORE THE COMMERCIAL COURT AT {{courtName}}

                              C.S.No. {{caseNumber}} of {{year}}

{{bankName}}, through its {{branchName}},     )
represented by its {{deponentDesignation}}    )     Plaintiff
                                              )
                                    Vs.       )
                                              )
{{defendantBlock}}

                        STATEMENT OF TRUTH

    I, {{deponentName}}, aged {{deponentAge}} years, {{deponentRelation}} {{deponentDesignation}}, {{bankName}}, {{branchName}}, residing at {{deponentAddress}}, do hereby state as follows:

    1. I am the {{deponentDesignation}} of the plaintiff bank and am duly authorised to make this Statement of Truth on behalf of the plaintiff.

    2. I believe that the facts stated in the plaint and the accompanying documents filed in the above suit are true.

    3. I understand that proceedings for contempt of court may be brought against any person who makes, or causes to be made, a false statement in a document verified by a statement of truth without an honest belief in its truth.

    4. This Statement of Truth is made in compliance with the Commercial Courts Act, 2015 and the rules framed thereunder.

    Dated this the          day of {{date}}.

                                                    {{deponentName}}
                                                    {{deponentDesignation}}
                                                    {{bankName}}, {{branchName}}

    Place: {{place}}`,
};

// ============================================================
// 7. MEDIATION APPLICATION (CS — Form 1)
// ============================================================
export const MEDIATION_APPLICATION_TEMPLATE = {
  name: "Pre-Institution Mediation Application (CS)",
  category: "BANKING_MATTER",
  documentType: "MEDIATION_APPLICATION",
  description: "Form-1 under Rule 3(1) — mandatory pre-institution mediation for Commercial Suits",
  courtType: "COMMERCIAL_COURT",
  variables: JSON.stringify([
    "courtName", "bankName", "branchName", "bankAddress",
    "defendantBlock",
    "natureOfDispute", "quantumOfClaim", "briefSynopsis",
    "advocateName", "advocateAddress",
    "ddNumber", "ddDate", "ddAmount",
    "date", "place",
  ]),
  content: `FORM - 1

                    MEDIATION APPLICATION FORM
                    (Refer Rule 3(1))

BEFORE THE MEDIATION CENTRE / COMMERCIAL COURT AT {{courtName}}

1. APPLICANT (Plaintiff):
   Name: {{bankName}}, {{branchName}}
   Address: {{bankAddress}}
   Through Advocate: {{advocateName}}, {{advocateAddress}}

2. RESPONDENT (Proposed Defendant):
{{defendantBlock}}

3. NATURE OF DISPUTE AS PER SECTION 2(1)(c) OF THE COMMERCIAL COURTS ACT, 2015:
   {{natureOfDispute}}

4. QUANTUM OF CLAIM:
   Rs. {{quantumOfClaim}}/-

5. BRIEF SYNOPSIS OF COMMERCIAL DISPUTE (not to exceed 5000 words):
   {{briefSynopsis}}

6. FEE PAID BY DD No. {{ddNumber}} dated {{ddDate}} for Rs. {{ddAmount}}/-

7. The applicant has not filed any suit in respect of the subject matter of this application.

8. The applicant undertakes to participate in the mediation proceedings in good faith.

Place: {{place}}
Date: {{date}}

                                                    {{advocateName}}
                                                    Advocate for the Applicant`,
};

// ============================================================
// 8. VAKALATNAMA (Generic — court dropdown variant)
// ============================================================
export const VAKALATNAMA_TEMPLATE = {
  name: "Vakalatnama (Form 12 Rule 27)",
  category: "BANKING_MATTER",
  documentType: "VAKALATNAMA",
  description: "Vakkalath — Power of Attorney to Advocate — Form No. 12 (Rule 27)",
  courtType: null,
  variables: JSON.stringify([
    "courtName", "courtType", "caseType", "caseNumber", "year",
    "clientName", "clientDesignation", "clientFatherName",
    "clientAge", "clientAddress",
    "advocateName", "advocateAddress",
    "oppositePartyName",
    "date",
  ]),
  content: `FORM NO. 12  (Rule 27)

                          V A K K A L A T H

                          No.          of {{year}}

IN THE COURT OF THE {{courtName}}

                          {{caseType}} No. {{caseNumber}} of {{year}}

{{clientName}}                                    ...  Plaintiff/Petitioner

                                    Vs.

{{oppositePartyName}}                             ...  Defendant/Respondent

    I/We, {{clientName}}, {{clientDesignation}} {{clientFatherName}}, aged about {{clientAge}} years, residing at {{clientAddress}}, do hereby appoint and retain {{advocateName}}, Advocates, {{advocateAddress}}, to appear for me/us in the above suit (Appeal or petition) and to conduct and prosecute or (defend) the same and all proceedings that may be taken in respect of any application for execution of any decree or order passed therein.

    I/We empower the said Pleader to appear in all miscellaneous proceedings in the above suit or matter till all decrees or orders are fully satisfied or adjusted and to produce in Court any money, documents or valuable security on my/our behalf, to apply for their return and to receive back the same, to apply for and obtain copies of all documents in the record of proceedings, to draw any money that might be payable to me/us in the above suit or matter.

    And I/We do further empower my/our Pleader to accept on my/our behalf service of notice of all or any appeals or petitions filed in any Court of appeal, reference or Revision with regard to the said suit or matter, before the disposal of the same in this Honourable Court.

    And I/We do hereby agree that everything lawfully done or made by the said Pleader in the conduct of the suit or matter shall be as valid and binding on me/us as if done by me/us in person.

    Signed this the {{date}}.


                                    _______________________________
                                    {{clientName}}

Signed before me

{{advocateName}}
Advocate, {{advocateAddress}}


                              Filed on:

                              Address for Service:
                              {{advocateName}}, Advocates
                              {{advocateAddress}}`,
};

// ============================================================
// 9. BATTA MEMO
// ============================================================
export const BATTA_MEMO_TEMPLATE = {
  name: "Batta Memo",
  category: "BANKING_MATTER",
  documentType: "BATTA_MEMO",
  description: "Process fee memo for service of summons / notice on parties",
  courtType: null,
  variables: JSON.stringify([
    "courtName", "caseType", "caseNumber", "year",
    "plaintiffName", "defendantBlock",
    "recipientBlock",
    "advocateName",
    "date",
  ]),
  content: `IN THE COURT OF THE {{courtName}}

                              {{caseType}} No. {{caseNumber}} of {{year}}

{{plaintiffName}}                             ...  Plaintiff

                                    Vs.

{{defendantBlock}}

                              BATTA MEMO

    The details of the defendants/respondents to whom summons/notice is to be served are as follows:

{{recipientBlock}}

    The process fee and batta charges as applicable are paid herewith.

    Dated this the          day of {{date}}.

                                                    {{advocateName}}
                                                    Advocate for Plaintiff`,
};

// ============================================================
// 10. SUMMONS
// ============================================================
export const SUMMONS_TEMPLATE = {
  name: "Summons to Defendant",
  category: "BANKING_MATTER",
  documentType: "SUMMONS",
  description: "CPC summons to defendant to appear and answer",
  courtType: null,
  variables: JSON.stringify([
    "courtName", "caseType", "caseNumber", "year",
    "plaintiffName", "defendantName", "defendantAddress",
    "hearingDate", "suitDescription",
    "date",
  ]),
  content: `IN THE COURT OF THE {{courtName}}

                              {{caseType}} No. {{caseNumber}} of {{year}}

{{plaintiffName}}                             ...  Plaintiff

                                    Vs.

{{defendantName}} & Others                    ...  Defendant(s)

                              SUMMONS

To,
{{defendantName}},
{{defendantAddress}}.

    WHEREAS the plaintiff above named has instituted a suit against you for {{suitDescription}}, you are hereby summoned to appear in this Court in person or by a Pleader duly instructed and able to answer all material questions relating to the suit, on the {{hearingDate}}, and you are directed to produce on that day all documents upon which you intend to rely in support of your defence.

    Take notice that in default of your appearance on the day before mentioned, the suit will be heard and determined in your absence.

    Given under my hand and the seal of the Court, this {{date}}.

                                                    Judge / Munsiff
                                                    {{courtName}}`,
};

// ============================================================
// 11. PROOF AFFIDAVIT
// ============================================================
export const PROOF_AFFIDAVIT_TEMPLATE = {
  name: "Proof Affidavit (Bank Witness)",
  category: "BANKING_MATTER",
  documentType: "PROOF_AFFIDAVIT",
  description: "Affidavit of bank witness proving execution of documents — filed at trial stage",
  courtType: null,
  variables: JSON.stringify([
    "courtName", "caseType", "caseNumber", "year",
    "bankName", "branchName",
    "defendantBlock",
    "witnessName", "witnessAge", "witnessRelation",
    "witnessDesignation", "witnessAddress",
    "witnessPeriod", "witnessWorkPlace",
    "documentsProvedBlock",
    "date",
  ]),
  content: `IN THE COURT OF THE {{courtName}}

                              {{caseType}} No. {{caseNumber}} of {{year}}

{{bankName}}, through its {{branchName}},     )
by its Manager.                               )     Plaintiff

                                    Vs.

{{defendantBlock}}

                              AFFIDAVIT

    I, {{witnessName}}, aged {{witnessAge}} years, {{witnessRelation}}, {{witnessDesignation}}, now working in {{witnessWorkPlace}}, residing at {{witnessAddress}}, do hereby solemnly affirm and state as follows:

    1. I was working as {{witnessDesignation}} at the plaintiff bank {{branchName}} from {{witnessPeriod}}. I know the defendants.

{{documentsProvedBlock}}

    The above facts are true.

    Dated this the          day of {{date}}.

                                                    DEPONENT`,
};

// ============================================================
// 12. EP — ARREST (Order 21 Rule 38)
// ============================================================
export const EP_ARREST_TEMPLATE = {
  name: "EP — Arrest (Order 21 Rule 38)",
  category: "BANKING_MATTER",
  documentType: "EP_ARREST",
  description: "Execution Petition for arrest and detention in civil prison — Order 21 Rule 38 & Sec 151 CPC",
  courtType: null,
  variables: JSON.stringify([
    "courtName", "osNumber", "osYear", "epYear",
    "decreeHolderName", "decreeHolderBranch", "decreeHolderAddress",
    "judgmentDebtorBlock",
    "decreeDate", "decreeNature",
    "previousEPBlock",
    "decreeAmount", "decreeCost",
    "interestRate", "interestFromDate", "interestToDate", "interestDays", "interestAmount",
    "totalAmount", "otherCostsBlock",
    "advocateName", "advocateAddress",
    "date", "filedDate",
  ]),
  content: `IN THE COURT OF THE {{courtName}}

                                          O.S.No. {{osNumber}} of {{osYear}}
                                          E.P.No.          of {{epYear}}

{{decreeHolderName}}, {{decreeHolderBranch}}   )     Petitioner / Decree Holder

                                    Vs.

{{judgmentDebtorBlock}}

          EXECUTION PETITION FILED UNDER ORDER 21 RULE 38
                  AND SECTION 151 OF THE CPC

1. Number & year of suit: O.S.No. {{osNumber}} of {{osYear}}
2. Names of parties:
   Decree Holder: {{decreeHolderName}}, {{decreeHolderBranch}}
   Judgment Debtor(s): {{judgmentDebtorNames}}
3. Date of decree: {{decreeDate}}
4. Whether a decree for money or other relief? {{decreeNature}}
5. Whether any appeal has been preferred from the decree? {{appealStatus}}
6. Whether any previous application for execution has been made?
{{previousEPBlock}}

7. Amount with full details for which execution is sought:

   (a) Amount decreed:                      Rs. {{decreeAmount}}
   (b) Cost as per decree:                  Rs. {{decreeCost}}
   (c) Interest at {{interestRate}}% p.a.
       from {{interestFromDate}} to
       {{interestToDate}} ({{interestDays}} days):   Rs. {{interestAmount}}
                                             _______________
       Total:                                Rs. {{totalAmount}}

   Other costs:
{{otherCostsBlock}}

8. Mode of execution sought: Arrest of the respondent/judgment debtor and detention in civil prison, if he/she fails to pay the decree amount.

    Dated this the {{date}}.

    Filed: {{filedDate}}

                                    {{advocateName}}
                                    Advocates, {{advocateAddress}}
                                    (For the Decree Holder)`,
};

// ============================================================
// 13. EP — ATTACHMENT & SALE (Order 21 Rules 54, 66)
// ============================================================
export const EP_ATTACHMENT_SALE_TEMPLATE = {
  name: "EP — Attachment & Sale (Order 21 Rules 54, 66)",
  category: "BANKING_MATTER",
  documentType: "EP_ATTACHMENT_SALE",
  description: "Execution Petition for attachment and sale of immovable property",
  courtType: null,
  variables: JSON.stringify([
    "courtName", "osNumber", "osYear", "epYear",
    "decreeHolderName", "decreeHolderBranch", "decreeHolderAddress",
    "judgmentDebtorBlock",
    "decreeDate", "decreeNature",
    "previousEPBlock",
    "decreeAmount", "decreeCost",
    "interestRate", "interestFromDate", "interestToDate", "interestDays", "interestAmount",
    "totalAmount", "otherCostsBlock",
    "propertySchedule",
    "advocateName", "advocateAddress",
    "verifierName", "verifierDesignation", "verifierRelation",
    "date", "filedDate",
  ]),
  content: `IN THE COURT OF THE {{courtName}}

                                          O.S.No. {{osNumber}} of {{osYear}}
                                          E.P.No.          of {{epYear}}

{{decreeHolderName}}, {{decreeHolderBranch}}   )     Petitioner / Decree Holder

                                    Vs.

{{judgmentDebtorBlock}}

          EXECUTION PETITION FILED UNDER ORDER 21 RULE 54 & 66
                      AND SECTION 151 OF THE CPC

1. Number & year of suit: O.S.No. {{osNumber}} of {{osYear}}
2. Names of parties:
   Decree Holder: {{decreeHolderName}}, {{decreeHolderBranch}}
   Judgment Debtor(s): {{judgmentDebtorNames}}
3. Date of decree: {{decreeDate}}
4. Whether a decree for money or other relief? {{decreeNature}}
5. Whether any appeal has been preferred from the decree? {{appealStatus}}
6. Whether any previous application for execution has been made?
{{previousEPBlock}}

7. Amount with full details for which execution is sought:

   (a) Amount decreed:                      Rs. {{decreeAmount}}
   (b) Cost as per decree:                  Rs. {{decreeCost}}
   (c) Interest at {{interestRate}}% p.a.
       from {{interestFromDate}} to
       {{interestToDate}} ({{interestDays}} days):   Rs. {{interestAmount}}
                                             _______________
       Total:                                Rs. {{totalAmount}}

   Other costs:
{{otherCostsBlock}}

8. Mode of execution sought: Attachment and sale of the immovable properties described in the schedule below.

                        SCHEDULE OF PROPERTIES

{{propertySchedule}}

    Dated this the {{date}}.

    Filed: {{filedDate}}

VERIFICATION

    I, {{verifierName}}, {{verifierRelation}} {{verifierDesignation}}, do hereby declare that the facts stated above are true and correct to the best of my knowledge and belief.

    Verified at {{place}} on {{date}}.

                                    {{advocateName}}
                                    Advocates, {{advocateAddress}}
                                    (For the Decree Holder)`,
};

// ============================================================
// 14. EP — SALE (of already attached property)
// ============================================================
export const EP_SALE_TEMPLATE = {
  name: "EP — Sale of Attached Property",
  category: "BANKING_MATTER",
  documentType: "EP_SALE",
  description: "Execution Petition for sale of already-attached immovable property",
  courtType: null,
  variables: JSON.stringify([
    "courtName", "osNumber", "osYear", "epNumber", "epYear",
    "decreeHolderName", "decreeHolderBranch",
    "judgmentDebtorBlock",
    "decreeDate",
    "previousEPBlock",
    "totalAmount", "otherCostsBlock",
    "propertySchedule",
    "advocateName", "advocateAddress",
    "date", "filedDate",
  ]),
  content: `IN THE COURT OF THE {{courtName}}

                                          O.S.No. {{osNumber}} of {{osYear}}
                                          E.P.No. {{epNumber}} of {{epYear}}

{{decreeHolderName}}, {{decreeHolderBranch}}   )     Petitioner / Decree Holder

                                    Vs.

{{judgmentDebtorBlock}}

          APPLICATION FOR SALE OF ATTACHED PROPERTY
          UNDER ORDER 21 RULE 64 & 66 AND SECTION 151 CPC

    The petitioner/decree holder respectfully submits as follows:

    1. The above execution petition was filed for attachment and sale of the immovable property described in the schedule. The said property has been duly attached by this Honourable Court.

    2. Despite the attachment, the judgment debtor(s) have failed to satisfy the decree by payment of the decretal amount of Rs. {{totalAmount}}/-.

    3. The petitioner therefore prays that this Honourable Court may be pleased to order the sale of the attached property described in the schedule for satisfaction of the decree.

                        SCHEDULE OF PROPERTIES

{{propertySchedule}}

    Dated this the {{date}}.

                                    {{advocateName}}
                                    Advocates, {{advocateAddress}}
                                    (For the Decree Holder)`,
};

// ============================================================
// 15. EP — TRANSFER (Section 39 CPC)
// ============================================================
export const EP_TRANSFER_TEMPLATE = {
  name: "EP — Transfer of Decree (Section 39 CPC)",
  category: "BANKING_MATTER",
  documentType: "EP_TRANSFER",
  description: "Execution Petition for transfer of decree to another court under Section 39 CPC",
  courtType: null,
  variables: JSON.stringify([
    "courtName", "transferCourtName",
    "osNumber", "osYear", "epYear",
    "decreeHolderName", "decreeHolderBranch",
    "judgmentDebtorBlock",
    "decreeDate",
    "previousEPBlock",
    "totalAmount",
    "transferReason",
    "propertySchedule",
    "advocateName", "advocateAddress",
    "date", "filedDate",
  ]),
  content: `IN THE COURT OF THE {{courtName}}

                                          O.S.No. {{osNumber}} of {{osYear}}
                                          E.P.No.          of {{epYear}}

{{decreeHolderName}}, {{decreeHolderBranch}}   )     Petitioner / Decree Holder

                                    Vs.

{{judgmentDebtorBlock}}

          EXECUTION PETITION FILED UNDER SECTION 39
                      OF THE CPC (TRANSFER)

    The petitioner/decree holder respectfully submits as follows:

    1. In the above suit, this Honourable Court has passed a decree dated {{decreeDate}} in favour of the petitioner/decree holder.

    2. The judgment debtor(s) reside(s) within the jurisdiction of the Court of the {{transferCourtName}}.

    3. {{transferReason}}

    4. The petitioner therefore prays that this Honourable Court may be pleased to transfer the decree with a certificate to the Court of the {{transferCourtName}} for execution against the judgment debtor(s) and their properties described in the schedule.

    5. The total amount for which execution is sought is Rs. {{totalAmount}}/- (details as per the accompanying computation).

{{previousEPBlock}}

                        SCHEDULE OF PROPERTIES

{{propertySchedule}}

    Dated this the {{date}}.

                                    {{advocateName}}
                                    Advocates, {{advocateAddress}}
                                    (For the Decree Holder)`,
};

// ============================================================
// 16. EP AFFIDAVIT (Branch Manager's Supporting Affidavit)
// ============================================================
export const EP_AFFIDAVIT_TEMPLATE = {
  name: "EP Supporting Affidavit (Bank Officer)",
  category: "BANKING_MATTER",
  documentType: "EP_AFFIDAVIT",
  description: "Supporting affidavit by bank officer filed with Execution Petition",
  courtType: null,
  variables: JSON.stringify([
    "courtName", "osNumber", "osYear", "epNumber", "epYear",
    "eaYear",
    "decreeHolderName", "decreeHolderBranch",
    "judgmentDebtorBlock",
    "deponentName", "deponentAge", "deponentRelation",
    "deponentDesignation", "deponentAddress",
    "epPurpose", "epFactsBlock",
    "date",
  ]),
  content: `IN THE COURT OF THE {{courtName}}

                                          O.S.No. {{osNumber}} of {{osYear}}
                                          E.P.No. {{epNumber}} of {{epYear}}
                                          E.A.No.          of {{eaYear}}

{{decreeHolderName}}, {{decreeHolderBranch}}   )     Petitioner / Decree Holder

                                    Vs.

{{judgmentDebtorBlock}}

                              AFFIDAVIT

    I, {{deponentName}}, aged {{deponentAge}} years, {{deponentRelation}}, {{deponentDesignation}}, {{decreeHolderName}}, {{decreeHolderBranch}}, do hereby solemnly affirm and state as follows:

    1. I am the {{deponentDesignation}} of the decree holder bank and I am acquainted with the facts of the case.

    2. The above E.P. is one for {{epPurpose}}.

{{epFactsBlock}}

    The above facts are true.

    Dated this the          day of {{date}}.

                                                    DEPONENT`,
};

// ============================================================
// EXPORT ALL BANKING TEMPLATES
// ============================================================
export const BANKING_TEMPLATES = [
  BANK_DEMAND_NOTICE_TEMPLATE,
  BANKING_OS_PLAINT_TEMPLATE,
  BANKING_CS_PLAINT_TEMPLATE,
  FACT_AFFIDAVIT_TEMPLATE,
  VERIFICATION_AFFIDAVIT_TEMPLATE,
  STATEMENT_OF_TRUTH_TEMPLATE,
  MEDIATION_APPLICATION_TEMPLATE,
  VAKALATNAMA_TEMPLATE,
  BATTA_MEMO_TEMPLATE,
  SUMMONS_TEMPLATE,
  PROOF_AFFIDAVIT_TEMPLATE,
  EP_ARREST_TEMPLATE,
  EP_ATTACHMENT_SALE_TEMPLATE,
  EP_SALE_TEMPLATE,
  EP_TRANSFER_TEMPLATE,
  EP_AFFIDAVIT_TEMPLATE,
];

/**
 * Document types per suit type.
 * Used by the pipeline UI to show the correct filing bundle checklist.
 */
export const OS_FILING_BUNDLE = [
  "FACT_AFFIDAVIT",
  "VERIFICATION_AFFIDAVIT",
  "VAKALATNAMA",
  "BATTA_MEMO",
  "SUMMONS",
];

export const CS_FILING_BUNDLE = [
  "FACT_AFFIDAVIT",
  "STATEMENT_OF_TRUTH",
  "VAKALATNAMA",
  "BATTA_MEMO",
  "SUMMONS",
  "MEDIATION_APPLICATION", // usually already generated before plaint
];

export const EP_TYPES = [
  { code: "EP_ARREST", label: "Arrest (Order 21 Rule 38)", description: "Arrest and detention in civil prison" },
  { code: "EP_ATTACHMENT_SALE", label: "Attachment & Sale (Order 21 Rules 54, 66)", description: "Attachment and sale of immovable property" },
  { code: "EP_SALE", label: "Sale of Attached Property", description: "Sale of already-attached property" },
  { code: "EP_TRANSFER", label: "Transfer (Section 39 CPC)", description: "Transfer decree to another court" },
  { code: "EP_DELIVERY", label: "Delivery of Property", description: "Delivery of specific movable/immovable property" },
];

export const MATTER_STAGES = [
  { code: "DOCUMENTS", label: "Document Upload & Extraction", order: 1 },
  { code: "NOTICE", label: "Demand Notice", order: 2 },
  { code: "MEDIATION", label: "Pre-Institution Mediation (CS only)", order: 3 },
  { code: "PLAINT", label: "Plaint Generation", order: 4 },
  { code: "FILING_BUNDLE", label: "Filing Bundle / Annexures", order: 5 },
  { code: "FILED", label: "Filed in Court", order: 6 },
  { code: "TRIAL", label: "Trial — Proof Affidavit", order: 7 },
  { code: "DECREE", label: "Decree Received", order: 8 },
  { code: "EXECUTION", label: "Execution Petition", order: 9 },
];
