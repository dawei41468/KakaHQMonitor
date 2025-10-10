import libre from 'libreoffice-convert';

export async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    libre.convert(docxBuffer, '.pdf', undefined, (err: Error | null, result?: Buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(result!);
      }
    });
  });
}