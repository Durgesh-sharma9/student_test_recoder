import PDFDocument from 'pdfkit';
import { formatDateDDMMYYYY } from './dateFormat.js';

const escapeCsv = (v) => {
  const s = v == null ? '' : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

/** Pad columns so Excel opens with readable widths */
const padCsvTable = (headers, rows) => {
  const colCount = headers.length;
  const allRows = [headers, ...rows];
  const widths = Array(colCount).fill(0);

  allRows.forEach((row) => {
    row.forEach((cell, i) => {
      widths[i] = Math.max(widths[i], String(cell ?? '').length);
    });
  });

  const pad = (cell, i) => {
    const s = String(cell ?? '');
    return s.length >= widths[i] ? s : s + ' '.repeat(widths[i] - s.length);
  };

  return [
    headers.map((h, i) => pad(h, i)).map(escapeCsv).join(','),
    ...rows.map((r) => r.map((c, i) => pad(c, i)).map(escapeCsv).join(',')),
  ];
};

export const toCsv = (headers, rows) => {
  return padCsvTable(headers, rows).join('\r\n');
};

export const sendCsv = (res, filename, headers, rows, metaLines = []) => {
  const metaBlock = metaLines.map((line) => escapeCsv(line)).join('\r\n');
  const table = toCsv(headers, rows);
  const csv = metaBlock ? `${metaBlock}\r\n\r\n${table}` : table;
  const bom = '\uFEFF';

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(bom + csv);
};

export const sendDailyTestCsv = (res, exportData) => {
  const { meta, headers, rows, filename } = exportData;
  const metaLines = [
    `School Name,${meta.schoolName}`,
    `Class,${meta.classLabel}`,
    `Subject,${meta.subject}`,
    `Generated Date,${meta.generatedAt}`,
  ];
  if (exportData.mode === 'single') {
    metaLines.push(`Test Date,${meta.testDate}`);
  } else {
    metaLines.push(`Date Range,${meta.dateFrom} to ${meta.dateTo}`);
  }
  metaLines.push(`Total Students,${meta.totalStudents}`);

  sendCsv(res, `${filename}.csv`, headers, rows, metaLines);
};

export const sendPdfTable = (res, filename, title, headers, rows) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  doc.fontSize(16).text(title, { align: 'center' });
  doc.moveDown();

  drawPdfTable(doc, headers, rows, false);
  doc.end();
};

const drawPdfTable = (doc, headers, rows, landscape) => {
  const pageWidth = doc.page.width - 80;
  const colWidth = pageWidth / headers.length;
  const rowHeight = 18;
  const headerHeight = 22;
  let y = doc.y;

  const drawHeaderRow = () => {
    doc.fontSize(9).font('Helvetica-Bold');
    headers.forEach((h, i) => {
      doc.rect(40 + i * colWidth, y, colWidth, headerHeight).stroke();
      doc.text(String(h), 42 + i * colWidth, y + 5, { width: colWidth - 6, align: 'center' });
    });
    y += headerHeight;
  };

  const ensureSpace = (needed) => {
    const limit = doc.page.height - 56;
    if (y + needed > limit) {
      doc.addPage({ layout: landscape ? 'landscape' : 'portrait', margin: 36, size: 'A4' });
      y = 36;
      drawHeaderRow();
    }
  };

  drawHeaderRow();
  doc.font('Helvetica').fontSize(8);

  rows.forEach((row) => {
    ensureSpace(rowHeight);
    row.forEach((cell, i) => {
      doc.rect(40 + i * colWidth, y, colWidth, rowHeight).stroke();
      doc.text(String(cell ?? ''), 42 + i * colWidth, y + 4, {
        width: colWidth - 6,
        align: i === 0 ? 'left' : 'center',
      });
    });
    y += rowHeight;
  });

  doc.y = y;
};

export const sendDailyTestPdf = (res, exportData) => {
  const { meta, headers, rows, filename, mode, dateColumns } = exportData;
  const landscape = mode === 'range' && (dateColumns?.length || 0) > 2;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);

  const doc = new PDFDocument({
    margin: 36,
    size: 'A4',
    layout: landscape ? 'landscape' : 'portrait',
  });
  doc.pipe(res);

  // Professional Header
  doc.font('Helvetica-Bold').fontSize(16).text(meta.schoolName, { align: 'center' });
  doc.moveDown(0.3);
  
  doc.font('Helvetica').fontSize(11);
  doc.text(`Exam Type: ${meta.examType || 'Daily Test'}`, { align: 'center' });
  doc.text(`Class: ${meta.classLabel}`, { align: 'center' });
  doc.text(`Subject: ${meta.subject}`, { align: 'center' });
  if (mode === 'single') {
    doc.text(`Date: ${meta.testDate}`, { align: 'center' });
  } else {
    doc.text(`Date Range: ${meta.dateFrom} to ${meta.dateTo}`, { align: 'center' });
  }
  doc.moveDown(0.4);

  // Draw separator line
  doc.moveTo(36, doc.y)
     .lineTo(doc.page.width - 36, doc.y)
     .stroke();
  doc.moveDown(0.4);

  // Table title
  doc.font('Helvetica-Bold').fontSize(13).text('RESULT REPORT', { align: 'center' });
  doc.moveDown(0.6);

  drawPdfTable(doc, headers, rows, landscape);

  // Professional Footer
  const footerY = Math.min(doc.y + 32, doc.page.height - 48);
  const contentWidth = doc.page.width - 72;
  
  // Draw separator line
  doc.moveTo(36, footerY - 8)
     .lineTo(doc.page.width - 36, footerY - 8)
     .stroke();
  
  doc.font('Helvetica').fontSize(9);
  doc.text(`Generated On: ${meta.generatedAt}`, 36, footerY, { width: contentWidth / 2, align: 'left' });
  doc.text(`Generated By: ${meta.generatedBy || 'System'}`, 36 + contentWidth / 2, footerY, { width: contentWidth / 2, align: 'right' });
  doc.text(`Total Students: ${meta.totalStudents}`, 36, footerY + 12, { width: contentWidth / 2, align: 'left' });

  doc.end();
};

/** Legacy generic export — format dates as DD-MM-YYYY text */
export const formatExportDate = (value) => formatDateDDMMYYYY(value);
