import {
  AlignmentType,
  BorderStyle,
  Document,
  IParagraphOptions,
  IRunOptions,
  ITableCellOptions,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import fs from 'fs';
import path from 'path';

const docxDir = path.resolve();

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
  retailTotalAmount: number;
}

const DEFAULT_FONT = 'Noto Sans CJK SC';
const PAGE_MARGIN_TWIPS = 720;
const HEADER_FOOTER_MARGIN_TWIPS = 360;
const DEFAULT_LINE_SPACING = 260;
const DEFAULT_PARAGRAPH_SPACING = { before: 20, after: 20 };
const CELL_MARGIN_VERTICAL = 30;
const CELL_MARGIN_HORIZONTAL = 80;
type RunConfig = Omit<IRunOptions, 'text' | 'children'>;

type ParagraphConfig = Omit<IParagraphOptions, 'children' | 'text' | 'run'> & {
  run?: RunConfig;
};

type TableCellConfig = Omit<ITableCellOptions, 'children'> & {
  paragraph?: ParagraphConfig;
};

const DEFAULT_CELL_MARGINS: NonNullable<ITableCellOptions['margins']> = {
  marginUnitType: WidthType.DXA,
  top: CELL_MARGIN_VERTICAL,
  bottom: CELL_MARGIN_VERTICAL,
  left: CELL_MARGIN_HORIZONTAL,
  right: CELL_MARGIN_HORIZONTAL,
};

const NO_TABLE_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

const OUTLINE_TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  insideVertical: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj
    .toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .replace(/\//g, '.');
}

function numberToChinese(num: number): string {
  if (!Number.isFinite(num)) return '';

  const chineseNumbers = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const units = ['', '拾', '佰', '仟'];
  const sections = ['', '万', '亿'];

  const integer = Math.floor(Math.abs(num));
  if (integer === 0) {
    return '零元整';
  }

  const integerStr = integer.toString();
  const sectionCount = Math.ceil(integerStr.length / 4);
  const padded = integerStr.padStart(sectionCount * 4, '0');

  let result = '';
  let zeroCount = 0;

  for (let i = 0; i < padded.length; i++) {
    const digit = Number.parseInt(padded[i], 10);
    const sectionIndex = Math.floor((padded.length - 1 - i) / 4);
    const position = (padded.length - 1 - i) % 4;

    if (digit === 0) {
      zeroCount++;
    } else {
      if (zeroCount > 0 && result.length > 0) {
        result += '零';
      }
      zeroCount = 0;
      result += chineseNumbers[digit] + units[position];
    }

    if (position === 0 && zeroCount < 4) {
      const sectionValue = Number.parseInt(padded.slice(i - 3, i + 1), 10);
      if (sectionValue > 0) {
        result += sections[sectionIndex];
      }
      zeroCount = 0;
    }
  }

  result += '元';

  const decimals = Math.round((Math.abs(num) - integer) * 100);
  if (decimals === 0) {
    result += '整';
  } else {
    const jiao = Math.floor(decimals / 10);
    const fen = decimals % 10;

    if (jiao > 0) {
      result += `${chineseNumbers[jiao]}角`;
    }
    if (fen > 0) {
      result += `${chineseNumbers[fen]}分`;
    }
  }

  if (num < 0) {
    result = `负${result}`;
  }

  return result;
}

function createParagraph(text: string, options: ParagraphConfig = {}): Paragraph {
  const { run, spacing, ...rest } = options;
  return new Paragraph({
    spacing: spacing ?? DEFAULT_PARAGRAPH_SPACING,
    ...rest,
    children: [
      new TextRun({
        text,
        font: { ascii: DEFAULT_FONT, eastAsia: DEFAULT_FONT, hAnsi: DEFAULT_FONT },
        ...(run ?? {}),
      }),
    ],
  });
}

