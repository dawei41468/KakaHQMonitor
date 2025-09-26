import libre from 'libreoffice-convert';
import util from 'util';
import fs from 'fs';

const convertAsync = util.promisify(libre.convert);

export async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  return await convertAsync(docxBuffer, '.pdf', undefined);
}