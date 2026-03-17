import PptxGenJS from 'pptxgenjs'
import type { Report } from '@/pocketflow/types'

export class PptxExporter {
  async export(report: Report): Promise<Buffer> {
    const pptx = new PptxGenJS()

    // Set presentation properties
    pptx.title = report.title
    pptx.author = 'git-copilot'
    pptx.subject = 'Code Review Report'

    // Create title slide
    const titleSlide = pptx.addSlide()
    titleSlide.addText(report.title, {
      x: 1,
      y: 2,
      w: '90%',
      h: 1.5,
      fontSize: 32,
      bold: true,
      align: 'center',
    })
    titleSlide.addText(`Generated: ${report.generatedAt.toLocaleString()}`, {
      x: 1,
      y: 3,
      w: '90%',
      h: 1,
      fontSize: 18,
      color: '666666',
      align: 'center',
    })

    // Create a slide for each section
    for (const section of report.sections) {
      const slide = pptx.addSlide()
      slide.addText(section.title, {
        x: 0.5,
        y: 0.5,
        w: '90%',
        h: 1,
        fontSize: 24,
        bold: true,
        color: '2980b9',
      })

      // Add content as bullet points or text
      const lines = section.content.split('\n').filter((line) => line.trim() !== '')
      const textItems = lines.map((line) => {
        // Simple markdown cleanup: remove **bold** markers
        let cleaned = line.replace(/\*\*(.*?)\*\*/g, '$1')
        // Remove heading markers
        cleaned = cleaned.replace(/^###\s+/, '')
        cleaned = cleaned.replace(/^#\s+/, '')
        // Trim list markers
        cleaned = cleaned.replace(/^[-*]\s+/, '')
        return {
          text: cleaned,
          options: { fontSize: 16, bullet: line.startsWith('- ') || line.startsWith('* ') } as any,
        }
      })

      slide.addText(textItems, {
        x: 0.5,
        y: 1.5,
        w: '90%',
        h: 6,
        fontSize: 16,
        lineSpacing: 10,
        valign: 'top',
      })
    }

    // Generate PPTX as a buffer
    const buffer = await pptx.write({ outputType: 'nodebuffer' })
    return Buffer.from(buffer)
  }
}
