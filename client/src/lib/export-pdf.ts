import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { type Scheme } from "@shared/routes";

export function generateSchemePDF(scheme: Scheme) {
  // Create a new PDF document (A4 size)
  const doc = new jsPDF();

  // Document Title / Header
  doc.setFontSize(20);
  doc.setTextColor(33, 37, 41);
  doc.text("Bharath Scheme Bot", 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(108, 117, 125);
  doc.text("Government Scheme Details (Generated automatically)", 14, 30);

  // Line separator
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 35, 196, 35);

  // Scheme Name
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  const splitTitle = doc.splitTextToSize(scheme.name, 180);
  doc.text(splitTitle, 14, 45);

  let currentY = 45 + (splitTitle.length * 7) + 5;

  // Metadata
  doc.setFontSize(11);
  doc.setTextColor(73, 80, 87);
  doc.text(`Category: ${scheme.category}`, 14, currentY);
  doc.text(`State/Source: ${scheme.state} / ${scheme.source}`, 100, currentY);
  currentY += 10;

  // Key details table
  autoTable(doc, {
    startY: currentY,
    head: [['Section', 'Details']],
    body: [
      ['Description', scheme.description],
      ['Benefits', scheme.benefits],
      ['Eligibility', scheme.eligibility],
      ['Beneficiaries', scheme.beneficiaries],
      ['Documents Required', scheme.documents],
      ['Application Process', scheme.applicationProcess]
    ],
    theme: 'grid',
    headStyles: { fillColor: [44, 122, 123] }, // primary theme color roughly
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 140 }
    },
    styles: { fontSize: 10, cellPadding: 4, overflow: 'linebreak' },
    margin: { top: 10, left: 14, right: 14 }
  });

  // Access final Y position of the table
  const finalY = (doc as any).lastAutoTable.finalY || currentY + 50;

  // Footer / Official Link
  if (scheme.officialLink) {
    doc.setFontSize(11);
    doc.setTextColor(0, 86, 179);
    doc.textWithLink("Click here to visit the Official Application Portal", 14, finalY + 15, { url: scheme.officialLink });
  }

  // Save the PDF
  const filename = `${scheme.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_details.pdf`;
  doc.save(filename);
}
