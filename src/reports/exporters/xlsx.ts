import ExcelJS from 'exceljs';
import type { Report } from '@/pocketflow/types';

export class XlsxExporter {
  async export(report: Report): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'git-copilot';
    workbook.created = new Date();
    workbook.modified = report.generatedAt;

    // Summary worksheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['Report Title', report.title]);
    summarySheet.addRow(['Generated', report.generatedAt.toLocaleString()]);
    summarySheet.addRow([]);
    summarySheet.addRow(['Total Sections', report.sections.length]);
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(3).font = { bold: true };

    // Sections data worksheet
    const sectionsSheet = workbook.addWorksheet('Sections');
    sectionsSheet.columns = [
      { header: 'Section Title', key: 'title', width: 40 },
      { header: 'Content', key: 'content', width: 80 },
    ];
    for (const section of report.sections) {
      sectionsSheet.addRow({ title: section.title, content: section.content });
    }

    // Style header
    sectionsSheet.getRow(1).font = { bold: true };
    sectionsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
