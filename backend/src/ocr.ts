import { createWorker, Worker } from 'tesseract.js';
import { mkdir } from 'node:fs/promises';
import { config } from './config.js';
export interface OcrProvider { recognize(file: string): Promise<{text:string;confidence:number;provider:string}>; close():Promise<void> }
export class TesseractOcr implements OcrProvider {
  private worker?: Worker;
  async recognize(file:string) {
    if(!this.worker) { await mkdir(config.ocrCacheDir,{recursive:true}); this.worker=await createWorker('eng',1,{cachePath:config.ocrCacheDir}); }
    const {data}=await this.worker.recognize(file); return {text:data.text,confidence:data.confidence,provider:'tesseract.js-6/eng'};
  }
  async close() { await this.worker?.terminate(); this.worker=undefined; }
}
