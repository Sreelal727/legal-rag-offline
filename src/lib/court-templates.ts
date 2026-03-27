export const COURT_TEMPLATES = [
  {
    name: "Civil Suit Plaint",
    category: "CASE_FILING",
    documentType: "PLAINT",
    description: "Standard civil suit plaint format",
    courtType: "DISTRICT_COURT",
    variables: JSON.stringify(["courtName", "caseNumber", "plaintiffName", "plaintiffAddress", "defendantName", "defendantAddress", "suitValue", "courtFee", "causeOfAction", "reliefSought", "facts", "advocateName", "date", "place"]),
    content: `IN THE COURT OF {{courtName}}

C.S. No. {{caseNumber}} of {{year}}

{{plaintiffName}},
{{plaintiffDesignation}} {{plaintiffFatherName}},
Aged about {{plaintiffAge}} years, {{plaintiffOccupation}},
Residing at {{plaintiffAddress}}.
                                                    ... PLAINTIFF

        VERSUS

{{defendantName}},
{{defendantDesignation}} {{defendantFatherName}},
Aged about {{defendantAge}} years,
Residing at {{defendantAddress}}.
                                                    ... DEFENDANT

SUIT FOR {{reliefSought}}
(Valued at Rs. {{suitValue}}/- for the purpose of Court Fee and Jurisdiction)
Court Fee: Rs. {{courtFee}}/-

PLAINT

The plaintiff above named respectfully submits as follows:

1. That the plaintiff is a resident of {{plaintiffAddress}} and is well known in the locality.

2. That the defendant is a resident of {{defendantAddress}} and is known to the plaintiff.

3. FACTS OF THE CASE:
{{facts}}

4. CAUSE OF ACTION:
{{causeOfAction}}

5. VALUATION AND COURT FEE:
The suit is valued at Rs. {{suitValue}}/- for the purpose of court fee and jurisdiction. Court fee of Rs. {{courtFee}}/- is paid herewith.

6. JURISDICTION:
This Hon'ble Court has jurisdiction to try and entertain the present suit as the cause of action has arisen within the jurisdiction of this Court.

7. LIMITATION:
The suit is within the period of limitation.

PRAYER:
In the light of the facts and circumstances stated above, it is most respectfully prayed that this Hon'ble Court may be pleased to:

a) {{reliefSought}};
b) Award costs of the suit to the plaintiff;
c) Grant such other and further relief(s) as this Hon'ble Court may deem fit and proper in the circumstances of the case.

Place: {{place}}
Date: {{date}}

                                        PLAINTIFF
                                        Through Advocate
                                        {{advocateName}}

VERIFICATION:
I, {{plaintiffName}}, the plaintiff above named, do hereby verify that the contents of paragraphs 1 to 7 of the above plaint are true and correct to my knowledge and belief and nothing material has been concealed therefrom.

Verified at {{place}} on this {{date}}.

                                        PLAINTIFF`,
  },
  {
    name: "Rent Control Petition",
    category: "CASE_FILING",
    documentType: "RCP",
    description: "Rent Control Petition under Rent Control Act",
    courtType: "DISTRICT_COURT",
    variables: JSON.stringify(["courtName", "petitionerName", "petitionerAddress", "respondentName", "respondentAddress", "propertyDescription", "monthlyRent", "arrears", "period", "advocateName", "date", "place"]),
    content: `IN THE COURT OF THE RENT CONTROLLER, {{courtName}}

R.C.P. No. ______ of {{year}}

{{petitionerName}},
{{petitionerDesignation}} {{petitionerFatherName}},
Residing at {{petitionerAddress}}.
                                                    ... PETITIONER/LANDLORD

        VERSUS

{{respondentName}},
{{respondentDesignation}} {{respondentFatherName}},
Residing at {{respondentAddress}}.
                                                    ... RESPONDENT/TENANT

PETITION UNDER SECTION 10 OF THE RENT CONTROL ACT FOR EVICTION

The petitioner above named respectfully submits as follows:

1. That the petitioner is the owner/landlord of the premises bearing {{propertyDescription}}.

2. That the respondent is the tenant in the above said premises at a monthly rent of Rs. {{monthlyRent}}/-.

3. That the respondent has not paid rent for the period {{period}} and the total arrears amount to Rs. {{arrears}}/-.

4. GROUNDS FOR EVICTION:
(a) Non-payment of rent as stated above.
(b) [Additional grounds if any]

5. That the petitioner has issued a notice to the respondent demanding payment of arrears and vacating the premises, but the respondent has failed to comply.

PRAYER:
a) Direct the respondent to vacate and deliver vacant possession of the premises;
b) Direct the respondent to pay the arrears of rent;
c) Award costs of the petition;
d) Grant such other relief as deemed fit.

Place: {{place}}
Date: {{date}}

                                        PETITIONER
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Guardian & Wards Petition",
    category: "CASE_FILING",
    documentType: "GOP",
    description: "Petition under Guardian and Wards Act",
    courtType: "DISTRICT_COURT",
    variables: JSON.stringify(["courtName", "petitionerName", "petitionerAddress", "minorName", "minorAge", "relationship", "advocateName", "date", "place"]),
    content: `IN THE COURT OF {{courtName}}

G.O.P. No. ______ of {{year}}

{{petitionerName}},
{{petitionerDesignation}} {{petitionerFatherName}},
Residing at {{petitionerAddress}}.
                                                    ... PETITIONER

IN THE MATTER OF:
{{minorName}}, aged {{minorAge}} years,
                                                    ... MINOR

PETITION UNDER SECTION 7 OF THE GUARDIANS AND WARDS ACT, 1890

The petitioner respectfully submits as follows:

1. That the petitioner is the {{relationship}} of the minor {{minorName}}, aged {{minorAge}} years.

2. That the minor is in need of a guardian for the person/property of the minor.

3. That the petitioner is a fit and proper person to be appointed as guardian of the minor.

4. DETAILS OF MINOR'S PROPERTY (if applicable):
[Property details]

5. That no other application for guardianship of the said minor is pending in any Court.

PRAYER:
It is most respectfully prayed that this Hon'ble Court may be pleased to appoint the petitioner as the guardian of the person/property of the minor {{minorName}}.

Place: {{place}}
Date: {{date}}

                                        PETITIONER
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Succession/Probate Petition",
    category: "CASE_FILING",
    documentType: "SOP",
    description: "Succession Certificate / Letters of Administration",
    courtType: "DISTRICT_COURT",
    variables: JSON.stringify(["courtName", "petitionerName", "petitionerAddress", "deceasedName", "dateOfDeath", "relationship", "propertyDetails", "advocateName", "date", "place"]),
    content: `IN THE COURT OF {{courtName}}

S.O.P. No. ______ of {{year}}

{{petitionerName}},
{{petitionerDesignation}} {{petitionerFatherName}},
Residing at {{petitionerAddress}}.
                                                    ... PETITIONER

PETITION FOR SUCCESSION CERTIFICATE / LETTERS OF ADMINISTRATION
UNDER SECTION 372 OF THE INDIAN SUCCESSION ACT, 1925

The petitioner respectfully submits as follows:

1. That {{deceasedName}} died on {{dateOfDeath}} at [place of death].

2. That the petitioner is the {{relationship}} of the deceased.

3. That the deceased died intestate / leaving behind a Will dated [date].

4. DETAILS OF LEGAL HEIRS:
[List of legal heirs with relationship and address]

5. DETAILS OF PROPERTY/DEBTS:
{{propertyDetails}}

6. That no application for succession certificate has been made to any Court.

PRAYER:
Grant succession certificate / letters of administration in favour of the petitioner.

Place: {{place}}
Date: {{date}}

                                        PETITIONER
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "SARFAESI Application",
    category: "CASE_FILING",
    documentType: "SARFAESI",
    description: "Application under SARFAESI Act, 2002",
    courtType: "DISTRICT_COURT",
    variables: JSON.stringify(["courtName", "bankName", "branchName", "borrowerName", "borrowerAddress", "loanAmount", "outstandingAmount", "propertyDescription", "demandNoticeDate", "advocateName", "date", "place"]),
    content: `BEFORE THE DEBTS RECOVERY TRIBUNAL / CHIEF METROPOLITAN MAGISTRATE
{{courtName}}

S.A. No. ______ of {{year}}

{{bankName}}, {{branchName}},
Through its Authorized Officer,
                                                    ... APPLICANT/SECURED CREDITOR

        VERSUS

{{borrowerName}},
Residing at {{borrowerAddress}}.
                                                    ... RESPONDENT/BORROWER

APPLICATION UNDER SECTION 14 OF THE SECURITISATION AND RECONSTRUCTION OF
FINANCIAL ASSETS AND ENFORCEMENT OF SECURITY INTEREST ACT, 2002

1. That the applicant is a banking company / financial institution as defined under SARFAESI Act, 2002.

2. That the respondent availed loan facility of Rs. {{loanAmount}}/- from the applicant bank.

3. That the outstanding dues as on date amount to Rs. {{outstandingAmount}}/-.

4. That a demand notice under Section 13(2) was issued on {{demandNoticeDate}}.

5. DETAILS OF SECURED ASSET:
{{propertyDescription}}

6. That the respondent failed to repay the outstanding dues within 60 days of the demand notice.

PRAYER:
a) Take possession of the secured asset described above;
b) Grant such other relief as deemed fit.

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "138 NI Act Complaint",
    category: "CASE_FILING",
    documentType: "NI_ACT_138",
    description: "Complaint under Section 138 of Negotiable Instruments Act",
    courtType: "DISTRICT_COURT",
    variables: JSON.stringify(["courtName", "complainantName", "complainantAddress", "accusedName", "accusedAddress", "chequeNumber", "chequeDate", "chequeAmount", "bankName", "dishonourDate", "demandNoticeDate", "advocateName", "date", "place"]),
    content: `IN THE COURT OF {{courtName}}

C.C. No. ______ of {{year}}

{{complainantName}},
{{complainantDesignation}} {{complainantFatherName}},
Residing at {{complainantAddress}}.
                                                    ... COMPLAINANT

        VERSUS

{{accusedName}},
{{accusedDesignation}} {{accusedFatherName}},
Residing at {{accusedAddress}}.
                                                    ... ACCUSED

COMPLAINT UNDER SECTION 138 OF NEGOTIABLE INSTRUMENTS ACT, 1881

The complainant respectfully submits as follows:

1. That the accused issued Cheque No. {{chequeNumber}} dated {{chequeDate}} for Rs. {{chequeAmount}}/- drawn on {{bankName}} in favour of the complainant.

2. That the said cheque was issued towards discharge of legally enforceable debt/liability.

3. That when the cheque was presented for payment, it was dishonoured on {{dishonourDate}} with the endorsement "Insufficient Funds" / "Account Closed" / [reason].

4. That a demand notice under Section 138 was sent on {{demandNoticeDate}} by Registered Post AD.

5. That despite receipt of the said notice, the accused has failed to make payment within 15 days.

6. That this complaint is filed within the statutory period of limitation.

PRAYER:
a) Take cognizance of the offence under Section 138 of NI Act;
b) Punish the accused with imprisonment up to two years or fine up to twice the cheque amount;
c) Direct the accused to pay compensation under Section 357 Cr.P.C.;
d) Grant such other relief as deemed fit.

Place: {{place}}
Date: {{date}}

                                        COMPLAINANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Caveat Petition",
    category: "CASE_FILING",
    documentType: "CAVEAT",
    description: "Caveat Petition under Section 148A CPC",
    courtType: "DISTRICT_COURT",
    variables: JSON.stringify(["courtName", "caveatorName", "caveatorAddress", "potentialPetitionerName", "advocateName", "date", "place"]),
    content: `IN THE COURT OF {{courtName}}

