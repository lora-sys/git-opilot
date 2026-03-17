import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } from 'docx';
import type { Report } from '@/pocketflow/types';

export class DocxExporter {
  async export(report: Report): Promise<Buffer> {
    const children = [];

    // Title as heading
    children.push(
      new Paragraph({
        text: report.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      })
    );

    // Metadata
    children.push(
      new Paragraph({
        text: `Generated: ${report.generatedAt.toLocaleString()}`,
        spacing: { after: 400 },
      })
    );

    // Sections
    for (const section of report.sections) {
      // Section title
      children.push(
        new Paragraph({
          text: section.title,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 },
        })
      );

      // Section content - parse markdown simply
      const contentParagraphs = this.parseMarkdown(section.content);
      for (const para of contentParagraphs) {
        children.push(para);
      }
    }

    const doc = new Document({
      sections: [
        {
          children,
          properties: {
            page: {
              margin: {
                top: 720,
                right: 720,
                bottom: 720,
                left: 720,
              },
            },
          },
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    return buffer;
  }

  private parseMarkdown(text: string): Paragraph[] {
    const lines = text.split('\n').filter((line) => line.trim() !== '');
    const paragraphs: Paragraph[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for heading (###)
      if (line.startsWith('### ')) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line.slice(4),
                bold: true,
                size: 24,
              }),
            ],
            indentation: { firstLine: 400 },
            spacing: { before: 200, after: 100 },
          })
        );
        continue;
      }

      // Check for list item (- or *)
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const content = line.slice(2);
        paragraphs.push(
          new Paragraph({
            children: this.parseInlineFormatting(content),
            indentation: { firstLine: 400 },
            spacing: { after: 50 },
          })
        );
        continue;
      }

      // Regular paragraph
      if (line.trim()) {
        paragraphs.push(
          new Paragraph({
            children: this.parseInlineFormatting(line),
            spacing: { after: 100 },
          })
        );
      }
    }

    return paragraphs;
  }

  private parseInlineFormatting(text: string): TextRun[] {
    const runs: TextRun[] = [];
    // Simple parsing for **bold**
    const parts = text.split(/\*\*(.+?)\*\*/g);

    parts.forEach((part, index) => {
      if (index % 2 === 0) {
        // Plain text
        if (part) {
          runs.push(new TextRun({ text: part }));
        }
      } else {
        // Bold text
        runs.push(new TextRun({ text: part, bold: true }));
      }
    });

    // If no formatting, return a single TextRun
    if (runs.length === 0) {
      runs.push(new TextRun({ text }));
    }

    return runs;
  }
}
