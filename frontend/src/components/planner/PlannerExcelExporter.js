import * as XLSX from 'xlsx';

// Reusable Excel Exporter utility using xlsx library
export function exportPlannerToExcel(planner, availableClasses) {
  if (!planner) return;

  // 1. Generate dates list
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

  // 2. Define headers and rows
  const headers = ['Class Name', ...dates.map(d => `${d.label} (${d.dayName})`)];
  
  const classItems = availableClasses.filter(c => planner.classes.includes(c.id));
  const rows = classItems.map(cls => {
    const row = { 'Class Name': cls.name };
    dates.forEach(dt => {
      const headerKey = `${dt.label} (${dt.dayName})`;
      if (dt.isHoliday) {
        row[headerKey] = 'Holiday';
      } else {
        const cellKey = `${dt.dateStr}_${cls.id}`;
        const cellVal = planner.gridData?.[cellKey];
        if (cellVal && cellVal.subject) {
          row[headerKey] = cellVal.notes ? `${cellVal.subject} (${cellVal.notes})` : cellVal.subject;
        } else {
          row[headerKey] = '';
        }
      }
    });
    return row;
  });

  // 3. Create Excel Worksheet & Workbook
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Planner Grid');

  // Adjust column widths automatically
  const wscols = [
    { wch: 18 }, // first column
    ...dates.map(() => ({ wch: 14 }))
  ];
  worksheet['!cols'] = wscols;

  // 4. Trigger download
  const filename = `planner_${planner.name.toLowerCase().replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