CAVEAT PETITION NO. ______ of {{year}}

{{caveatorName}},
{{caveatorDesignation}} {{caveatorFatherName}},
Residing at {{caveatorAddress}}.
                                                    ... CAVEATOR

IN THE MATTER OF:
Any application/petition/suit that may be filed by
{{potentialPetitionerName}}.

CAVEAT PETITION UNDER SECTION 148A OF THE CODE OF CIVIL PROCEDURE, 1908

To,
The Hon'ble Court,

The caveator above named respectfully submits as follows:

1. That the caveator has reason to believe that {{potentialPetitionerName}} may file a suit/application/petition against the caveator.

2. That the caveator apprehends that an ex-parte order may be passed against the caveator without hearing the caveator.

3. BRIEF FACTS:
[State facts giving rise to apprehension]

PRAYER:
It is most respectfully prayed that no order may be passed in any proceeding filed by {{potentialPetitionerName}} without giving notice and hearing to the caveator.

Place: {{place}}
Date: {{date}}

                                        CAVEATOR
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Proof Affidavit",
    category: "AFFIDAVIT",
    documentType: "PROOF_AFFIDAVIT",
    description: "Affidavit of Proof / Evidence Affidavit",
    courtType: null,
    variables: JSON.stringify(["courtName", "caseNumber", "deponentName", "deponentAddress", "deponentAge", "facts", "advocateName", "date", "place"]),
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{partyName}}                               ... PLAINTIFF/PETITIONER
        VERSUS
{{oppositePartyName}}                       ... DEFENDANT/RESPONDENT

