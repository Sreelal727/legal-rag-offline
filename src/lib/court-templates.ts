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
