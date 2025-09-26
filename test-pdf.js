import { generateContractPDF } from './server/pdf-generator.js';

const testData = {
  contractNumber: 'TEST001',
  projectName: 'Test Project',
  signingDate: new Date(),
  designer: 'Test Designer',
  salesRep: 'Test Sales Rep',
  estimatedShipDate: new Date(),
  buyerCompanyName: 'Test Buyer Company',
  items: [{
    region: 'Test Region',
    category: 'Test Category',
    productName: 'Test Product',
    productDetail: 'Test Detail',
    specification: 'Test Spec',
    color: 'Test Color',
    quantity: 1,
    unit: 'pcs',
    retailPrice: 100,
    retailTotal: 100,
    dealPrice: 90,
    dealTotal: 90,
    remarks: 'Test remarks'
  }],
  totalAmount: 90
};

try {
  const pdfBuffer = await generateContractPDF(testData);
  console.log('PDF generated successfully, size:', pdfBuffer.length);
} catch (error) {
  console.error('PDF generation failed:', error);
}