function createTableCell(text: string, options: TableCellConfig = {}): TableCell {
  const { paragraph, margins, ...cellOptions } = options;
  const paragraphOptions: ParagraphConfig = {
    alignment: AlignmentType.LEFT,
    ...(paragraph ?? {}),
    spacing: paragraph?.spacing ?? { before: 40, after: 40 },
  };

  return new TableCell({
    margins: margins ?? DEFAULT_CELL_MARGINS,
    ...cellOptions,
    children: [createParagraph(text, paragraphOptions)],
  });
}

function createHeaderTable(contractData: ContractData): Table {
  const cellMargins = {
    marginUnitType: WidthType.DXA,
    top: 40,
    bottom: 40,
    left: 80,
    right: 80,
  };

  // Read logo image
  const logoPath = path.join(docxDir, 'server', 'images', 'agio_kaka_logo.png');
  const logoBuffer = fs.readFileSync(logoPath);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [2000, 4000, 3000],
    borders: NO_TABLE_BORDERS,
    rows: [
      new TableRow({
         children: [
           new TableCell({
             margins: cellMargins,
             borders: NO_TABLE_BORDERS,
             children: [
               new Paragraph({
                 children: [
                   new ImageRun({
                     type: 'png',
                     data: logoBuffer,
                     transformation: {
                       width: 100,
                       height: 65,
                     },
                   }),
                 ],
                 alignment: AlignmentType.LEFT,
                 spacing: { before: 40, after: 40 },
               }),
             ],
           }),
           new TableCell({
             margins: cellMargins,
             borders: NO_TABLE_BORDERS,
             children: [
               createParagraph('', { spacing: { after: 20 } }),
               createParagraph('', { spacing: { after: 20 } }),
               createParagraph('agio咖咖时光阳台花园项目经销合同', {
                 run: { bold: true, size: 26 },
                 alignment: AlignmentType.RIGHT,
               }),
             ],
           }),
           new TableCell({
             margins: cellMargins,
             borders: NO_TABLE_BORDERS,
             children: [
               createParagraph(`合同编号：${contractData.contractNumber}`, {
                 alignment: AlignmentType.RIGHT,
                 run: { size: 18 },
                 spacing: { after: 20 },
               }),
               createParagraph(`签订日期：${formatDate(contractData.signingDate)}`, {
                 alignment: AlignmentType.RIGHT,
                 run: { size: 18 },
                 spacing: { after: 20 },
               }),
               createParagraph(`预计发货日期：${formatDate(contractData.estimatedDelivery)}`, {
                 alignment: AlignmentType.RIGHT,
                 run: { size: 18 },
                 spacing: { after: 20 },
               }),
             ],
           }),
         ],
       }),
    ],
  });
}

function createLabelValueCell(label: string, value: string): TableCell {
  const font = { ascii: DEFAULT_FONT, eastAsia: DEFAULT_FONT, hAnsi: DEFAULT_FONT };
  return new TableCell({
    margins: DEFAULT_CELL_MARGINS,
    borders: NO_TABLE_BORDERS,
    children: [
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text: label,
            font,
            bold: true,
            size: 15,
          }),
          new TextRun({
            text: value,
            font,
            size: 15,
          }),
        ],
      }),
    ],
  });
}

function createSummaryParagraphs(contractData: ContractData): (Paragraph | Table)[] {
  const summaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [3500, 3200, 3400],
    borders: NO_TABLE_BORDERS,
    rows: [
      new TableRow({
        children: [
          createLabelValueCell('项目名称：', contractData.projectName || '-'),
          createLabelValueCell('甲方：', contractData.buyerCompanyName || '-'),
          createLabelValueCell('乙方：', '佛山市顺德区西山家居科技有限公司'),
        ],
      }),
      new TableRow({
        children: [
          createLabelValueCell('设计师：', contractData.designer || '-'),
          createLabelValueCell('业务代表：', contractData.salesRep || '-'),
          createLabelValueCell('统一社会信用代码：', '914406060621766268'),
        ],
      }),
    ],
  });

  return [summaryTable as Table];
}

