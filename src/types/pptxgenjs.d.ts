declare module 'pptxgenjs' {
  export default class PptxGenJS {
    title?: string
    author?: string
    subject?: string

    addSlide(): Slide
    writeToBuffer(): Promise<Buffer>
  }

  export interface Slide {
    addText(text: string | Array<{ text: string; options: any }>, options?: any): void
    addImage(image: Buffer, options?: any): void
  }
}
