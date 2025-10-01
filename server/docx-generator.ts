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
  Media,
} from 'docx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const DEFAULT_FONT = 'Microsoft YaHei';

type RunConfig = Omit<IRunOptions, 'text' | 'children'>;

type ParagraphConfig = Omit<IParagraphOptions, 'children' | 'text' | 'run'> & {
  run?: RunConfig;
};

type TableCellConfig = Omit<ITableCellOptions, 'children'> & {
  paragraph?: ParagraphConfig;
};

const DEFAULT_CELL_MARGINS: NonNullable<ITableCellOptions['margins']> = {
  marginUnitType: WidthType.DXA,
  top: 100,
  bottom: 100,
  left: 100,
  right: 100,
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
  const { run, ...rest } = options;
  return new Paragraph({
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
  return new TableCell({
    margins: margins ?? DEFAULT_CELL_MARGINS,
    ...cellOptions,
    children: [
      createParagraph(text, {
        alignment: AlignmentType.LEFT,
        spacing: { before: 80, after: 80 },
        ...(paragraph ?? {}),
      }),
    ],
  });
}

function createHeaderTable(contractData: ContractData): Table {
  const cellMargins = {
    marginUnitType: WidthType.DXA,
    top: 50,
    bottom: 50,
    left: 100,
    right: 100,
  };

  // Read logo image
  const logoPath = path.join(__dirname, 'images', 'kaka_logo.png');
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
               createParagraph('', { spacing: { after: 40 } }),
               createParagraph('', { spacing: { after: 40 } }),
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
                 spacing: { after: 40 },
               }),
               createParagraph(`签订日期：${formatDate(contractData.signingDate)}`, {
                 alignment: AlignmentType.RIGHT,
                 run: { size: 18 },
                 spacing: { after: 40 },
               }),
               createParagraph(`预计发货日期：${formatDate(contractData.estimatedDelivery)}`, {
                 alignment: AlignmentType.RIGHT,
                 run: { size: 18 },
                 spacing: { after: 40 },
               }),
             ],
           }),
         ],
       }),
    ],
  });
}

function createSummaryRow(label: string, value: string, label2: string, value2: string): TableRow {
  return new TableRow({
    children: [
      createTableCell(label, {
        width: { size: 1800, type: WidthType.DXA },
        paragraph: { run: { bold: true, size: 16 }, spacing: { before: 56, after: 56 } },
        verticalAlign: VerticalAlign.CENTER,
      }),
      createTableCell(value || '-', {
        width: { size: 2600, type: WidthType.DXA },
        paragraph: { run: { size: 16 }, spacing: { before: 56, after: 56 } },
        verticalAlign: VerticalAlign.CENTER,
      }),
      createTableCell(label2, {
        width: { size: 1800, type: WidthType.DXA },
        paragraph: { run: { bold: true, size: 16 }, spacing: { before: 56, after: 56 } },
        verticalAlign: VerticalAlign.CENTER,
      }),
      createTableCell(value2 || '-', {
        width: { size: 3800, type: WidthType.DXA },
        paragraph: { run: { size: 16 }, spacing: { before: 56, after: 56 } },
        verticalAlign: VerticalAlign.CENTER,
      }),
    ],
  });
}

function createSummaryTable(contractData: ContractData): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [1800, 2600, 1800, 3800],
    borders: OUTLINE_TABLE_BORDERS,
    rows: [
      createSummaryRow('项目名称', contractData.projectName, '甲方', contractData.buyerCompanyName),
      createSummaryRow('设计师', contractData.designer, '乙方', '佛山市顺德区西山家居科技有限公司'),
      createSummaryRow('业务代表', contractData.salesRep, '统一社会信用代码', '914406060621766268'),
    ],
  });
}

function createItemsTable(contractData: ContractData): Table {
  const headerCells = [
    { text: '区域', width: 470 },
    { text: '分项', width: 470 },
    { text: '产品名称或编号', width: 2168 },
    { text: '产品细分', width: 470 },
    { text: '产品规格', width: 1130 },
    { text: '颜色', width: 693 },
    { text: '数量', width: 470 },
    { text: '单位', width: 470 },
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
          run: { bold: true, size: 16 },
        },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'f2f2f2' },
        verticalAlign: VerticalAlign.CENTER,
      }),
    ),
  });

  const itemRows = contractData.items.map((item) =>
    new TableRow({
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
    }),
  );

  const totalRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: headerCells.length - 2,
        margins: DEFAULT_CELL_MARGINS,
        children: [
          createParagraph('合计 Total (RMB)', {
            alignment: AlignmentType.RIGHT,
            run: { bold: true, size: 16 },
          }),
        ],
      }),
      new TableCell({
        columnSpan: 2,
        margins: DEFAULT_CELL_MARGINS,
        children: [
          createParagraph(formatCurrency(contractData.totalAmount), {
            alignment: AlignmentType.RIGHT,
            run: { bold: true, size: 16 },
          }),
        ],
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
      spacing: { before: 40, after: 40 },
    }),
  );
}

function createSignatureTable(contractData: ContractData): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [4500, 4500],
    borders: NO_TABLE_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            margins: DEFAULT_CELL_MARGINS,
            borders: NO_TABLE_BORDERS,
            children: [
              createParagraph('甲方（买方）：', { run: { bold: true } }),
            ],
          }),
          new TableCell({
            margins: DEFAULT_CELL_MARGINS,
            borders: NO_TABLE_BORDERS,
            children: [
              createParagraph('乙方（供货方）：佛山市顺德区锡山家居科技有限公司', { run: { bold: true } }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            margins: DEFAULT_CELL_MARGINS,
            borders: NO_TABLE_BORDERS,
            children: [createParagraph('签章：')],
          }),
          new TableCell({
            margins: DEFAULT_CELL_MARGINS,
            borders: NO_TABLE_BORDERS,
            children: [createParagraph('签章：')],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            margins: DEFAULT_CELL_MARGINS,
            borders: NO_TABLE_BORDERS,
            children: [createParagraph('日期：')],
          }),
          new TableCell({
            margins: DEFAULT_CELL_MARGINS,
            borders: NO_TABLE_BORDERS,
            children: [createParagraph('日期：')],
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
    createParagraph('公司名称 Company：佛山市顺德区锡山家居科技有限公司'),
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
                size: 16,
              },
              paragraph: {
                spacing: { line: 276 },
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
                margin: { top: 720, bottom: 720, left: 720, right: 720 },
              },
            },
            children: [
              createHeaderTable(contractData),
              new Paragraph({ text: '', spacing: { after: 80 } }),
              createSummaryTable(contractData),
              new Paragraph({ text: '', spacing: { after: 200 } }),
              createParagraph('根据《中华人民共和国民法典》合同编及相关法律规定，甲乙双方本着平等、自愿、诚实、信用的基本原则，就甲方向乙方定制花园阳台家具或材料事宜，双方协商一致的基础上签订本合同，以资共同遵守', {
                spacing: { after: 100 },
              }),
              createItemsTable(contractData),
              createParagraph(`（大写）人民币 ${numberToChinese(contractData.totalAmount)}`, {
                spacing: { before: 200, after: 200 },
                run: { bold: true },
              }),
              createParagraph('批注 Remark：', {
                run: { bold: true },
                spacing: { after: 80 },
              }),
              ...createRemarkParagraphs(),
              new Paragraph({ text: '', spacing: { after: 200 } }),
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