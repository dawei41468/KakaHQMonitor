import PDFDocument from 'pdfkit';
import fs from 'fs';

interface ContractItem {
  region: string;
  category: string;
  productName: string;
  productDetail: string;
  specification: string;
  color: string;
  quantity: number;
  unit: string;
  retailPrice: number;
  retailTotal: number;
  dealPrice: number;
  dealTotal: number;
  remarks?: string;
}

interface ContractData {
  contractNumber: string;
  projectName: string;
  signingDate: Date;
  designer: string;
  salesRep: string;
  estimatedDelivery: Date;
  buyerCompanyName: string;
  buyerAddress?: string;
  buyerPhone?: string;
  buyerTaxNumber?: string;
  items: ContractItem[];
  totalAmount: number;
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
 return dateObj.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '.');
}

function numberToChinese(num: number): string {
  if (num === 0) return '零';

  const chineseNumbers = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const units = ['', '拾', '佰', '仟'];
  const sections = ['', '万', '亿'];

  // Split number into sections of 4 digits
  const numStr = Math.floor(num).toString();
  const sectionCount = Math.ceil(numStr.length / 4);
  const paddedNum = numStr.padStart(sectionCount * 4, '0');
  
  let result = '';
  let zeroCount = 0;

  for (let i = 0; i < paddedNum.length; i++) {
    const digit = parseInt(paddedNum[i]);
    const positionInSection = (paddedNum.length - i - 1) % 4;
    const sectionIndex = Math.floor((paddedNum.length - i - 1) / 4);
    
    if (digit === 0) {
      zeroCount++;
    } else {
      if (zeroCount > 0 && result.length > 0) {
        result += '零';
      }
      result += chineseNumbers[digit];
      if (positionInSection > 0) {
        result += units[positionInSection];
      }
      zeroCount = 0;
    }
    
    // Add section markers
    if (positionInSection === 0 && sectionIndex > 0) {
      if (parseInt(paddedNum.substring(i - 3, i + 1)) > 0) {
        result += sections[sectionIndex];
      }
    }
 }

  // Handle decimal part
  const decimalPart = Math.round((num - Math.floor(num)) * 100);
  if (decimalPart > 0) {
    result += '元';
    const jiao = Math.floor(decimalPart / 10);
    const fen = decimalPart % 10;
    
    if (jiao > 0) {
      result += chineseNumbers[jiao] + '角';
    }
    if (fen > 0) {
      result += chineseNumbers[fen] + '分';
    }
  } else {
    result += '元整';
  }

 return result;
}

