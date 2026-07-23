import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to format date strings to readable DD MMM YYYY format
const formatDateStr = (dateS) => {
  if (!dateS) return '';
  const [y, m, d] = dateS.split('-');
  const obj = new Date(y, m - 1, d);
  return obj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Corporate school colors mapping for subject badges: bg, border, text
const subjectColorsRGB = {
  'Maths': { bg: [238, 244, 255], border: [37, 99, 235], text: [29, 78, 216] }, // blue
  'Science': { bg: [240, 253, 244], border: [22, 163, 74], text: [21, 128, 61] }, // green
  'English': { bg: [255, 251, 235], border: [217, 119, 6], text: [180, 83, 9] }, // yellow/orange
  'Hindi': { bg: [254, 242, 242], border: [220, 38, 38], text: [185, 28, 28] }, // red
  'Computer': { bg: [250, 245, 255], border: [147, 51, 234], text: [126, 34, 206] }, // purple
  'SST': { bg: [240, 253, 250], border: [13, 148, 136], text: [15, 118, 110] }, // teal
  'GK': { bg: [253, 242, 248], border: [219, 39, 119], text: [190, 24, 74] }, // pink
  'No Test': { bg: [248, 250, 252], border: [100, 116, 139], text: [51, 65, 85] } // slate
};

// Header & Summary section cards drawing function
function drawHeader(doc, planner, classesCount, overallDateRange) {
  const pageWidth = doc.internal.pageSize.width;

  // 1. Premium Faux Gradient Top Strip (#6366F1 -> #8B5CF6)
  const segments = 20;
  const segmentWidth = pageWidth / segments;
  for (let s = 0; s < segments; s++) {
    const ratio = s / (segments - 1);
    const r = Math.round(99 + ratio * (139 - 99));
    const g = Math.round(102 + ratio * (92 - 102));
    const b = Math.round(241 + ratio * (246 - 241));
    doc.setFillColor(r, g, b);
    doc.rect(s * segmentWidth, 0, segmentWidth + 0.1, 4.5, 'F');
  }

  // 2. White Header Left Align Logo & School Name
  // Vector Shield crest (Navy Gray Outline, premium detail)
  doc.setDrawColor(31, 41, 55); // #1F2937
  doc.setLineWidth(0.4);
  doc.roundedRect(15, 8, 9, 9, 2, 2, 'D');
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 8, 9, 9, 2, 2, 'F');

  // Cap lines inside badge
  doc.setDrawColor(99, 102, 241); // Indigo
  doc.setLineWidth(0.4);
  doc.line(16.5, 12.5, 19.5, 10.5);
  doc.line(19.5, 10.5, 22.5, 12.5);
  doc.line(22.5, 12.5, 19.5, 14.5);
  doc.line(19.5, 14.5, 16.5, 12.5);
  doc.line(19.5, 14.5, 19.5, 16);

  // School name and title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(31, 41, 55); // #1F2937
  doc.text('TESTMASTER PRO ACADEMY', 27, 13.5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Academic Management & Assessment Planner Sheet', 27, 17);

  // Right-aligned planner identifiers
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.text(planner.name.toUpperCase(), pageWidth - 15, 13, { align: 'right' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Official Record • Generated: ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth - 15, 17, { align: 'right' });

  // 3. Compact Summary Cards (5 side-by-side cards, 51mm wide, 14mm high, 3mm gap)
  const cardW = 51;
  const cardH = 14;
  const gap = 3;
  const startY = 22;

  const cardProperties = [
    { label: 'ASSESSMENT TYPE', value: planner.assessmentType === 'Main Exam' && planner.selectedMainExam ? `${planner.assessmentType} (${planner.selectedMainExam})` : planner.assessmentType },
    { label: 'PLANNER NAME', value: planner.name },
    { label: 'CLASSES COUNT', value: `${classesCount} Classes` },
    { label: 'DATE RANGE', value: overallDateRange },
    { label: 'STATUS', value: planner.status || 'Draft', isStatus: true }
  ];

  cardProperties.forEach((card, index) => {
    const cardX = 15 + index * (cardW + gap);

    // Draw card box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.35);
    doc.roundedRect(cardX, startY, cardW, cardH, 1.5, 1.5, 'FD');

    // Draw label text
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(card.label, cardX + 3, startY + 4.5);

    // Draw value text
    if (card.isStatus) {
      // Draw a custom status badge inside card
      const statusText = card.value;
      const statusColor = statusText === 'Published' 
        ? { bg: [209, 250, 229], border: [34, 197, 94], text: [6, 95, 70] }
        : statusText === 'Archived'
          ? { bg: [241, 245, 249], border: [148, 163, 184], text: [71, 85, 105] }
          : { bg: [254, 243, 199], border: [245, 158, 11], text: [180, 83, 9] };

      doc.setFillColor(statusColor.bg[0], statusColor.bg[1], statusColor.bg[2]);
      doc.setDrawColor(statusColor.border[0], statusColor.border[1], statusColor.border[2]);
      doc.setLineWidth(0.2);
      doc.roundedRect(cardX + 3, startY + 6.5, 18, 4.5, 0.8, 0.8, 'FD');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(statusColor.text[0], statusColor.text[1], statusColor.text[2]);
      doc.text(statusText.toUpperCase(), cardX + 12, startY + 9.8, { align: 'center' });
    } else {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85); // slate-700
      
      // Handle overflow value truncation
      let val = card.value || '';
      if (val.length > 28) val = val.substring(0, 26) + '...';
      doc.text(val, cardX + 3, startY + 10.5);
    }
  });

  // Thin separator under summary cards
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(15, 39, pageWidth - 15, 39);
}

// Legend drawing helper displaying bordered chips
function drawLegend(doc, startY) {
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('SUBJECT LEGEND:', 15, startY + 3.5);

  let currentX = 45;
  Object.entries(subjectColorsRGB).forEach(([sub, color]) => {
    // Draw chip background & borders
    doc.setFillColor(color.bg[0], color.bg[1], color.bg[2]);
    doc.setDrawColor(color.border[0], color.border[1], color.border[2]);
    doc.setLineWidth(0.22);
    doc.roundedRect(currentX, startY, 23, 4.5, 1, 1, 'FD');
    
    // Draw label centered
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(color.text[0], color.text[1], color.text[2]);
    doc.text(sub, currentX + 11.5, startY + 3.3, { align: 'center' });
    
    currentX += 26;
  });
}

// Complete Paginated PDF Exporter
export function exportPlannerToPDF(planner, availableClasses) {
  if (!planner) return;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // 1. Generate dates array
  const dates = [];
  const start = new Date(planner.startDate);
  const end = new Date(planner.endDate);
  const skipDays = planner.skipDays || [];
  const skipSpecificDates = planner.skipSpecificDates || [];

  let current = new Date(start);
  const safetyLimit = new Date(start);
  safetyLimit.setMonth(safetyLimit.getMonth() + 3);

  while (current <= end && current <= safetyLimit) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const dayOfWeek = current.getDay();

    const isHoliday = skipDays.includes(dayOfWeek) || skipSpecificDates.includes(dateStr);

    dates.push({
      dateStr,
      isHoliday,
      label: `${current.getDate()} ${current.toLocaleDateString('en-US', { month: 'short' })}`,
      dayName: current.toLocaleDateString('en-US', { weekday: 'long' })
    });

    current.setDate(current.getDate() + 1);
  }

  const classItems = availableClasses.filter(c => planner.classes.includes(c.id));
  const overallDateRange = `${formatDateStr(planner.startDate)} - ${formatDateStr(planner.endDate)}`;

  // 2. Define Pagination Chunks
  // Max columns per landscape page is 12 (fits nicely inside A4 width)
  // Max classes per landscape page is 10 (fits vertically with the 42mm header space)
  const maxDatesPerPage = 12;
  const maxClassesPerPage = 10;

  const dateChunks = [];
  for (let i = 0; i < dates.length; i += maxDatesPerPage) {
    dateChunks.push(dates.slice(i, i + maxDatesPerPage));
  }

  const classChunks = [];
  for (let i = 0; i < classItems.length; i += maxClassesPerPage) {
    classChunks.push(classItems.slice(i, i + maxClassesPerPage));
  }

  const totalColChunks = dateChunks.length;
  const totalRowChunks = classChunks.length;

  let isFirstPage = true;

  // Double loop chunking for rows and columns
  for (let colIdx = 0; colIdx < totalColChunks; colIdx++) {
    const datesSubset = dateChunks[colIdx];

    for (let rowIdx = 0; rowIdx < totalRowChunks; rowIdx++) {
      const classesSubset = classChunks[rowIdx];

      if (!isFirstPage) {
        doc.addPage({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });
      }
      isFirstPage = false;

      // Construct columns headers
      const tableHeaders = [
        ['Class', ...datesSubset.map(d => `${d.label}\n(${d.dayName})`)]
      ];

      // Construct rows data
      const tableRows = classesSubset.map(cls => {
        const row = [cls.name];
        datesSubset.forEach(dt => {
          if (dt.isHoliday) {
            row.push('Holiday');
          } else {
            const cellKey = `${dt.dateStr}_${cls.id}`;
            const cellVal = planner.gridData?.[cellKey];
            if (cellVal && cellVal.subject) {
              let cellText = cellVal.subject;
              if (cellVal.notes) {
                cellText += `\n(${cellVal.notes})`;
              }
              row.push(cellText);
            } else {
              row.push('');
            }
          }
        });
        return row;
      });

      // Calculate column widths: Class column = 30mm. Remaining columns share (267 - 30) = 237mm
      const dateColWidth = Math.min(22, Math.floor(237 / datesSubset.length));

      const colStyles = {
        0: { fontStyle: 'bold', fillColor: [250, 250, 250], halign: 'left', cellWidth: 30 }
      };
      for (let c = 1; c <= datesSubset.length; c++) {
        colStyles[c] = { cellWidth: dateColWidth };
      }

      // Draw autoTable starting at startY: 42 (leaves 42mm space for top header cards)
      autoTable(doc, {
        startY: 42,
        margin: { top: 42, bottom: 15, left: 15, right: 15 },
        head: tableHeaders,
        body: tableRows,
        theme: 'grid',
        tableLineColor: [0, 0, 0],   // Black table outer border
        tableLineWidth: 0.5,         // Visible outer border
        headStyles: {
          fillColor: [31, 41, 55],   // Dark Header background (#1F2937)
          textColor: [255, 255, 255], // White header text
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          lineWidth: 0.25,           // Black inner grid lines
          lineColor: [0, 0, 0]
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [51, 65, 85],
          valign: 'middle',
          lineWidth: 0.25,           // Black inner grid lines
          lineColor: [0, 0, 0],
          minCellHeight: 13,
          fillColor: [255, 255, 255] // White cells
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]  // Alternate row shading (slate-50)
        },
        columnStyles: colStyles,
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index > 0) {
            data.cell.styles.halign = 'center';
            const val = data.cell.raw;

            if (val === 'Holiday') {
              // Holiday: Light Gray background, italic, centered text
              data.cell.styles.fillColor = [241, 245, 249];
              data.cell.styles.textColor = [100, 116, 139];
              data.cell.styles.fontStyle = 'italic';
            } else if (val) {
              // Clear default text to draw premium bordered chips in didDrawCell
              data.cell.text = '';
            }
          }
        },
        // Premium Bordered Chips Drawer
        didDrawCell: function(data) {
          // Draw bottom 2px border on header row
          if (data.section === 'head') {
            const currentDoc = data.doc;
            currentDoc.setDrawColor(0, 0, 0); // Solid black bottom divider line
            currentDoc.setLineWidth(0.65);    // Thick bottom border
            currentDoc.line(
              data.cell.x, 
              data.cell.y + data.cell.height, 
              data.cell.x + data.cell.width, 
              data.cell.y + data.cell.height
            );
            return;
          }

          if (data.section === 'body' && data.column.index > 0) {
            const val = data.cell.raw;
            if (val && val !== 'Holiday') {
              const currentDoc = data.doc;
              const cell = data.cell;
              const lines = val.split('\n');
              const subject = lines[0];

              const color = subjectColorsRGB[subject] || { bg: [248, 250, 252], border: [148, 163, 184], text: [51, 65, 85] };

              const marginX = 2;
              const marginY = 2;
              const x = cell.x + marginX;
              const y = cell.y + marginY;
              const w = cell.width - (marginX * 2);
              const h = cell.height - (marginY * 2);

              // 1. Draw rounded badge container
              currentDoc.setFillColor(color.bg[0], color.bg[1], color.bg[2]);
              currentDoc.roundedRect(x, y, w, h, 1.2, 1.2, 'F');

              // 2. Draw border outline
              currentDoc.setDrawColor(color.border[0], color.border[1], color.border[2]);
              currentDoc.setLineWidth(0.22);
              currentDoc.roundedRect(x, y, w, h, 1.2, 1.2, 'D');

              // 3. Draw text centered
              currentDoc.setFont('Helvetica', 'bold');
              currentDoc.setFontSize(6.5);
              currentDoc.setTextColor(color.text[0], color.text[1], color.text[2]);

              if (lines.length > 1) {
                currentDoc.text(subject.toUpperCase(), x + (w / 2), y + 4.5, { align: 'center' });
                currentDoc.setFont('Helvetica', 'normal');
                currentDoc.setFontSize(5.5);
                currentDoc.setTextColor(71, 85, 105);
                currentDoc.text(lines[1], x + (w / 2), y + 8.5, { align: 'center' });
              } else {
                currentDoc.text(subject.toUpperCase(), x + (w / 2), y + (h / 2) + 1.2, { align: 'center' });
              }
            }
          }
        },
        didDrawPage: function(data) {
          // Draw header on this page
          drawHeader(doc, planner, classItems.length, overallDateRange);
        },
        styles: {
          font: 'Helvetica',
          overflow: 'linebreak'
        }
      });

      // Draw Legend directly underneath table if space exists
      const finalY = doc.lastAutoTable.finalY;
      if (finalY + 12 < pageHeight - 12) {
        drawLegend(doc, finalY + 6);
      }
    }
  }

  // 3. Post-Process Page Footers (Retrospectively calculate Page X of Y)
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    
    // Left: confidentiality
    doc.text('Confidential School Document', 15, pageHeight - 9);
    
    // Center: watermark
    doc.text('Generated by TestMaster Pro', pageWidth / 2, pageHeight - 9, { align: 'center' });
    
    // Right: Page X of Y
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 15, pageHeight - 9, { align: 'right' });
  }

  // Trigger browser download
  doc.save(`planner_${planner.name.toLowerCase().replace(/\s+/g, '_')}.pdf`);
}