function createItemsTable(contractData: ContractData): Table {
  const headerCells = [
    { text: '区域', width: 510 },
    { text: '分项', width: 510 },
    { text: '产品名称或编号', width: 2000 },
    { text: '产品细分', width: 510 },
    { text: '产品规格', width: 1098 },
    { text: '颜色', width: 693 },
    { text: '数量', width: 510 },
    { text: '单位', width: 510 },
    { text: '零售单价', width: 838 },
    { text: '零售总价', width: 838 },
    { text: '成交单价', width: 838 },
    { text: '成交金额 (RMB)', width: 984 },
    { text: '备注', width: 620 },
  ];

  const headerRow = new TableRow({
    children: headerCells.map((cell) =>
      createTableCell(cell.text, {
        width: { size: cell.width, type: WidthType.DXA },
        paragraph: {
          alignment: AlignmentType.CENTER,
          run: { bold: true, size: 15 },
        },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'f2f2f2' },
        verticalAlign: VerticalAlign.CENTER,
      }),
    ),
  });

  const itemRows = contractData.items.map((item) => {
    return new TableRow({
      children: [
        createTableCell(item.region ?? '', { width: { size: headerCells[0].width, type: WidthType.DXA } }),
        createTableCell(item.category ?? '', { width: { size: headerCells[1].width, type: WidthType.DXA } }),
        createTableCell(item.productName ?? '', { width: { size: headerCells[2].width, type: WidthType.DXA } }),
        createTableCell(item.productDetail ?? '', { width: { size: headerCells[3].width, type: WidthType.DXA } }),
        createTableCell(item.specification ?? '', { width: { size: headerCells[4].width, type: WidthType.DXA } }),
        createTableCell(item.color ?? '', { width: { size: headerCells[5].width, type: WidthType.DXA } }),
        createTableCell(item.quantity != null ? String(item.quantity) : '', {
          width: { size: headerCells[6].width, type: WidthType.DXA },
          paragraph: { alignment: AlignmentType.RIGHT },
        }),
        createTableCell(item.unit ?? '', {
          width: { size: headerCells[7].width, type: WidthType.DXA },
          paragraph: { alignment: AlignmentType.CENTER },
        }),
        createTableCell(item.retailPrice != null ? formatCurrency(item.retailPrice) : '', {
          width: { size: headerCells[8].width, type: WidthType.DXA },
          paragraph: { alignment: AlignmentType.RIGHT },
        }),
        createTableCell(item.retailTotal != null ? formatCurrency(item.retailTotal) : '', {
          width: { size: headerCells[9].width, type: WidthType.DXA },
          paragraph: { alignment: AlignmentType.RIGHT },
        }),
        createTableCell(item.dealPrice != null ? formatCurrency(item.dealPrice) : '', {
          width: { size: headerCells[10].width, type: WidthType.DXA },
          paragraph: { alignment: AlignmentType.RIGHT },
        }),
        createTableCell(item.dealTotal != null ? formatCurrency(item.dealTotal) : '', {
          width: { size: headerCells[11].width, type: WidthType.DXA },
          paragraph: { alignment: AlignmentType.RIGHT },
        }),
        createTableCell(item.remarks ?? '', { width: { size: headerCells[12].width, type: WidthType.DXA } }),
      ],
    });
  });

  const totalRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 11,
        margins: DEFAULT_CELL_MARGINS,
        children: [
          createParagraph('合计 Total', {
            alignment: AlignmentType.RIGHT,
            run: { bold: true, size: 15 },
          }),
        ],
      }),
      new TableCell({
        margins: DEFAULT_CELL_MARGINS,
        children: [
          createParagraph(formatCurrency(contractData.totalAmount), {
            alignment: AlignmentType.RIGHT,
            run: { bold: true, size: 15 },
          }),
        ],
      }),
      new TableCell({
        margins: DEFAULT_CELL_MARGINS,
        children: [],
      }),
    ],
  });

  return new Table({
    width: { size: 10459, type: WidthType.DXA },
    rows: [headerRow, ...itemRows, totalRow],
    borders: OUTLINE_TABLE_BORDERS,
    layout: TableLayoutType.FIXED,
  });
}

