import { PDFDocument, StandardFonts } from 'pdf-lib'
import type { Report } from '@/pocketflow/types'

export class PdfExporter {
  async export(report: Report): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage([612, 792]) // Letter size (72 DPI)

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let y = 750 // Start from top
    const leftMargin = 50
    const lineHeight = 20

    // Title
    this.drawText(page, report.title, leftMargin, y, 24, boldFont)
    y -= lineHeight * 2

    // Metadata
    this.drawText(page, `Generated: ${report.generatedAt.toLocaleString()}`, leftMargin, y, 12, font)
    y -= lineHeight

    // Sections
    for (const section of report.sections) {
      if (y < 100) {
        // Add new page
        const newPage = pdfDoc.addPage([612, 792])
        page = newPage
        y = 750
      }

      // Section title
      this.drawText(page, section.title, leftMargin, y, 16, boldFont, { r: 0, g: 0.2, b: 0.6 })
      y -= lineHeight

      // Section content: split by newlines to preserve paragraphs
      const paragraphs = section.content.split('\n')
      for (const paragraph of paragraphs) {
        if (paragraph.trim() === '') {
          y -= lineHeight / 2
          continue
        }
        const wrappedLines = this.wrapText(paragraph, font, 12, 512)
        for (const line of wrappedLines) {
          if (y < 50) {
            const newPage = pdfDoc.addPage([612, 792])
            page = newPage
            y = 750
          }
          this.drawText(page, line, leftMargin + 20, y, 12, font)
          y -= lineHeight
        }
      }

      y -= lineHeight / 2 // spacing between sections
    }

    const pdfBytes = await pdfDoc.save()
    return Buffer.from(pdfBytes)
  }

  private drawText(
    page: any,
    text: string,
    x: number,
    y: number,
    size: number,
    font: any,
    color?: { r: number; g: number; b: number }
  ) {
    const c = color || { r: 0, g: 0, b: 0 }
    page.drawText(text, { x, y, size, font, color: c })
  }

  private wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const width = font.widthOfTextAtSize(testLine, fontSize)
      if (width > maxWidth) {
        if (currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          lines.push(word) // Single word longer than maxWidth
        }
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) {
      lines.push(currentLine)
    }

    return lines
  }
}
