import { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, PageBreak, VerticalAlign, BorderStyle, ShadingType, Packer } from 'docx';
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
  estimatedShipDate: Date;
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
  const decimalPart = Math.round((num - Math.floor(num)) * 10);
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

export function generateContractDOCX(contractData: ContractData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create a new document
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Title
            new Paragraph({
              text: 'agio咖咖时光阳台花园项目销售合同',
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            
            // Contract number and project name
            new Paragraph({
              text: contractData.contractNumber,
              alignment: AlignmentType.CENTER,
            }),
            
            new Paragraph({
              text: contractData.projectName,
              alignment: AlignmentType.CENTER,
            }),
            
            // Basic contract info table
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph('合同编号 Contract No.:')],
                      width: { size: 2000, type: WidthType.DXA },
                    }),
                    new TableCell({
                      children: [new Paragraph(contractData.contractNumber)],
                      width: { size: 2000, type: WidthType.DXA },
                    }),
                    new TableCell({
                      children: [new Paragraph('项目名称 Project Name:')],
                      width: { size: 2000, type: WidthType.DXA },
                    }),
                    new TableCell({
                      children: [new Paragraph(contractData.projectName)],
                      width: { size: 2000, type: WidthType.DXA },
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph('签订日期 Signing Date:')],
                      width: { size: 200, type: WidthType.DXA },
                    }),
                    new TableCell({
                      children: [new Paragraph(formatDate(contractData.signingDate))],
                      width: { size: 2000, type: WidthType.DXA },
                    }),
                    new TableCell({
                      children: [new Paragraph('预计发货日期 Estimated Ship Date:')],
                      width: { size: 2000, type: WidthType.DXA },
                    }),
                    new TableCell({
                      children: [new Paragraph(formatDate(contractData.estimatedShipDate))],
                      width: { size: 200, type: WidthType.DXA },
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph('设计师 Designer:')],
                      width: { size: 2000, type: WidthType.DXA },
                    }),
                    new TableCell({
                      children: [new Paragraph(contractData.designer)],
                      width: { size: 2000, type: WidthType.DXA },
                    }),
                    new TableCell({
                      children: [new Paragraph('业务代表 Sales Rep:')],
                      width: { size: 2000, type: WidthType.DXA },
                    }),
                    new TableCell({
                      children: [new Paragraph(contractData.salesRep)],
                      width: { size: 2000, type: WidthType.DXA },
                    }),
                  ],
                }),
              ],
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.SINGLE, size: 1 },
                right: { style: BorderStyle.SINGLE, size: 1 },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                insideVertical: { style: BorderStyle.SINGLE, size: 1 },
              },
            }),
            
            // Empty paragraph for spacing
            new Paragraph(''),
            
            // Items table header
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: '区域', alignment: AlignmentType.CENTER })],
                      width: { size: 1000, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: '分项', alignment: AlignmentType.CENTER })],
                      width: { size: 1000, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: '产品名称或编号', alignment: AlignmentType.CENTER })],
                      width: { size: 1500, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: '产品细分', alignment: AlignmentType.CENTER })],
                      width: { size: 1000, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: '产品规格', alignment: AlignmentType.CENTER })],
                      width: { size: 1500, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: '颜色', alignment: AlignmentType.CENTER })],
                      width: { size: 1000, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: '数量', alignment: AlignmentType.CENTER })],
                      width: { size: 800, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: '单位', alignment: AlignmentType.CENTER })],
                      width: { size: 600, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: '零售单价', alignment: AlignmentType.CENTER })],
                      width: { size: 100, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: '零售总价', alignment: AlignmentType.CENTER })],
                      width: { size: 1000, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: '成交单价', alignment: AlignmentType.CENTER })],
                      width: { size: 1000, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: '成交金额（RMB)', alignment: AlignmentType.CENTER })],
                      width: { size: 1000, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: '备注', alignment: AlignmentType.CENTER })],
                      width: { size: 100, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                  ],
                }),
                // Items rows
                ...contractData.items.map(item => new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph(item.region || '')],
                      width: { size: 1000, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph(item.category || '')],
                      width: { size: 1000, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph(item.productName || '')],
                      width: { size: 1500, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph(item.productDetail || '')],
                      width: { size: 1000, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph(item.specification || '')],
                      width: { size: 1500, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph(item.color || '')],
                      width: { size: 1000, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph(item.quantity?.toString() || '')],
                      width: { size: 800, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph(item.unit || '')],
                      width: { size: 600, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph(item.retailPrice ? formatCurrency(item.retailPrice) : '')],
                      width: { size: 1000, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph(item.retailTotal ? formatCurrency(item.retailTotal) : '')],
                      width: { size: 1000, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph(item.dealPrice ? formatCurrency(item.dealPrice) : '')],
                      width: { size: 1000, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph(item.dealTotal ? formatCurrency(item.dealTotal) : '')],
                      width: { size: 1000, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph(item.remarks || '')],
                      width: { size: 100, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                  ],
                })),
                // Total row
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph('合计 Total:')],
                      width: { size: 5000, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph(formatCurrency(contractData.totalAmount))],
                      width: { size: 3000, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                    new TableCell({
                      children: [new Paragraph('')],
                      width: { size: 100, type: WidthType.DXA },
                      verticalAlign: VerticalAlign.CENTER,
                    }),
                  ],
                }),
              ],
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.SINGLE, size: 1 },
                right: { style: BorderStyle.SINGLE, size: 1 },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                insideVertical: { style: BorderStyle.SINGLE, size: 1 },
              },
            }),
            
            // Chinese total amount
            new Paragraph({
              text: `(大写）人民币 ${numberToChinese(contractData.totalAmount)}`,
              spacing: { before: 20 },
            }),
            
            // Remark section
            new Paragraph({
              text: '批注Remark:',
              spacing: { before: 300 },
            }),
            new Paragraph('1、本合同订购单内价格含税，不含安装。'),
            new Paragraph('2、货款支付：客户确图后签订正式销售合同，本合同签订之日起2日内，客户需要按照货款总金额100%支付到公司收款账号。'),
            new Paragraph('3、运输方式和费用：物流或者专车配送；费用由 甲 承担。'),
            new Paragraph('4、质量保证：产品在符合Agio的标准安装且正常使用情况下，产品保质期为：（  ）年，自甲方签收之日起算。'),
            new Paragraph('5、材料规格说明：'),
            new Paragraph('   a. 材料本身可能因生产批次不同而有色调的些许差异，此为正常现象，买方不得以此要求退货。'),
            new Paragraph('   b. 板材出厂时已完成表面砂磨和上漆处理。'),
            new Paragraph('   c. 因材料特性在温度变化下而产生尺寸膨胀收缩的变化，此属自然现象，买方不得以此要求退货。'),
            new Paragraph('6、提出异议的时间和方法：'),
            new Paragraph('   * 买方在验收中，如发现货物及质量不合规定或约定，应在妥善保管货物的同时，自收到货物后3日内向卖方口头提出（需聊天记录+图片佐证）或书面异议，并提供图片/视频证据。'),
            new Paragraph('   * 买方逾期未提出异议，则视为货物合乎规定。'),
            new Paragraph('   * 买方因使用、保管、保养不善等造成产品质量问题者，不得提出异议。'),
            new Paragraph('   * 乙方在收到甲方提出的异议之后，应在3个工作日内安排工作人员协商处理。'),
            new Paragraph('7、争议的解决：本合同适用于中华人民共和国法律。甲乙双方均同意，在本合同履行过程中产生的任何争议，双方本着友好协商的原则进行解决；如协商仍无法解决，任何一方均有权将争议提交卖方所在地人民法院仲裁解决。'),
            new Paragraph('8、扫描件与原件具有同等法律效力。'),
            
            // Signature blocks
            new Paragraph({
              text: '甲方（买方):                     乙方（供货方）:佛山市顺德区锡山家居科技有限公司',
              spacing: { before: 300 },
            }),
            new Paragraph('签章：                             签章：'),
            new Paragraph('日期：                             日期：'),
            
            // Buyer info
            new Paragraph('[甲方开票信息]'),
            new Paragraph(`公司名称：${contractData.buyerCompanyName}`),
            ...(contractData.buyerTaxNumber ? [new Paragraph(`税号：${contractData.buyerTaxNumber}`)] : []),
            ...(contractData.buyerPhone ? [new Paragraph(`电话：${contractData.buyerPhone}`)] : []),
            
            // Seller info
            new Paragraph('[乙方银行账户信息]'),
            new Paragraph('公司名称Company：佛山市顺德区锡山家居科技有限公司'),
            new Paragraph('统一信用代码：914406060621766268'),
            new Paragraph('开户银行Bank：中国工商银行股份有限公司北滘支行'),
            new Paragraph('帐号Account：2013013919201297869'),
            new Paragraph('地址：广东省佛山市顺德区北滘镇工业大道35号'),
            new Paragraph('电话：0757-26322737'),
          ],
        }],
      });

      // Generate the buffer
      Packer.toBuffer(doc).then((buffer) => {
        resolve(buffer);
      }).catch((error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}