function createRemarkParagraphs(): Paragraph[] {
  const remarks = [
    '1、本合同订购单内价格含税，不含安装。',
    '2、货款支付：客户确图后签订正式销售合同，本合同签订之日起2日内，客户需要按照货款总金额100%支付到公司收款账号。',
    '3、运输方式和费用：物流或者专车配送；费用由甲方承担。',
    '4、质量保证：产品在符合Agio的标准安装且正常使用情况下，产品保质期为：（   ）年，自甲方签收之日起算。',
    '5、材料规格说明：',
    '   a. 材料本身可能因生产批次不同而有色调的些许差异，此为正常现象，买方不得以此要求退货。',
    '   b. 板材出厂时已完成表面砂磨和上漆处理。',
    '   c. 因材料特性在温度变化下而产生尺寸膨胀收缩的变化，此属自然现象，买方不得以此要求退货。',
    '6、提出异议的时间和方法：',
    '   * 买方在验收中，如发现货物及质量不合规定或约定，应在妥善保管货物的同时，自收到货物后3日内向卖方口头提出（需聊天记录+图片佐证）或书面异议，并提供图片/视频证据。',
    '   * 买方逾期未提出异议，则视为货物合乎规定。',
    '   * 买方因使用、保管、保养不善等造成产品质量问题者，不得提出异议。',
    '   * 乙方在收到甲方提出的异议之后，应在3个工作日内安排工作人员协商处理。',
    '7、争议的解决：本合同适用于中华人民共和国法律。甲乙双方均同意，在本合同履行过程中产生的任何争议，双方本着友好协商的原则进行解决；如协商仍无法解决，任何一方均有权将争议提交卖方所在地人民法院诉讼解决。',
    '8、扫描件与原件具有同等法律效力。',
  ];

  return remarks.map((text) =>
    createParagraph(text, {
      spacing: { before: 10, after: 10 },
    }),
  );
}

function createSignatureTable(contractData: ContractData): Table {
  return new Table({
    width: { size: 10000, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [5000, 5000],
    borders: NO_TABLE_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            margins: DEFAULT_CELL_MARGINS,
            borders: NO_TABLE_BORDERS,
            children: [
              createParagraph('甲方（买方）：', { run: { bold: true }, spacing: { before: 10, after: 5 } }),
            ],
          }),
          new TableCell({
            margins: DEFAULT_CELL_MARGINS,
            borders: NO_TABLE_BORDERS,
            children: [
              createParagraph('乙方（供货方）：佛山市顺德区西山家居科技有限公司', {
                run: { bold: true },
                spacing: { before: 10, after: 5 },
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            margins: DEFAULT_CELL_MARGINS,
            borders: NO_TABLE_BORDERS,
            children: [createParagraph('签章：', { spacing: { before: 5, after: 5 } })],
          }),
          new TableCell({
            margins: DEFAULT_CELL_MARGINS,
            borders: NO_TABLE_BORDERS,
            children: [createParagraph('签章：', { spacing: { before: 5, after: 5 } })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            margins: DEFAULT_CELL_MARGINS,
            borders: NO_TABLE_BORDERS,
            children: [createParagraph('日期：', { spacing: { before: 5, after: 5 } })],
          }),
          new TableCell({
            margins: DEFAULT_CELL_MARGINS,
            borders: NO_TABLE_BORDERS,
            children: [createParagraph('日期：', { spacing: { before: 5, after: 5 } })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            margins: DEFAULT_CELL_MARGINS,
            borders: NO_TABLE_BORDERS,
            children: createBuyerInfoParagraphs(contractData),
          }),
          new TableCell({
            margins: DEFAULT_CELL_MARGINS,
            borders: NO_TABLE_BORDERS,
            children: createSellerInfoParagraphs(),
          }),
        ],
      }),
    ],
  });
}

function createBuyerInfoParagraphs(contractData: ContractData): Paragraph[] {
  const paragraphs: Paragraph[] = [
    createParagraph('[甲方开票信息]', { run: { bold: true } }),
    createParagraph(`公司名称：${contractData.buyerCompanyName}`),
  ];

  if (contractData.buyerTaxNumber) {
    paragraphs.push(createParagraph(`税号：${contractData.buyerTaxNumber}`));
  }

  if (contractData.buyerAddress) {
    paragraphs.push(createParagraph(`地址：${contractData.buyerAddress}`));
  }

  if (contractData.buyerPhone) {
    paragraphs.push(createParagraph(`电话：${contractData.buyerPhone}`));
  }

  return paragraphs;
}

