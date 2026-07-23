import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Reusable PDF Exporter utility using jsPDF + jspdf-autotable
export function exportPlannerToPDF(planner, availableClasses) {
  if (!planner) return;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // 1. Header Styling
  // Draw a beautiful blue top accent line
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 0, pageWidth, 5, 'F');

  // School name & metadata
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('TESTMASTER PRO ACADEMY', 15, 18);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Assessment Planning Board • Academic Administration System', 15, 23);

  // Divider line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(15, 26, pageWidth - 15, 26);

  // 2. Info Cards Block
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(79, 70, 229);
  doc.text(`PLANNER: ${planner.name.toUpperCase()}`, 15, 34);

  // Left column info
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Assessment Type:', 15, 41);
  doc.text('Date Range:', 15, 47);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  const examLabel = planner.assessmentType === 'Main Exam' && planner.selectedMainExam 
    ? `${planner.assessmentType} (${planner.selectedMainExam})`
    : planner.assessmentType;
  doc.text(examLabel, 47, 41);
  
  // Format Date Range
  const formatDateStr = (dateS) => {
    if (!dateS) return '';
    const [y, m, d] = dateS.split('-');
    const obj = new Date(y, m - 1, d);
    return obj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  doc.text(`${formatDateStr(planner.startDate)} to ${formatDateStr(planner.endDate)}`, 47, 47);

  // Right column info
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Created By:', pageWidth - 100, 41);
  doc.text('Exported On:', pageWidth - 100, 47);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(planner.createdBy || 'School Admin', pageWidth - 78, 41);
  doc.text(new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }), pageWidth - 78, 47);

  // 3. Generate Table Headers & Body for Grid Data
  // Generate dates array
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
      label: current.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
      dayName: current.toLocaleDateString('en-US', { weekday: 'short' })
    });

    current.setDate(current.getDate() + 1);
  }

  // Construct Columns: First column is "Class", subsequent are Date Headers
  const tableHeaders = [
    ['Class', ...dates.map(d => `${d.label}\n(${d.dayName})`)]
  ];

  // Construct Body: One row per class
  const classItems = availableClasses.filter(c => planner.classes.includes(c.id));
  const tableRows = classItems.map(cls => {
    const row = [cls.name];
    dates.forEach(dt => {
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

  // Color mapper callback for auto-table cell backgrounds
  const subjectColorsRGB = {
    'Maths': { bg: [239, 246, 255], text: [30, 64, 175] }, // blue
    'Science': { bg: [240, 253, 244], text: [6, 95, 70] }, // green
    'English': { bg: [255, 247, 237], text: [154, 52, 18] }, // orange
    'Hindi': { bg: [254, 242, 242], text: [153, 27, 27] }, // red
    'Computer': { bg: [250, 245, 255], text: [107, 33, 168] }, // purple
    'SST': { bg: [240, 253, 250], text: [17, 94, 89] }, // teal
    'GK': { bg: [253, 242, 248], text: [157, 23, 77] }, // pink
    'No Test': { bg: [248, 250, 252], text: [71, 85, 105] } // slate
  };

  // Draw Grid using autotable
  doc.autoTable({
    startY: 54,
    head: tableHeaders,
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.1,
      lineColor: [226, 232, 240]
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [51, 65, 85],
      valign: 'middle',
      lineWidth: 0.1,
      lineColor: [241, 245, 249]
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], halign: 'left', cellWidth: 26 }
    },
    // Dynamically color cells based on value
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index > 0) {
        data.cell.styles.halign = 'center';
        const val = data.cell.raw;

        if (val === 'Holiday') {
          // Excluded Day (Holiday) - Gray background
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.textColor = [148, 163, 184];
          data.cell.styles.fontStyle = 'italic';
        } else if (val) {
          // Subject check
          const lines = val.split('\n');
          const subject = lines[0];
          const color = subjectColorsRGB[subject];
          
          if (color) {
            data.cell.styles.fillColor = color.bg;
            data.cell.styles.textColor = color.text;
            data.cell.styles.fontStyle = 'bold';
          } else {
            // Unrecognized custom subject - standard fallback color
            data.cell.styles.fillColor = [248, 250, 252];
            data.cell.styles.textColor = [79, 70, 229];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
    // Page numbering and footer
    didDrawPage: function(data) {
      const pageNum = doc.internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.setFont('Helvetica', 'normal');
      
      // Footer text left
      doc.text('School Management System • TestMaster Pro Plan Board', 15, pageHeight - 10);
      
      // Footer text right
      doc.text(`Page ${pageNum}`, pageWidth - 25, pageHeight - 10);
    },
    margin: { left: 15, right: 15, top: 15, bottom: 15 },
    styles: {
      font: 'Helvetica',
      overflow: 'linebreak'
    }
  });

  // Trigger browser download
  doc.save(`planner_${planner.name.toLowerCase().replace(/\s+/g, '_')}.pdf`);
}