export function generateContractPDFPreview(contractData: ContractData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create document with proper font registration
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Register Noto Sans SC for Chinese characters
      try {
        doc.registerFont('NotoSansSC', 'server/fonts/NotoSansSC-Regular.otf');
        doc.font('NotoSansSC');
      } catch (err) {
        console.error('Font registration failed:', err);
        // Try to use system fonts that support Chinese
        try {
          doc.font('STSong');
        } catch (fallbackErr) {
          console.error('Fallback font failed:', fallbackErr);
          doc.font('Helvetica');
        }
      }

      // Title - repeated header
      doc.fontSize(16).text('agio咖咖时光阳台花园项目销售合同', { align: 'center' });
      doc.moveDown(0.5);
      
      // Contract number and project name
      doc.fontSize(12).text(contractData.contractNumber, { align: 'center' });
      doc.moveDown(0.5);
      doc.text(contractData.projectName, { align: 'center' });
      doc.moveDown(1);

      // Basic contract info in table format
      doc.fontSize(10);
      const startY = doc.y;
      const rowHeight = 20;
      
      // Draw basic info table
      // Row 1
      doc.text('合同编号 Contract No.:', 50, startY);
      doc.text(contractData.contractNumber, 170, startY);
      doc.text('项目名称 Project Name:', 330, startY);
      doc.text(contractData.projectName, 450, startY);

      // Row 2
      doc.text('签订日期 Signing Date:', 50, startY + rowHeight);
      doc.text(formatDate(contractData.signingDate), 170, startY + rowHeight);
      doc.text('预计发货日期 Estimated Ship Date:', 330, startY + rowHeight);
      doc.text(formatDate(contractData.estimatedDelivery), 450, startY + rowHeight);

      // Row 3
      doc.text('设计师 Designer:', 50, startY + rowHeight * 2);
      doc.text(contractData.designer, 170, startY + rowHeight * 2);
      doc.text('业务代表 Sales Rep:', 330, startY + rowHeight * 2);
      doc.text(contractData.salesRep, 450, startY + rowHeight * 2);

      doc.moveDown(4);

      // Table header for items
      const tableStartY = doc.y;
      const cellHeight = 25;
      const colWidths = [40, 40, 70, 50, 70, 50, 40, 30, 50, 60, 50, 70, 40]; // 13 columns
      const headers = [
        '区域', '分项', '产品名称或编号', '产品细分', '产品规格', '颜色', 
        '数量', '单位', '零售单价', '零售总价', '成交单价', '成交金额（RMB)', '备注'
      ];

      // Draw table headers with borders
      let currentX = 50;
      headers.forEach((header, index) => {
        const width = colWidths[index];
        doc.rect(currentX, tableStartY, width, cellHeight).stroke();
        doc.text(header, currentX + 5, tableStartY + 5, { width: width - 10, align: 'center' });
        currentX += width;
      });

      // Draw table rows for items
      let currentY = tableStartY + cellHeight;
      let totalDealAmount = 0;

      if (contractData.items && contractData.items.length > 0) {
        contractData.items.forEach((item) => {
          totalDealAmount += item.dealTotal || 0;
          
          currentX = 50;
          const itemData = [
            item.region || '',
            item.category || '',
            item.productName || '',
            item.productDetail || '',
            item.specification || '',
            item.color || '',
            item.quantity?.toString() || '',
            item.unit || '',
            item.retailPrice ? formatCurrency(item.retailPrice) : '',
            item.retailTotal ? formatCurrency(item.retailTotal) : '',
            item.dealPrice ? formatCurrency(item.dealPrice) : '',
            item.dealTotal ? formatCurrency(item.dealTotal) : '',
            item.remarks || ''
          ];

          // Draw each cell in the row
          itemData.forEach((data, index) => {
            const width = colWidths[index];
            doc.rect(currentX, currentY, width, cellHeight).stroke();
            doc.text(data, currentX + 2, currentY + 5, { width: width - 4 });
            currentX += width;
          });

          currentY += cellHeight;
        });
      }

      // Add total row
      doc.rect(50, currentY, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5], cellHeight).stroke();
      doc.text('合计 Total:', 50 + 5, currentY + 5);
      currentX = 50 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5];
      doc.rect(currentX, currentY, colWidths[6] + colWidths[7] + colWidths[8] + colWidths[9] + colWidths[10] + colWidths[11], cellHeight).stroke();
      doc.text(formatCurrency(totalDealAmount), currentX + 5, currentY + 5);
      currentY += cellHeight;

      // Chinese total amount
      doc.rect(50, currentY, 500, cellHeight).stroke();
      doc.text(`(大写）人民币 ${numberToChinese(totalDealAmount)}`, 50 + 5, currentY + 5);
      currentY += cellHeight * 2;

      // Remark section
      doc.text('批注Remark:', 50, currentY);
      currentY += 15;
      doc.text('1、本合同订购单内价格含税，不含安装。', 50, currentY);
      currentY += 15;
      doc.text('2、货款支付：客户确图后签订正式销售合同，本合同签订之日起2日内，客户需要按照货款总金额100%支付到公司收款账号。', 50, currentY);
      currentY += 15;
      doc.text('3、运输方式和费用：物流或者专车配送；费用由 甲 承担。', 50, currentY);
      currentY += 15;
      doc.text('4、质量保证：产品在符合Agio的标准安装且正常使用情况下，产品保质期为：（  ）年，自甲方签收之日起算。', 50, currentY);
      currentY += 15;
      doc.text('5、材料规格说明：', 50, currentY);
      currentY += 15;
      doc.text('   a. 材料本身可能因生产批次不同而有色调的些许差异，此为正常现象，买方不得以此要求退货。', 50, currentY);
      currentY += 15;
      doc.text('   b. 板材出厂时已完成表面砂磨和上漆处理。', 50, currentY);
      currentY += 15;
      doc.text('   c. 因材料特性在温度变化下而产生尺寸膨胀收缩的变化，此属自然现象，买方不得以此要求退货。', 50, currentY);
      currentY += 15;
      doc.text('6、提出异议的时间和方法：', 50, currentY);
      currentY += 15;
      doc.text('   * 买方在验收中，如发现货物及质量不合规定或约定，应在妥善保管货物的同时，自收到货物后3日内向卖方口头提出（需聊天记录+图片佐证）或书面异议，并提供图片/视频证据。', 50, currentY);
      currentY += 15;
      doc.text('   * 买方逾期未提出异议，则视为货物合乎规定。', 50, currentY);
      currentY += 15;
      doc.text('   * 买方因使用、保管、保养不善等造成产品质量问题者，不得提出异议。', 50, currentY);
      currentY += 15;
      doc.text('   * 乙方在收到甲方提出的异议之后，应在3个工作日内安排工作人员协商处理。', 50, currentY);
      currentY += 15;
      doc.text('7、争议的解决：本合同适用于中华人民共和国法律。甲乙双方均同意，在本合同履行过程中产生的任何争议，双方本着友好协商的原则进行解决；如协商仍无法解决，任何一方均有权将争议提交卖方所在地人民法院仲裁解决。', 50, currentY);
      currentY += 15;
      doc.text('8、扫描件与原件具有同等法律效力。', 50, currentY);
      currentY += 20;

      // Signature blocks
      const signatureY = currentY;
      doc.text('甲方（买方):', 50, signatureY);
      doc.text('乙方（供货方）:佛山市顺德区锡山家居科技有限公司', 300, signatureY);
      
      doc.text('签章：', 50, signatureY + 20);
      doc.text('签章：', 300, signatureY + 20);
      
      doc.text('日期：', 50, signatureY + 40);
      doc.text('日期：', 300, signatureY + 40);

      // Buyer info
      doc.text('[甲方开票信息]', 50, signatureY + 60);
      doc.text('公司名称：', 50, signatureY + 80);
      doc.text(contractData.buyerCompanyName, 120, signatureY + 80);
      if (contractData.buyerTaxNumber) {
        doc.text('税号：', 50, signatureY + 100);
        doc.text(contractData.buyerTaxNumber, 120, signatureY + 100);
      }
      if (contractData.buyerPhone) {
        doc.text('电话：', 50, signatureY + 120);
        doc.text(contractData.buyerPhone, 120, signatureY + 120);
      }

      // Seller info
      doc.text('[乙方银行账户信息]', 300, signatureY + 60);
      doc.text('公司名称Company：佛山市顺德区锡山家居科技有限公司', 30, signatureY + 80);
      doc.text('统一信用代码：914406060621766268', 300, signatureY + 100);
      doc.text('开户银行Bank：中国工商银行股份有限公司北滘支行', 300, signatureY + 120);
      doc.text('帐号Account：2013013919201297869', 300, signatureY + 140);
      doc.text('地址：广东省佛山市顺德区北滘镇工业大道35号', 300, signatureY + 160);
      doc.text('电话：0757-26322737', 300, signatureY + 180);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}