function createSellerInfoParagraphs(): Paragraph[] {
  return [
    createParagraph('[乙方银行账户信息]', { run: { bold: true } }),
    createParagraph('公司名称 Company：佛山市顺德区西山家居科技有限公司'),
    createParagraph('统一社会信用代码：914406060621766268'),
    createParagraph('开户银行 Bank：中国工商银行股份有限公司北滘支行'),
    createParagraph('帐号 Account：2013013919201297869'),
    createParagraph('地址：广东省佛山市顺德区北滘镇工业大道35号'),
    createParagraph('电话：0757-26322737'),
  ];
}

export function generateContractDOCX(contractData: ContractData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new Document({
        styles: {
          default: {
            document: {
              run: {
                font: DEFAULT_FONT,
                size: 15,
              },
              paragraph: {
                spacing: { line: DEFAULT_LINE_SPACING, before: 0, after: 0 },
              },
            },
            heading1: {
              run: {
                font: { ascii: DEFAULT_FONT, eastAsia: DEFAULT_FONT, hAnsi: DEFAULT_FONT },
                size: 32,
                bold: true,
              },
              paragraph: { alignment: AlignmentType.CENTER },
            },
          },
        },
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: PAGE_MARGIN_TWIPS,
                  bottom: PAGE_MARGIN_TWIPS,
                  left: PAGE_MARGIN_TWIPS,
                  right: PAGE_MARGIN_TWIPS,
                  header: HEADER_FOOTER_MARGIN_TWIPS,
                  footer: HEADER_FOOTER_MARGIN_TWIPS,
                },
              },
            },
            children: [
              createHeaderTable(contractData),
              new Paragraph({ text: '', spacing: { after: 20 } }),
              ...createSummaryParagraphs(contractData),
              new Paragraph({ text: '', spacing: { after: 40 } }),
              createParagraph('根据《中华人民共和国民法典》合同编及相关法律规定，甲乙双方本着平等、自愿、诚实、信用的基本原则，就甲方向乙方定制花园阳台家具或材料事宜，双方协商一致的基础上签订本合同，以资共同遵守', {
                spacing: { after: 60 },
              }),
              createItemsTable(contractData),
              createParagraph(`（大写）人民币 ${numberToChinese(contractData.totalAmount)}`, {
                spacing: { before: 60, after: 60 },
                run: { bold: true },
              }),
              createParagraph('批注 Remark：', {
                run: { bold: true },
                spacing: { after: 40 },
              }),
              ...createRemarkParagraphs(),
              new Paragraph({ text: '', spacing: { after: 120 } }),
              createSignatureTable(contractData),
            ],
          },
        ],
      });

      Packer.toBuffer(doc).then(resolve).catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

// HTML generation for preview
function generateHeaderHTML(contractData: ContractData): string {
  const logoPath = path.join(docxDir, 'server', 'images', 'agio_kaka_logo.png');
  const logoBuffer = fs.readFileSync(logoPath);
  const logoBase64 = logoBuffer.toString('base64');

  return `
    <table style="width: 100%; border-collapse: collapse; border: none;">
      <tr>
        <td style="width: 20%; padding: 0.5in 0.1in 0.5in 0.1in; border: none; vertical-align: top;">
          <img src="data:image/png;base64,${logoBase64}" alt="Logo" style="width: 100px; height: 65px;" />
        </td>
        <td style="width: 50%; padding: 0.5in 0.1in; border: none; text-align: right; vertical-align: middle;">
          <p style="margin: 0.2in 0; font-size: 18pt; font-weight: bold; font-family: '${DEFAULT_FONT}', sans-serif;">agio咖咖时光阳台花园项目经销合同</p>
        </td>
        <td style="width: 30%; padding: 0.5in 0.1in; border: none; text-align: right; vertical-align: top;">
          <p style="margin: 0.2in 0; font-size: 12pt; font-family: '${DEFAULT_FONT}', sans-serif;">合同编号：${contractData.contractNumber}</p>
          <p style="margin: 0.2in 0; font-size: 12pt; font-family: '${DEFAULT_FONT}', sans-serif;">签订日期：${formatDate(contractData.signingDate)}</p>
          <p style="margin: 0.2in 0; font-size: 12pt; font-family: '${DEFAULT_FONT}', sans-serif;">预计发货日期：${formatDate(contractData.estimatedDelivery)}</p>
        </td>
      </tr>
    </table>
  `;
}

