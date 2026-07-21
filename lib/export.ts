import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  header: string;
  dataKey: string;
}

export function exportToPDF(
  title: string,
  columns: ExportColumn[],
  data: any[],
  companyName: string,
  periodStr: string,
  filename: string
) {
  // Create a new jsPDF instance (portrait, mm, A4)
  const doc = new jsPDF('p', 'mm', 'a4');

  // Add Company Name (Header)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, 105, 15, { align: 'center' });

  // Add Report Title
  doc.setFontSize(12);
  doc.text(title, 105, 22, { align: 'center' });

  // Add Period
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(periodStr, 105, 28, { align: 'center' });

  // Add table using autoTable
  autoTable(doc, {
    columns: columns,
    body: data,
    startY: 35,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235], // Primary color (blue-600)
      textColor: 255,
      fontStyle: 'bold',
      halign: 'left',
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      // Default to right align for amount columns
      amount: { halign: 'right' },
      debit: { halign: 'right' },
      credit: { halign: 'right' },
      balance: { halign: 'right' },
      Rp: { halign: 'right' },
    },
    didParseCell: function (data) {
      if (data.row.raw && typeof data.row.raw === 'object') {
        const rawObj = data.row.raw as any;
        if (rawObj.isTotal) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [243, 244, 246]; // gray-100
        }
        if (rawObj.isGrandTotal) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [229, 231, 235]; // gray-200
        }
      }
    }
  });

  // Save the PDF
  doc.save(`${filename}.pdf`);
}
