// Synthetic PDF with a table + headings + list — just enough for a smoke test.
// Uses jsPDF which is already in the project.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { writeFileSync } from "node:fs";

const doc = new jsPDF();
doc.setFontSize(16);
doc.text("ENCUMBRANCE CERTIFICATE (SAMPLE)", 14, 20);
doc.setFontSize(11);
doc.text("SRO: Palakkad   Period: 01/01/2010 to 31/12/2024", 14, 30);

doc.setFontSize(13);
doc.text("Transactions", 14, 42);

autoTable(doc, {
  startY: 46,
  head: [["Year", "Doc No.", "Nature", "Executant", "Consideration"]],
  body: [
    ["2011", "1245/2011", "Sale Deed", "Raman → Krishnan", "Rs. 2,50,000"],
    ["2015", "3890/2015", "Mortgage", "Krishnan → SBI", "Rs. 5,00,000"],
    ["2018", "7712/2018", "Release Deed", "SBI → Krishnan", "Nil"],
    ["2021", "2201/2021", "Sale Deed", "Krishnan → Rajan", "Rs. 12,00,000"],
  ],
});

doc.setFontSize(13);
doc.text("SCHEDULE OF PROPERTY", 14, 100);
doc.setFontSize(11);
doc.text([
  "All that piece and parcel of land measuring 8 cents,",
  "comprised in Survey No. 123/4 of Palakkad Village,",
  "bounded by — East: Public road, West: Canal,",
  "North: Property of Suresh, South: Property of Geetha."
], 14, 110);

doc.setFontSize(13);
doc.text("WITNESSES", 14, 150);
doc.setFontSize(11);
doc.text([
  "1. Mohan Pillai, S/o Balakrishnan, Palakkad",
  "2. Shanti Menon, W/o Ramachandran, Palakkad"
], 20, 160);

writeFileSync("/tmp/sample-ec.pdf", Buffer.from(doc.output("arraybuffer")));
console.log("Wrote /tmp/sample-ec.pdf");