function generateSummaryHTML(contractData: ContractData): string {
  return `
    <table style="width: 100%; border-collapse: collapse; border: none; margin: 0.4in 0;">
      <tr>
        <td style="width: 33%; padding: 0.1in; border: none; font-family: '${DEFAULT_FONT}', sans-serif; font-size: 12pt;">
          <strong>项目名称：</strong>${contractData.projectName || '-'}
        </td>
        <td style="width: 33%; padding: 0.1in; border: none; font-family: '${DEFAULT_FONT}', sans-serif; font-size: 12pt;">
          <strong>甲方：</strong>${contractData.buyerCompanyName || '-'}
        </td>
        <td style="width: 34%; padding: 0.1in; border: none; font-family: '${DEFAULT_FONT}', sans-serif; font-size: 12pt;">
          <strong>乙方：</strong>佛山市顺德区西山家居科技有限公司
        </td>
      </tr>
      <tr>
        <td style="width: 33%; padding: 0.1in; border: none; font-family: '${DEFAULT_FONT}', sans-serif; font-size: 12pt;">
          <strong>设计师：</strong>${contractData.designer || '-'}
        </td>
        <td style="width: 33%; padding: 0.1in; border: none; font-family: '${DEFAULT_FONT}', sans-serif; font-size: 12pt;">
          <strong>业务代表：</strong>${contractData.salesRep || '-'}
        </td>
        <td style="width: 34%; padding: 0.1in; border: none; font-family: '${DEFAULT_FONT}', sans-serif; font-size: 12pt;">
          <strong>统一社会信用代码：</strong>914406060621766268
        </td>
      </tr>
    </table>
  `;
}

function generateItemsTableHTML(contractData: ContractData): string {
  const headerCells = [
    '区域', '分项', '产品名称或编号', '产品细分', '产品规格', '颜色', '数量', '单位',
    '零售单价', '零售总价', '成交单价', '成交金额 (RMB)', '备注'
  ];
  const widths = [510, 510, 2000, 510, 1098, 693, 510, 510, 838, 838, 838, 984, 620]; // Approximate percentages based on twips

  let html = `
    <table style="width: 100%; border-collapse: collapse; margin: 0.4in 0; font-family: '${DEFAULT_FONT}', sans-serif; font-size: 11pt; table-layout: fixed;">
      <thead>
        <tr style="background-color: #f2f2f2; text-align: center; font-weight: bold;">
  `;

  headerCells.forEach((cell, index) => {
    const widthPercent = (widths[index] / 10459 * 100).toFixed(1) + '%';
    html += `<th style="border: 1px solid #000; padding: 0.1in; width: ${widthPercent};">${cell}</th>`;
  });

  html += '</tr></thead><tbody>';

  contractData.items.forEach((item) => {
    html += `
      <tr>
        <td style="border: 1px solid #000; padding: 0.1in; text-align: left;">${item.region || ''}</td>
        <td style="border: 1px solid #000; padding: 0.1in; text-align: left;">${item.category || ''}</td>
        <td style="border: 1px solid #000; padding: 0.1in; text-align: left;">${item.productName || ''}</td>
        <td style="border: 1px solid #000; padding: 0.1in; text-align: left;">${item.productDetail || ''}</td>
        <td style="border: 1px solid #000; padding: 0.1in; text-align: left;">${item.specification || ''}</td>
        <td style="border: 1px solid #000; padding: 0.1in; text-align: left;">${item.color || ''}</td>
        <td style="border: 1px solid #000; padding: 0.1in; text-align: right;">${item.quantity || ''}</td>
        <td style="border: 1px solid #000; padding: 0.1in; text-align: center;">${item.unit || ''}</td>
        <td style="border: 1px solid #000; padding: 0.1in; text-align: right;">${item.retailPrice ? formatCurrency(item.retailPrice) : ''}</td>
        <td style="border: 1px solid #000; padding: 0.1in; text-align: right;">${item.retailTotal ? formatCurrency(item.retailTotal) : ''}</td>
        <td style="border: 1px solid #000; padding: 0.1in; text-align: right;">${item.dealPrice ? formatCurrency(item.dealPrice) : ''}</td>
        <td style="border: 1px solid #000; padding: 0.1in; text-align: right;">${item.dealTotal ? formatCurrency(item.dealTotal) : ''}</td>
        <td style="border: 1px solid #000; padding: 0.1in; text-align: left;">${item.remarks || ''}</td>
      </tr>
    `;
  });

  // Total row
  html += `
      <tr>
        <td colspan="11" style="border: 1px solid #000; padding: 0.1in; text-align: right; font-weight: bold;">合计 Total</td>
        <td style="border: 1px solid #000; padding: 0.1in; text-align: right; font-weight: bold;">${formatCurrency(contractData.totalAmount)}</td>
        <td style="border: 1px solid #000; padding: 0.1in;"></td>
      </tr>
    </tbody>
    </table>
  `;

  return html;
}

