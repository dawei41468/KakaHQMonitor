import { generateContractDOCX } from './docx-generator';
import { convertDocxToPdf } from './pdf-generator';

type ContractData = Parameters<typeof generateContractDOCX>[0];

export async function generateContractPDFPreview(contractData: ContractData): Promise<Buffer> {
  const docxBuffer = await generateContractDOCX(contractData);
  return convertDocxToPdf(docxBuffer);
}