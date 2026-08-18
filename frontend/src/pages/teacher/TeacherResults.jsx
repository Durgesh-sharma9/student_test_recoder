import React from 'react';
// 1. Fixed the import here: changed 'FilePdf' to 'FileText'
import { FileText, Download, Printer, ArrowLeft } from 'lucide-react';

const TeacherResults = ({ results = [], onBack }) => {
  
  // Dummy data just in case props aren't passed yet
  const sampleResults = results.length ? results : [
    { id: 1, student: "Alice Smith", subject: "Mathematics", grade: "A", score: 95 },
    { id: 2, student: "Bob Jones", subject: "Mathematics", grade: "B+", score: 88 },
    { id: 3, student: "Charlie Brown", subject: "Mathematics", grade: "A-", score: 91 },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          <ArrowLeft size={18} /> Back
        </button>
        <h2>Class Exam Results</h2>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Student Name</th>
            <th style={styles.th}>Subject</th>
            <th style={styles.th}>Score</th>
            <th style={styles.th}>Grade</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sampleResults.map((row) => (
            <tr key={row.id} style={styles.tr}>
              <td style={styles.td}>{row.student}</td>
              <td style={styles.td}>{row.subject}</td>
              <td style={styles.td}>{row.score}%</td>
              <td style={styles.td}>
                <span style={styles.badge}>{row.grade}</span>
              </td>
              <td style={styles.td}>
                {/* Used FileText here instead of the broken FilePdf */}
                <button title="View PDF Report" style={styles.actionBtn}>
                  <FileText size={16} />
                </button>
                <button title="Download Raw Data" style={styles.actionBtn}>
                  <Download size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Simple inline styles for demonstration
const styles = {
  container: { padding: '20px', fontFamily: 'sans-serif' },
  header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #ddd', backgroundColor: '#f5f5f5' },
  td: { padding: '12px', borderBottom: '1px solid #ddd' },
  tr: { ':hover': { backgroundColor: '#fafafa' } },
  badge: { backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' },
  actionBtn: { marginRight: '8px', padding: '6px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }
};

export default TeacherResults;