function generateRemarksHTML(): string {
  const remarks = [
    '1、本合同订购单内价格含税，不含安装。',
    '2、货款支付：客户确图后签订正式销售合同，本合同签订之日起2日内，客户需要按照货款总金额100%支付到公司收款账号。',
    '3、运输方式和费用：物流或者专车配送；费用由甲方承担。',
    '4、质量保证：产品在符合Agio的标准安装且正常使用情况下，产品保质期为：（   ）年，自甲方签收之日起算。',
    '5、材料规格说明：',
    '   a. 材料本身可能因生产批次不同而有色调的些许差异，此为正常现象，买方不得以此要求退货。',
    '   b. 板材出厂时已完成表面砂磨和上漆处理。',
    '   c. 因材料特性在温度变化下而产生尺寸膨胀收缩的变化，此属自然现象，买方不得以此要求退货。',
    '6、提出异议的时间和方法：',
    '   * 买方在验收中，如发现货物及质量不合规定或约定，应在妥善保管货物的同时，自收到货物后3日内向卖方口头提出（需聊天记录+图片佐证）或书面异议，并提供图片/视频证据。',
    '   * 买方逾期未提出异议，则视为货物合乎规定。',
    '   * 买方因使用、保管、保养不善等造成产品质量问题者，不得提出异议。',
    '   * 乙方在收到甲方提出的异议之后，应在3个工作日内安排工作人员协商处理。',
    '7、争议的解决：本合同适用于中华人民共和国法律。甲乙双方均同意，在本合同履行过程中产生的任何争议，双方本着友好协商的原则进行解决；如协商仍无法解决，任何一方均有权将争议提交卖方所在地人民法院诉讼解决。',
    '8、扫描件与原件具有同等法律效力。',
  ];

  let html = '<div style="margin: 0.4in 0; font-family: \'' + DEFAULT_FONT + '\', sans-serif; font-size: 11pt; line-height: 1.2;">';
  remarks.forEach((remark) => {
    html += `<p style="margin: 0.1in 0;">${remark}</p>`;
  });
  html += '</div>';

  return html;
}