AFFIDAVIT OF PROOF
(Under Order XVIII Rule 4 of CPC)

I, {{deponentName}}, aged {{deponentAge}} years, {{deponentDesignation}} {{deponentFatherName}}, residing at {{deponentAddress}}, do hereby solemnly affirm and state as follows:

1. That I am the Plaintiff/Petitioner in the above case and I am competent to swear this affidavit.

2. That I have filed the above suit/petition and the averments made therein are true and correct.

3. FACTS:
{{facts}}

4. That the documents filed along with the plaint/petition are true copies of the originals.

5. That I state that whatever is stated above is true and correct to the best of my knowledge and belief.

DEPONENT

VERIFICATION:
I, {{deponentName}}, the deponent above named, do hereby verify that the contents of the above affidavit are true and correct to my knowledge, no part of it is false, and nothing material has been concealed therefrom.

Verified at {{place}} on this {{date}}.

DEPONENT

Before me,
Notary Public / Oath Commissioner`,
  },
  {
    name: "Fact Affidavit",
    category: "AFFIDAVIT",
    documentType: "FACT_AFFIDAVIT",
    description: "General Affidavit of Facts",
    courtType: null,
    variables: JSON.stringify(["deponentName", "deponentAddress", "deponentAge", "facts", "date", "place"]),
    content: `AFFIDAVIT

