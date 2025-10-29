import { generateContractDOCX } from './server/docx-generator.js';
import fs from 'fs';

const testData = {
  contractNumber: 'TEST001',
  projectName: 'Test Project',
  signingDate: new Date(),
  designer: 'Test Designer',
  salesRep: 'Test Sales Rep',
  estimatedDelivery: new Date(),
  buyerCompanyName: 'Test Buyer Company',
  items: [{
    region: 'Test Region',
    category: 'Test Category',
    productName: 'Test Product Name Very Long Description Here',
    productDetail: 'Test Detail',
    specification: 'Test Specification Long Text',
    color: 'Test Color',
    quantity: 10,
    unit: 'pcs',
    retailPrice: 100.50,
    retailTotal: 1005.00,
    dealPrice: 90.45,
    dealTotal: 904.50,
    remarks: 'Test remarks with long text to check wrapping'
  }],
  totalAmount: 904.50,
  retailTotalAmount: 1005.00
};

try {
  const docxBuffer = await generateContractDOCX(testData);
  fs.writeFileSync('test-contract.docx', docxBuffer);
  console.log('DOCX generated successfully, size:', docxBuffer.length);
} catch (error) {
  console.error('DOCX generation failed:', error);
}