function generateSignatureHTML(contractData: ContractData): string {
  let buyerInfo = '<strong>[甲方开票信息]</strong><br/>公司名称：' + contractData.buyerCompanyName + '<br/>';
  if (contractData.buyerTaxNumber) buyerInfo += '税号：' + contractData.buyerTaxNumber + '<br/>';
  if (contractData.buyerAddress) buyerInfo += '地址：' + contractData.buyerAddress + '<br/>';
  if (contractData.buyerPhone) buyerInfo += '电话：' + contractData.buyerPhone + '<br/>';

  const sellerInfo = '<strong>[乙方银行账户信息]</strong><br/>公司名称 Company：佛山市顺德区西山家居科技有限公司<br/>统一社会信用代码：914406060621766268<br/>开户银行 Bank：中国工商银行股份有限公司北滘支行<br/>帐号 Account：2013013919201297869<br/>地址：广东省佛山市顺德区北滘镇工业大道35号<br/>电话：0757-26322737';

  return `
    <table style="width: 7in; border-collapse: collapse; border: none; margin: 1.2in 0; font-family: '${DEFAULT_FONT}', sans-serif; font-size: 11pt;">
      <tr>
        <td style="width: 50%; padding: 0.1in; border: none; vertical-align: top;">
          <p style="margin: 0.1in 0; font-weight: bold;">甲方（买方）：</p>
          <p style="margin: 0.1in 0;">签章：</p>
          <p style="margin: 0.1in 0;">日期：</p>
          <div style="margin-top: 0.2in;">${buyerInfo}</div>
        </td>
        <td style="width: 50%; padding: 0.1in; border: none; vertical-align: top;">
          <p style="margin: 0.1in 0; font-weight: bold;">乙方（供货方）：佛山市顺德区西山家居科技有限公司</p>
          <p style="margin: 0.1in 0;">签章：</p>
          <p style="margin: 0.1in 0;">日期：</p>
          <div style="margin-top: 0.2in;">${sellerInfo}</div>
        </td>
      </tr>
    </table>
  `;
}

export function generateContractHTML(contractData: ContractData): string {
  const logoPath = path.join(docxDir, 'server', 'images', 'agio_kaka_logo.png');
  const logoBuffer = fs.readFileSync(logoPath);
  const logoBase64 = logoBuffer.toString('base64');

  const introText = '根据《中华人民共和国民法典》合同编及相关法律规定，甲乙双方本着平等、自愿、诚实、信用的基本原则，就甲方向乙方定制花园阳台家具或材料事宜，双方协商一致的基础上签订本合同，以资共同遵守';

  const chineseTotal = numberToChinese(contractData.totalAmount);

  return `
    <!DOCTYPE html>
    <html lang="zh">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contract Preview</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
          font-size: 11pt;
          line-height: 1.2;
          margin: 0;
          padding: 25.4mm;
          width: 210mm;
          max-width: 210mm;
          background: white;
        }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #000; padding: 2.54mm; vertical-align: top; }
        th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
        .bold { font-weight: bold; }
        .right { text-align: right; }
        .center { text-align: center; }
        .left { text-align: left; }
        .no-border { border: none !important; }
        .header-table td { border: none; }
        .summary-table td { border: none; }
        .signature-table td { border: none; vertical-align: top; }
        .intro { margin: 10.16mm 0; text-align: justify; text-indent: 2em; }
        .total { margin: 15.24mm 0; font-weight: bold; text-align: left; }
        .remarks { margin: 10.16mm 0; }
        .remarks p { margin: 2.54mm 0; text-indent: 2em; }
        .batch-note { margin: 10.16mm 0; font-weight: bold; }
        .signature { margin: 30.48mm 0; }
        @media print { body { padding: 0; margin: 0; width: 210mm; height: 297mm; } }
        @page { size: A4; margin: 25.4mm; }
      </style>
    </head>
    <body>
      ${generateHeaderHTML(contractData)}
      <div style="height: 5.08mm;"></div>
      ${generateSummaryHTML(contractData)}
      <div style="height: 10.16mm;"></div>
      <p class="intro">${introText}</p>
      ${generateItemsTableHTML(contractData)}
      <p class="total">（大写）人民币 ${chineseTotal}</p>
      <p class="batch-note">批注 Remark：</p>
      ${generateRemarksHTML()}
      <div style="height: 30.48mm;"></div>
      ${generateSignatureHTML(contractData)}
    </body>
    </html>
  `;
}