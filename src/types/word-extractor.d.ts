declare module "word-extractor" {
  interface WordDocument {
    getBody(): string;
    getFootnotes(): string;
    getHeaders(): string;
    getAnnotations(): string;
  }

  class WordExtractor {
    extract(filePath: string): Promise<WordDocument>;
  }

  export = WordExtractor;
}