I, {{deponentName}}, aged about {{deponentAge}} years, {{deponentDesignation}} {{deponentFatherName}}, residing at {{deponentAddress}}, do hereby solemnly affirm and state on oath as follows:

1. That I am the deponent herein and am fully conversant with the facts of the case.

{{facts}}

I state that whatever is stated hereinabove is true and correct to the best of my knowledge and belief and nothing material has been concealed therefrom.

DEPONENT

VERIFICATION:
Verified at {{place}} on this {{date}} that the contents of the above affidavit are true and correct to my knowledge, no part of it is false.

DEPONENT

Before me,
Notary Public / Oath Commissioner`,
  },
  {
    name: "Statement of Truth",
    category: "AFFIDAVIT",
    documentType: "STATEMENT_OF_TRUTH",
    description: "Statement of Truth for pleadings",
    courtType: null,
    variables: JSON.stringify(["courtName", "caseNumber", "partyName", "partyRole", "date", "place"]),
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

STATEMENT OF TRUTH

I, {{partyName}}, the {{partyRole}} in the above case, state that I believe the facts stated in this [Plaint/Written Statement/Counter] are true.

I understand that proceedings for contempt of court may be brought against any person who makes, or causes to be made, a false statement in a document verified by a statement of truth without an honest belief in its truth.

Full Name: {{partyName}}
Capacity: {{partyRole}}
Date: {{date}}
Place: {{place}}

                                        DEPONENT`,
  },
  {
    name: "Verification Affidavit",
    category: "AFFIDAVIT",
    documentType: "VERIFICATION_AFFIDAVIT",
    description: "Verification Affidavit for pleadings under Order VI Rule 15 CPC",
    courtType: null,
    variables: JSON.stringify(["courtName", "caseNumber", "deponentName", "deponentAddress", "paragraphNumbers", "date", "place"]),
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{partyName}}                               ... PLAINTIFF/PETITIONER
        VERSUS
{{oppositePartyName}}                       ... DEFENDANT/RESPONDENT

VERIFICATION AFFIDAVIT
(Under Order VI Rule 15 of the Code of Civil Procedure, 1908)

I, {{deponentName}}, the Plaintiff/Petitioner above named, do hereby verify that the contents of paragraphs {{paragraphNumbers}} of the above Plaint/Petition are true to my personal knowledge and the contents of paragraphs [numbers] are true to my information and belief.

I further verify that nothing material has been concealed and no part of the above is false.

Verified at {{place}} on this {{date}}.

                                        DEPONENT`,
  },
];

// ─── Interlocutory Application Templates ─────────────────────────────────────

const IA_VARS_COMMON = JSON.stringify([
  "courtName", "caseNumber", "caseType", "year",
  "petitionerName", "respondentName",
  "applicantName", "applicantRole",
  "facts", "grounds", "reliefSought",
  "advocateName", "date", "place",
]);

export const IA_TEMPLATES = [
  {
    name: "Emergent Numbering Application",
    category: "INTERLOCUTORY",
    documentType: "IA_EMERGENT_NUMBERING",
    description: "Application for emergent/urgent numbering of the main petition",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PETITIONER/PLAINTIFF
        VERSUS
{{respondentName}}                              ... RESPONDENT/DEFENDANT

APPLICATION FOR EMERGENT NUMBERING

To,
The Hon'ble Court,

The applicant/petitioner most respectfully submits as follows:

1. That the above case is filed today and is pending numbering.

2. GROUNDS FOR URGENCY:
{{facts}}

3. That unless the matter is numbered on an emergent basis, the applicant will suffer irreparable loss and injury.

PRAYER:
It is prayed that this Hon'ble Court be pleased to number the above case on an emergent basis and list the same for hearing at the earliest.

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Advance Application",
    category: "INTERLOCUTORY",
    documentType: "IA_ADVANCE",
    description: "Application for advance hearing / advance cause list",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PETITIONER/PLAINTIFF
        VERSUS
{{respondentName}}                              ... RESPONDENT/DEFENDANT

APPLICATION TO ADVANCE THE CASE

To,
The Hon'ble Court,

The applicant respectfully submits:

1. That the above case is listed for hearing on [next date].

2. GROUNDS:
{{facts}}

3. That the applicant will suffer irreparable hardship if the case is not advanced.

PRAYER:
Advance the case and list it for hearing on an earlier date convenient to this Hon'ble Court.

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Injunction Application",
    category: "INTERLOCUTORY",
    documentType: "IA_INJUNCTION",
    description: "Application for temporary injunction under Order XXXIX Rule 1 & 2 CPC",
    variables: JSON.stringify([
      "courtName", "caseNumber", "caseType", "year",
      "petitionerName", "respondentName",
      "propertyDescription", "facts", "grounds",
      "advocateName", "date", "place",
    ]),
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION FOR TEMPORARY INJUNCTION
(Under Order XXXIX Rule 1 & 2 of CPC)

The applicant/plaintiff respectfully submits:

1. SUBJECT MATTER:
{{propertyDescription}}

2. FACTS:
{{facts}}

3. GROUNDS:
{{grounds}}

4. PRIMA FACIE CASE: The applicant has a strong prima facie case on merits.

5. BALANCE OF CONVENIENCE: Balance of convenience is in favour of the applicant.

6. IRREPARABLE LOSS: The applicant will suffer irreparable loss and injury if injunction is not granted.

PRAYER:
(a) Issue a temporary injunction restraining the respondent from [specific acts] in respect of {{propertyDescription}};
(b) Pass such other orders as deemed fit.

Place: {{place}}
Date: {{date}}

                                        APPLICANT/PLAINTIFF
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Attachment Application",
    category: "INTERLOCUTORY",
    documentType: "IA_ATTACHMENT",
    description: "Application for attachment before judgment under Order XXXVIII Rule 5 CPC",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF
        VERSUS
{{respondentName}}                              ... DEFENDANT

I.A. No. ______ of {{year}}

APPLICATION FOR ATTACHMENT BEFORE JUDGMENT
(Under Order XXXVIII Rule 5 of CPC)

1. FACTS:
{{facts}}

2. GROUNDS:
{{grounds}}

3. That the defendant is about to dispose of/remove/conceal the property to defeat the decree.

4. PROPERTY SOUGHT TO BE ATTACHED:
[Describe property]

PRAYER:
Attach the property of the defendant as described above before judgment.

Place: {{place}}
Date: {{date}}

                                        PLAINTIFF
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Commission Application",
    category: "INTERLOCUTORY",
    documentType: "IA_COMMISSION",
    description: "Application for appointment of Advocate Commissioner",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION FOR APPOINTMENT OF ADVOCATE COMMISSIONER
(Under Order XXVI Rule 9 of CPC)

1. FACTS:
{{facts}}

2. PURPOSE OF COMMISSION:
[Inspection / Local Investigation / Examination of accounts, etc.]

3. PROPERTY/MATTER TO BE INSPECTED:
[Description]

PRAYER:
Appoint an Advocate Commissioner to inspect the schedule property / conduct local investigation.

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Set Aside Commission Report",
    category: "INTERLOCUTORY",
    documentType: "IA_SET_ASIDE_COMMISSION",
    description: "Application to set aside the Advocate Commissioner's report",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION TO SET ASIDE THE COMMISSIONER'S REPORT

1. That the Advocate Commissioner filed a report dated [date].

2. GROUNDS TO SET ASIDE:
{{grounds}}

3. That the said report is erroneous, prejudicial and contrary to the actual facts.

PRAYER:
Set aside the Commissioner's report.

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Remit Commission Report",
    category: "INTERLOCUTORY",
    documentType: "IA_REMIT_COMMISSION",
    description: "Application to remit the commission report for further inquiry",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION TO REMIT THE COMMISSIONER'S REPORT

1. That the Commissioner filed a report which is incomplete/insufficient.

2. REASONS FOR REMISSION:
{{grounds}}

PRAYER:
Remit the Commissioner's report for further inquiry on [specific aspects].

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Implead Application",
    category: "INTERLOCUTORY",
    documentType: "IA_IMPLEAD",
    description: "Application to implead additional party under Order I Rule 10 CPC",
    variables: JSON.stringify([
      "courtName", "caseNumber", "caseType", "year",
      "petitionerName", "respondentName",
      "newPartyName", "newPartyAddress", "newPartyRole",
      "facts", "grounds", "advocateName", "date", "place",
    ]),
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION TO IMPLEAD ADDITIONAL PARTY
(Under Order I Rule 10 of CPC)

1. PROPOSED PARTY:
{{newPartyName}}, {{newPartyAddress}}, as {{newPartyRole}}.

2. FACTS:
{{facts}}

3. GROUNDS:
{{grounds}}

4. That the proposed party is a necessary party whose presence is essential for complete adjudication.

PRAYER:
Implead {{newPartyName}} as {{newPartyRole}} in the above case.

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Amendment Application",
    category: "INTERLOCUTORY",
    documentType: "IA_AMEND",
    description: "Application to amend pleadings under Order VI Rule 17 CPC",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION TO AMEND PLAINT/PETITION
(Under Order VI Rule 17 of CPC)

1. PROPOSED AMENDMENT:
{{facts}}

2. GROUNDS:
{{grounds}}

3. That the amendment is necessary for proper determination of the dispute.

PRAYER:
Permit the amendment as set out in the schedule annexed hereto.

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Set Aside Abatement",
    category: "INTERLOCUTORY",
    documentType: "IA_SET_ASIDE_ABATEMENT",
    description: "Application to set aside abatement under Order XXII Rule 9 CPC",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION TO SET ASIDE ABATEMENT
(Under Order XXII Rule 9 of CPC)

1. That the above case was abated as the legal representatives of [deceased party] were not brought on record within the prescribed period.

2. That the applicant was prevented by sufficient cause from substituting within time.

3. GROUNDS:
{{grounds}}

PRAYER:
Set aside the abatement and restore the suit to its original file.

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Condone Delay Application",
    category: "INTERLOCUTORY",
    documentType: "IA_CONDONE_DELAY",
    description: "Application to condone delay under Section 5 of Limitation Act",
    variables: JSON.stringify([
      "courtName", "caseNumber", "caseType", "year",
      "applicantName", "respondentName",
      "delayDays", "reasonForDelay",
      "advocateName", "date", "place",
    ]),
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{applicantName}}                               ... APPLICANT
        VERSUS
{{respondentName}}                              ... RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION TO CONDONE DELAY OF {{delayDays}} DAYS
(Under Section 5 of the Limitation Act, 1963)

1. That the applicant is filing the above [appeal/petition] with a delay of {{delayDays}} days.

2. CAUSE FOR DELAY:
{{reasonForDelay}}

3. That the delay was not intentional and the applicant had sufficient cause.

4. That no prejudice will be caused to the respondent by condoning the delay.

PRAYER:
Condone the delay of {{delayDays}} days in filing the above [appeal/petition].

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Raise Attachment Application",
    category: "INTERLOCUTORY",
    documentType: "IA_RAISE_ATTACHMENT",
    description: "Application to raise/lift attachment of property",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION TO RAISE ATTACHMENT

1. PROPERTY ATTACHED:
[Description of attached property]

2. GROUNDS FOR RAISING ATTACHMENT:
{{grounds}}

3. [Payment made / Sufficient security furnished / Property belongs to third party]

PRAYER:
Raise the attachment on the property described above.

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Vacate Injunction Application",
    category: "INTERLOCUTORY",
    documentType: "IA_VACATE_INJUNCTION",
    description: "Application to vacate/modify temporary injunction",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION TO VACATE/MODIFY INJUNCTION

1. That this Hon'ble Court granted a temporary injunction on [date].

2. CHANGED CIRCUMSTANCES / GROUNDS TO VACATE:
{{grounds}}

3. That the injunction was obtained by suppression of material facts.

PRAYER:
Vacate/modify the interim injunction granted on [date].

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Substitute Service Application",
    category: "INTERLOCUTORY",
    documentType: "IA_SUBSTITUTE_SERVICE",
    description: "Application for substituted service of summons under Order V Rule 20 CPC",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION FOR SUBSTITUTED SERVICE
(Under Order V Rule 20 of CPC)

1. That summons were issued to the defendant/respondent but could not be served.

2. ATTEMPTS MADE FOR ORDINARY SERVICE:
{{facts}}

3. That the defendant is evading service / their whereabouts are unknown.

PRAYER:
Order substituted service by:
(a) Affixing copy of summons on the last known address;
(b) Publication in [newspaper name];
(c) Any other mode as deemed fit.

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Receive Written Statement",
    category: "INTERLOCUTORY",
    documentType: "IA_RECEIVE_WS",
    description: "Application to receive Written Statement / Counter Statement filed beyond time",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION TO RECEIVE WRITTEN STATEMENT / COUNTER STATEMENT / COUNTER CLAIM

1. That the applicant has filed the Written Statement/Counter Statement herewith.

2. REASON FOR DELAY:
{{facts}}

3. That the applicant was prevented by sufficient cause from filing within time.

PRAYER:
Receive the Written Statement / Counter Statement / Counter Claim filed herewith on record.

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Strike Off Defence Application",
    category: "INTERLOCUTORY",
    documentType: "IA_STRIKE_DEFENCE",
    description: "Application to strike off defence of defendant",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF
        VERSUS
{{respondentName}}                              ... DEFENDANT

I.A. No. ______ of {{year}}

APPLICATION TO STRIKE OFF DEFENCE

1. GROUNDS:
{{grounds}}

2. That the defendant has willfully disobeyed orders of this Court / acted in contempt / failed to comply with [specific order].

PRAYER:
Strike off the defence of the defendant.

Place: {{place}}
Date: {{date}}

                                        PLAINTIFF
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Extension of Time to Pay Court Fee",
    category: "INTERLOCUTORY",
    documentType: "IA_COURT_FEE_EXTENSION",
    description: "Application for extension of time to pay deficit court fee",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION FOR EXTENSION OF TIME TO PAY COURT FEE

1. That this Hon'ble Court directed payment of court fee of Rs. [amount] by [date].

2. REASON FOR INABILITY TO PAY:
{{facts}}

3. That the applicant is ready to pay the court fee but requires additional time.

PRAYER:
Grant extension of time to pay the court fee.

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Amend Decree/Judgment Application",
    category: "INTERLOCUTORY",
    documentType: "IA_AMEND_DECREE",
    description: "Application to amend decree/judgment under Section 152 CPC",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION TO AMEND DECREE / JUDGMENT
(Under Section 152 of CPC)

1. That this Hon'ble Court passed a decree / judgment on [date].

2. CLERICAL / ARITHMETICAL ERROR TO BE CORRECTED:
{{facts}}

3. That the said error is apparent on the face of the record.

PRAYER:
Correct the clerical/arithmetical error in the decree/judgment as prayed.

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Pass Final Decree Application",
    category: "INTERLOCUTORY",
    documentType: "IA_FINAL_DECREE",
    description: "Application to pass final decree after preliminary decree",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION TO PASS FINAL DECREE

1. That this Hon'ble Court passed a preliminary decree on [date].

2. That the conditions stipulated in the preliminary decree have been complied with / [partition / accounts have been taken].

3. FACTS:
{{facts}}

PRAYER:
Pass the final decree as per the preliminary decree.

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Dispense With Notice Application",
    category: "INTERLOCUTORY",
    documentType: "IA_DISPENSE_NOTICE",
    description: "Application to dispense with notice to respondent",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PETITIONER
        VERSUS
{{respondentName}}                              ... RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION TO DISPENSE WITH NOTICE

1. GROUNDS:
{{grounds}}

2. That issuing notice to the respondent will defeat the very purpose of the application.

3. That immediate ex-parte relief is necessary.

PRAYER:
Dispense with notice to the respondent and pass ex-parte orders.

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Record Full Satisfaction",
    category: "INTERLOCUTORY",
    documentType: "IA_FULL_SATISFACTION",
    description: "Application to record full satisfaction of decree",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}
(E.P. No. ______ of {{year}})

{{petitionerName}}                              ... DECREE HOLDER
        VERSUS
{{respondentName}}                              ... JUDGMENT DEBTOR

I.A. No. ______ of {{year}}

APPLICATION TO RECORD FULL SATISFACTION OF DECREE

1. That the decree passed in the above case has been fully satisfied.

2. DETAILS OF PAYMENT:
{{facts}}

3. That the decree holder confirms receipt of the full decree amount.

PRAYER:
Record full satisfaction of the decree.

Place: {{place}}
Date: {{date}}

                                        DECREE HOLDER
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Compromise Application",
    category: "INTERLOCUTORY",
    documentType: "IA_COMPROMISE",
    description: "Application to record compromise under Order XXIII Rule 3 CPC",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION TO RECORD COMPROMISE
(Under Order XXIII Rule 3 of CPC)

1. That the parties have arrived at a compromise on the following terms:
{{facts}}

2. That the compromise is lawful and in the interest of both parties.

PRAYER:
Record the compromise and pass a decree in terms thereof.

Place: {{place}}
Date: {{date}}

                                        PLAINTIFF / DEFENDANT
                                        Through Advocates`,
  },
  {
    name: "Break Open Lock Application",
    category: "INTERLOCUTORY",
    documentType: "IA_BREAK_OPEN_LOCK",
    description: "Application for warrant to break open lock during execution",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

E.P. No. ______ in {{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... DECREE HOLDER
        VERSUS
{{respondentName}}                              ... JUDGMENT DEBTOR

I.A. No. ______ of {{year}}

APPLICATION FOR WARRANT TO BREAK OPEN LOCK

1. That the decree holder is entitled to possession of [property description].

2. That the judgment debtor has locked the premises and is refusing to deliver possession.

3. FACTS:
{{facts}}

PRAYER:
Issue a warrant to break open the lock of the said premises and deliver possession to the decree holder.

Place: {{place}}
Date: {{date}}

                                        DECREE HOLDER
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Police Protection Application",
    category: "INTERLOCUTORY",
    documentType: "IA_POLICE_PROTECTION",
    description: "Application for police protection during execution/taking possession",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

E.P. No. ______ in {{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... DECREE HOLDER
        VERSUS
{{respondentName}}                              ... JUDGMENT DEBTOR

I.A. No. ______ of {{year}}

APPLICATION FOR POLICE PROTECTION

1. That the decree holder is entitled to [possession/delivery] of [property/goods].

2. APPREHENSION OF BREACH OF PEACE:
{{facts}}

3. That the judgment debtor is likely to resist execution and cause breach of peace.

PRAYER:
Direct the concerned police station to provide necessary police protection during execution.

Place: {{place}}
Date: {{date}}

                                        DECREE HOLDER
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Delivery Application",
    category: "INTERLOCUTORY",
    documentType: "IA_DELIVERY",
    description: "Application for delivery/possession of decreed property",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

E.P. No. ______ in {{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... DECREE HOLDER
        VERSUS
{{respondentName}}                              ... JUDGMENT DEBTOR

I.A. No. ______ of {{year}}

APPLICATION FOR DELIVERY OF POSSESSION

1. PROPERTY TO BE DELIVERED:
[Description]

2. That the decree holder has obtained a decree for delivery of possession.

3. FACTS:
{{facts}}

PRAYER:
Issue warrant for delivery of possession of the schedule property.

Place: {{place}}
Date: {{date}}

                                        DECREE HOLDER
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "FD Return Application",
    category: "INTERLOCUTORY",
    documentType: "IA_FD_RETURN",
    description: "Application for return of Fixed Deposit / deposited amount",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION FOR RETURN OF FIXED DEPOSIT / DEPOSITED AMOUNT

1. That an amount of Rs. [amount] was deposited in this Court as per order dated [date].

2. GROUNDS FOR RETURN:
{{grounds}}

3. That the purpose for which the amount was deposited has been fulfilled / the case has been disposed.

PRAYER:
Return the FD / deposited amount of Rs. [amount] to the applicant.

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Record of Majority Application",
    category: "INTERLOCUTORY",
    documentType: "IA_RECORD_MAJORITY",
    description: "Application to record attainment of majority by a minor party",
    variables: JSON.stringify([
      "courtName", "caseNumber", "caseType", "year",
      "minorName", "dateOfBirth", "dateMajority",
      "guardianName", "advocateName", "date", "place",
    ]),
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

I.A. No. ______ of {{year}}

APPLICATION TO RECORD ATTAINMENT OF MAJORITY

1. That {{minorName}}, who was a minor party in the above case, was born on {{dateOfBirth}} and attained majority on {{dateMajority}}.

2. That the guardian {{guardianName}} was representing the minor.

3. That the said minor has now attained majority and is competent to prosecute/defend the case independently.

PRAYER:
Record the attainment of majority by {{minorName}} and allow the case to proceed in their name.

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Adjournment Application",
    category: "INTERLOCUTORY",
    documentType: "IA_ADJOURNMENT",
    description: "Application / memo for adjournment",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

MEMO / APPLICATION FOR ADJOURNMENT

To,
The Hon'ble Court,

The applicant most respectfully requests adjournment of the above case for the following reason(s):

{{facts}}

It is prayed that this Hon'ble Court be pleased to adjourn the hearing of the above case to a convenient future date.

Place: {{place}}
Date: {{date}}

                                        ADVOCATE FOR APPLICANT
                                        {{advocateName}}`,
  },
  {
    name: "Remove From List Application",
    category: "INTERLOCUTORY",
    documentType: "IA_REMOVE_FROM_LIST",
    description: "Application to remove case from today's cause list",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

MEMO TO REMOVE FROM LIST

To,
The Hon'ble Court,

The above case has been posted today. The applicant prays that the case be removed from today's list due to the following reason:

{{facts}}

It is prayed to remove the above case from today's list.

Place: {{place}}
Date: {{date}}

                                        ADVOCATE
                                        {{advocateName}}`,
  },
  {
    name: "Call For Documents - Court",
    category: "INTERLOCUTORY",
    documentType: "IA_CALL_DOCUMENTS_COURT",
    description: "Application to call for documents from Court / Public Office",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION TO CALL FOR DOCUMENTS FROM COURT / PUBLIC OFFICE
(Under Order XIII Rule 10 of CPC / Section 91 of Evidence Act)

1. DOCUMENTS REQUIRED:
{{facts}}

2. RELEVANCE:
{{grounds}}

PRAYER:
Issue summons to [Court/Public Office] to produce the above documents.

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Call For Documents - Party",
    category: "INTERLOCUTORY",
    documentType: "IA_CALL_DOCUMENTS_PARTY",
    description: "Application to call for documents from opposite party",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... PLAINTIFF/PETITIONER
        VERSUS
{{respondentName}}                              ... DEFENDANT/RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION TO CALL FOR DOCUMENTS FROM OPPOSITE PARTY
(Under Order XI Rule 14 of CPC)

1. DOCUMENTS IN POSSESSION OF OPPOSITE PARTY:
{{facts}}

2. RELEVANCE TO THE CASE:
{{grounds}}

PRAYER:
Direct the opposite party to produce the above documents.

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
  {
    name: "Cheque Application",
    category: "INTERLOCUTORY",
    documentType: "IA_CHEQUE",
    description: "Application regarding deposited cheque / payment by cheque",
    variables: IA_VARS_COMMON,
    content: `IN THE COURT OF {{courtName}}

{{caseType}} No. {{caseNumber}} of {{year}}

{{petitionerName}}                              ... DECREE HOLDER / APPLICANT
        VERSUS
{{respondentName}}                              ... JUDGMENT DEBTOR / RESPONDENT

I.A. No. ______ of {{year}}

APPLICATION REGARDING CHEQUE

1. That the judgment debtor / respondent has tendered Cheque No. [number] dated [date] for Rs. [amount] drawn on [bank].

2. FACTS:
{{facts}}

3. RELIEF SOUGHT:
{{reliefSought}}

PRAYER:
{{reliefSought}}

Place: {{place}}
Date: {{date}}

                                        APPLICANT
                                        Through Advocate
                                        {{advocateName}}`,
  },
];

// Combined export of all templates for seeding
export const ALL_TEMPLATES = [...COURT_TEMPLATES, ...IA_TEMPLATES];
