import 'dotenv/config';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { orders, dealers } from '../../shared/schema';

// Extracted data array (complete: 24 orders)
const extractedOrders = [
  {
    "order": {
      "id": "gz-qs-20250016",
      "dealer_name": "广州芊丝软装设计有限公司",
      "dealer_credit_code": null,
      "territory": "guangzhou",
      "project_name": "番禺剑桥郡阳台墙板项目",
      "order_date": "2025-08-12",
      "estimated_ship_date": "2025-08-25",
      "total_amount": 7294,
      "status": "shipped",
      "notes": "阳台墙板项目; 设计师/业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担"
    },
    "items": [
      {
        "material_name": "芳华Ⅰ-111（谷之木4号B款墙板）",
        "material_code": "R0056",
        "subtype": "条状",
        "specs": "2800*119*12 单面 灰绿色（实）",
        "quantity": 28.7,
        "unit": "㎡",
        "unit_price": 245,
        "total_price": 7021,
        "remarks": "86条"
      },
      {
        "material_name": "墙板收边条（芳华II 阳角线）",
        "material_code": "R0056",
        "subtype": "条状",
        "specs": "3000*25*25 双面 灰绿色（实）",
        "quantity": 30,
        "unit": "米",
        "unit_price": 9,
        "total_price": 273,
        "remarks": "10条"
      }
    ]
  },
  {
    "order": {
      "id": "gz-qs-20250014-increment1",
      "dealer_name": "广州芊丝软装设计有限公司",
      "dealer_credit_code": null,
      "territory": "guangzhou",
      "project_name": "江山帝景（华南新城）花园项目",
      "order_date": "2025-09-17",
      "estimated_ship_date": "2025-09-26",
      "total_amount": 1224,
      "status": "shipped",
      "notes": "增补1; 阳台花园项目; 设计师/业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担"
    },
    "items": [
      {
        "material_name": "谷之木1号",
        "material_code": "R0052",
        "subtype": "条状",
        "specs": "3000*140*25 单面 暹罗柚木色（实）",
        "quantity": 2.52,
        "unit": "㎡",
        "unit_price": 486,
        "total_price": 1224,
        "remarks": "6条"
      }
    ]
  },
  {
    "order": {
      "id": "cd-20240009-increment1",
      "dealer_name": "四川合久晟建筑科技有限公司",
      "dealer_credit_code": null,
      "territory": "chengdu",
      "project_name": "成都市锦江区建发央玺20-1-302项目",
      "order_date": "2025-09-05",
      "estimated_ship_date": "2025-09-19",
      "total_amount": 168,
      "status": "shipped",
      "notes": "增补1; 阳台花园项目; 设计师/业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担"
    },
    "items": [
      {
        "material_name": "谷之木1号",
        "material_code": "R0108",
        "subtype": "条状",
        "specs": "3000*140*25 单面",
        "quantity": 0.42,
        "unit": "㎡",
        "unit_price": 399,
        "total_price": 168,
        "remarks": "1条"
      }
    ]
  },
  {
    "order": {
      "id": "hz-jn-20250007",
      "dealer_name": "杭州乔耐经销商",
      "dealer_credit_code": null,
      "territory": "hangzhou",
      "project_name": "馥香园7-801花箱项目",
      "order_date": "2025-09-10",
      "estimated_ship_date": "2025-10-09",
      "total_amount": 3936,
      "status": "pending",
      "notes": "花箱项目; 设计师/业务代表: 陈雲; 支付: 100% within 2 days; 运输: 甲方承担; 年度优惠活动周五爆单日折上折-95折"
    },
    "items": [
      {
        "material_name": "洞洞花箱1",
        "material_code": "R0053",
        "subtype": "展开面积",
        "specs": "1210*350*H450mm 橙黄色（实）",
        "quantity": 1,
        "unit": "个",
        "unit_price": 1207,
        "total_price": 1207,
        "remarks": ""
      },
      {
        "material_name": "洞洞花箱2",
        "material_code": "R0053",
        "subtype": "条状",
        "specs": "1400*350*H450mm 橙黄色（实）",
        "quantity": 1,
        "unit": "个",
        "unit_price": 1335,
        "total_price": 1335,
        "remarks": ""
      },
      {
        "material_name": "洞洞花箱3",
        "material_code": "R0053",
        "subtype": "条状",
        "specs": "1490*350*H450mm 橙黄色（实）",
        "quantity": 1,
        "unit": "个",
        "unit_price": 1395,
        "total_price": 1395,
        "remarks": ""
      }
    ]
  },
  {
    "order": {
      "id": "gz-qs-20250019",
      "dealer_name": "广州芊丝软装设计有限公司",
      "dealer_credit_code": null,
      "territory": "guangzhou",
      "project_name": "广州珊瑚湾畔别墅阳台项目",
      "order_date": "2025-09-12",
      "estimated_ship_date": "2025-09-26",
      "total_amount": 5576,
      "status": "shipped",
      "notes": "阳台项目; 设计师/业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担; 年度优惠活动周五爆单日折上折-95折"
    },
    "items": [
      {
        "material_name": "芳华Ⅰ-111（谷之木4号B款墙板）",
        "material_code": "R0060",
        "subtype": "条状",
        "specs": "2800*119*12 单面 白色（实）",
        "quantity": 24,
        "unit": "㎡",
        "unit_price": 245,
        "total_price": 5576,
        "remarks": "72条"
      }
    ]
  },
  {
    "order": {
      "id": "gz-qs-20250018",
      "dealer_name": "广州芊丝软装设计有限公司",
      "dealer_credit_code": null,
      "territory": "guangzhou",
      "project_name": "广州海珠区磨碟沙星品项目",
      "order_date": "2025-09-05",
      "estimated_ship_date": "2025-09-19",
      "total_amount": 7079,
      "status": "shipped",
      "notes": "阳台墙板项目; 设计师/业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担"
    },
    "items": [
      {
        "material_name": "芳华Ⅰ-111（谷之木4号B款墙板）",
        "material_code": "R0060",
        "subtype": "条状",
        "specs": "2800*119*12 单面 白色（实）",
        "quantity": 8,
        "unit": "㎡",
        "unit_price": 245,
        "total_price": 1957,
        "remarks": "24条"
      },
      {
        "material_name": "芳华Ⅰ-111（谷之木4号B款墙板）",
        "material_code": "R0056",
        "subtype": "条状",
        "specs": "2800*119*12 单面 灰绿色（实）",
        "quantity": 8,
        "unit": "㎡",
        "unit_price": 245,
        "total_price": 1957,
        "remarks": "24条"
      },
      {
        "material_name": "格栅墙板1",
        "material_code": "R0056",
        "subtype": "展开面积",
        "specs": "3520*426*30 三面 灰绿色（实）",
        "quantity": 1.5,
        "unit": "㎡",
        "unit_price": 588,
        "total_price": 882,
        "remarks": ""
      },
      {
        "material_name": "格栅墙板2",
        "material_code": "R0060",
        "subtype": "展开面积",
        "specs": "2610*720*30 三面 白色（实）",
        "quantity": 1.9,
        "unit": "㎡",
        "unit_price": 588,
        "total_price": 1117,
        "remarks": ""
      },
      {
        "material_name": "格栅墙板3",
        "material_code": "R0060",
        "subtype": "展开面积",
        "specs": "1020*1470*30 三面 白色（实）",
        "quantity": 1.5,
        "unit": "㎡",
        "unit_price": 588,
        "total_price": 882,
        "remarks": ""
      },
      {
        "material_name": "屏风",
        "material_code": "R0056",
        "subtype": "/",
        "specs": "1600*360*30 三面 灰绿色（实）",
        "quantity": 0.6,
        "unit": "㎡",
        "unit_price": 473,
        "total_price": 284,
        "remarks": "不足06㎡按0.6㎡算"
      }
    ]
  },
  {
    "order": {
      "id": "cd-20250005",
      "dealer_name": "四川合久晟建筑科技有限公司",
      "dealer_credit_code": null,
      "territory": "chengdu",
      "project_name": "成都建发央玺大板墙板项目",
      "order_date": "2025-08-07",
      "estimated_ship_date": "2025-08-18",
      "total_amount": 7269,
      "status": "shipped",
      "notes": "墙面墙板项目; 设计师/业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担; 此份为准 2025.08.12"
    },
    "items": [
      {
        "material_name": "大板墙板1",
        "material_code": "R0060",
        "subtype": "展开面积",
        "specs": "1220*7620*10 三面 白色（实）",
        "quantity": 9.3,
        "unit": "㎡",
        "unit_price": 308,
        "total_price": 2864,
        "remarks": "共分7块出货"
      },
      {
        "material_name": "大板墙板2",
        "material_code": "R0003x",
        "subtype": "展开面积",
        "specs": "2900*550*10 三面",
        "quantity": 1.6,
        "unit": "㎡",
        "unit_price": 308,
        "total_price": 493,
        "remarks": "共分2块出货"
      },
      {
        "material_name": "大板墙板3",
        "material_code": "R0003x",
        "subtype": "展开面积",
        "specs": "2440*300*10 三面",
        "quantity": 0.8,
        "unit": "㎡",
        "unit_price": 308,
        "total_price": 246,
        "remarks": ""
      },
      {
        "material_name": "大板墙板4",
        "material_code": "R0003x",
        "subtype": "展开面积",
        "specs": "2820*200*10 三面",
        "quantity": 0.6,
        "unit": "㎡",
        "unit_price": 308,
        "total_price": 185,
        "remarks": ""
      },
      {
        "material_name": "大板墙板5",
        "material_code": "R0003x",
        "subtype": "展开面积",
        "specs": "2820*140*10 三面",
        "quantity": 0.4,
        "unit": "㎡",
        "unit_price": 308,
        "total_price": 123,
        "remarks": ""
      },
      {
        "material_name": "大板墙板6",
        "material_code": "R0003x",
        "subtype": "展开面积",
        "specs": "2740*600*10 三面",
        "quantity": 1.7,
        "unit": "㎡",
        "unit_price": 308,
        "total_price": 524,
        "remarks": ""
      },
      {
        "material_name": "大板墙板7",
        "material_code": "R0003x",
        "subtype": "展开面积",
        "specs": "2740*1220*10 三面",
        "quantity": 3.4,
        "unit": "㎡",
        "unit_price": 308,
        "total_price": 1047,
        "remarks": ""
      },
      {
        "material_name": "大板墙板8",
        "material_code": "R0003x",
        "subtype": "展开面积",
        "specs": "2740*350*10 三面",
        "quantity": 1,
        "unit": "㎡",
        "unit_price": 308,
        "total_price": 308,
        "remarks": ""
      },
      {
        "material_name": "大板墙板9",
        "material_code": "R0003x",
        "subtype": "展开面积",
        "specs": "500*500*10 三面",
        "quantity": 0.3,
        "unit": "㎡",
        "unit_price": 308,
        "total_price": 92,
        "remarks": ""
      },
      {
        "material_name": "大板墙板10",
        "material_code": "R0003x",
        "subtype": "展开面积",
        "specs": "2290*150*10 三面",
        "quantity": 0.4,
        "unit": "㎡",
        "unit_price": 308,
        "total_price": 123,
        "remarks": ""
      },
      {
        "material_name": "大板墙板11",
        "material_code": "R0003x",
        "subtype": "展开面积",
        "specs": "2740*360*10 三面",
        "quantity": 1,
        "unit": "㎡",
        "unit_price": 308,
        "total_price": 308,
        "remarks": ""
      },
      {
        "material_name": "大板墙板12",
        "material_code": "R0003x",
        "subtype": "展开面积",
        "specs": "2590*140*10 三面",
        "quantity": 0.8,
        "unit": "㎡",
        "unit_price": 308,
        "total_price": 246,
        "remarks": ""
      },
      {
        "material_name": "大板墙板13",
        "material_code": "R0003x",
        "subtype": "展开面积",
        "specs": "2805*150*10 三面",
        "quantity": 0.9,
        "unit": "㎡",
        "unit_price": 308,
        "total_price": 277,
        "remarks": ""
      },
      {
        "material_name": "大板墙板14",
        "material_code": "R0003x",
        "subtype": "展开面积",
        "specs": "2805*150*10 三面",
        "quantity": 1.4,
        "unit": "㎡",
        "unit_price": 308,
        "total_price": 431,
        "remarks": ""
      }
    ]
  },
  {
    "order": {
      "id": "cd-20250008",
      "dealer_name": "四川合久晟建筑科技有限公司",
      "dealer_credit_code": null,
      "territory": "chengdu",
      "project_name": "玺宸上院13-2-102项目",
      "order_date": "2025-09-05",
      "estimated_ship_date": "2025-09-19",
      "total_amount": 6830,
      "status": "shipped",
      "notes": "地面地板项目; 设计师/业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担; 年度优惠活动周五爆单日折上折-95折; 特价不参与"
    },
    "items": [
      {
        "material_name": "谷之木1号",
        "material_code": "R0002x",
        "subtype": "条状",
        "specs": "3000*140*25 单面",
        "quantity": 15.5,
        "unit": "㎡",
        "unit_price": 399,
        "total_price": 6200,
        "remarks": "37条"
      },
      {
        "material_name": "型材L型收边条",
        "material_code": "R0002x",
        "subtype": "条状",
        "specs": "3000*60*60*5 单面",
        "quantity": 12,
        "unit": "米",
        "unit_price": 53,
        "total_price": 630,
        "remarks": "4条"
      }
    ]
  },
  {
    "order": {
      "id": "cd-20250006",
      "dealer_name": "四川合久晟建筑科技有限公司",
      "dealer_credit_code": null,
      "territory": "chengdu",
      "project_name": "成都8月采购旋转椅项目",
      "order_date": "2025-08-08",
      "estimated_ship_date": "客户提前通知",
      "total_amount": 1588,
      "status": "shipped",
      "notes": "户外家具项目; 设计师/业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担; 直接用聚宝成品库存"
    },
    "items": [
      {
        "material_name": "高端户外铸铝旋转椅",
        "material_code": "AAX11001Y02",
        "subtype": "/",
        "specs": "660*595*912 灰黑色",
        "quantity": 2,
        "unit": "张",
        "unit_price": 794,
        "total_price": 1588,
        "remarks": ""
      }
    ]
  },
  {
    "order": {
      "id": "cd-20250007",
      "dealer_name": "四川合久晟建筑科技有限公司",
      "dealer_credit_code": null,
      "territory": "chengdu",
      "project_name": "玺宸上院12-2-101项目",
      "order_date": "2025-09-12",
      "estimated_ship_date": "2025-09-26",
      "total_amount": 5019,
      "status": "shipped",
      "notes": "地面地板项目; 设计师/业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担; 年度优惠活动周五爆单日折上折-95折; 特价不参与"
    },
    "items": [
      {
        "material_name": "谷之木1号",
        "material_code": "R0002x",
        "subtype": "条状",
        "specs": "3000*140*25 单面",
        "quantity": 11,
        "unit": "㎡",
        "unit_price": 399,
        "total_price": 4389,
        "remarks": "26条"
      },
      {
        "material_name": "型材L型收边条",
        "material_code": "R0002x",
        "subtype": "条状",
        "specs": "3000*60*60*5 单面",
        "quantity": 12,
        "unit": "米",
        "unit_price": 53,
        "total_price": 630,
        "remarks": "4条"
      }
    ]
  },
  {
    "order": {
      "id": "gz-qs-20250017",
      "dealer_name": "广州芊丝软装设计有限公司",
      "dealer_credit_code": null,
      "territory": "guangzhou",
      "project_name": "番禺珊瑚湾畔阳台墙板项目",
      "order_date": "2025-08-14",
      "estimated_ship_date": "2025-08-30",
      "total_amount": 5870,
      "status": "shipped",
      "notes": "阳台墙板项目; 设计师/业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担"
    },
    "items": [
      {
        "material_name": "芳华Ⅰ-111（谷之木4号B款墙板）",
        "material_code": "R0001X",
        "subtype": "条状",
        "specs": "2800*119*12 单面",
        "quantity": 18.7,
        "unit": "㎡",
        "unit_price": 245,
        "total_price": 4575,
        "remarks": "56条"
      },
      {
        "material_name": "墙板收边条（芳华II 阳角线）",
        "material_code": "R0001X",
        "subtype": "条状",
        "specs": "3000*25*25 双面",
        "quantity": 24,
        "unit": "米",
        "unit_price": 9,
        "total_price": 218,
        "remarks": "8条"
      },
      {
        "material_name": "大型天花饰条",
        "material_code": "R0002X",
        "subtype": "条状",
        "specs": "1602*95*10 三面",
        "quantity": 14.5,
        "unit": "米",
        "unit_price": 45,
        "total_price": 650,
        "remarks": ""
      },
      {
        "material_name": "20发泡地板收边条",
        "material_code": "R0002X",
        "subtype": "条状",
        "specs": "2440*50*20 三面",
        "quantity": 12.2,
        "unit": "米",
        "unit_price": 35,
        "total_price": 427,
        "remarks": ""
      }
    ]
  },
  {
    "order": {
      "id": "sz-hm-20250022",
      "dealer_name": "深圳虹米经销商",
      "dealer_credit_code": null,
      "territory": "shenzhen",
      "project_name": "越秀瑞樾府2-2903杨总项目",
      "order_date": "2025-08-05",
      "estimated_ship_date": "2025-08-30",
      "total_amount": 14145,
      "status": "shipped",
      "notes": "阳台花园项目; 设计师: 陈雲; 业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担"
    },
    "items": [
      {
        "material_name": "微风Ⅳ 微风超薄地板",
        "material_code": "R0009X",
        "subtype": "展开面积",
        "specs": "1500*132*9mm 单面",
        "quantity": 9.7,
        "unit": "㎡",
        "unit_price": 451,
        "total_price": 4374,
        "remarks": ""
      },
      {
        "material_name": "定制95墙板",
        "material_code": "R0060",
        "subtype": "展开面积",
        "specs": "2880*200*10mm 单面 白色（实）",
        "quantity": 21.9,
        "unit": "㎡",
        "unit_price": 273,
        "total_price": 5975,
        "remarks": ""
      },
      {
        "material_name": "阳角线",
        "material_code": "R0060",
        "subtype": "条状",
        "specs": "3000*25*25mm 白色（实）",
        "quantity": 30,
        "unit": "米",
        "unit_price": 9,
        "total_price": 273,
        "remarks": ""
      },
      {
        "material_name": "墙板龙骨",
        "material_code": "/",
        "subtype": "条状",
        "specs": "2880*50*10mm",
        "quantity": 72,
        "unit": "米",
        "unit_price": 14,
        "total_price": 1008,
        "remarks": ""
      },
      {
        "material_name": "天花饰条",
        "material_code": "R0009X",
        "subtype": "条状",
        "specs": "2880*50*10mm 三面",
        "quantity": 17.3,
        "unit": "米",
        "unit_price": 32,
        "total_price": 544,
        "remarks": ""
      },
      {
        "material_name": "马赛方形层板",
        "material_code": "R0108X",
        "subtype": "个",
        "specs": "350*350*180*20mm",
        "quantity": 2,
        "unit": "个",
        "unit_price": 235,
        "total_price": 469,
        "remarks": ""
      },
      {
        "material_name": "格栅墙板",
        "material_code": "R0009X",
        "subtype": "展开面积",
        "specs": "2757*720*30mm",
        "quantity": 1.99,
        "unit": "㎡",
        "unit_price": 588,
        "total_price": 1167,
        "remarks": ""
      },
      {
        "material_name": "米兰定制屏风",
        "material_code": "R0108X",
        "subtype": "展开面积",
        "specs": "1300*450*20mm",
        "quantity": 0.6,
        "unit": "㎡",
        "unit_price": 557,
        "total_price": 334,
        "remarks": ""
      }
    ]
  },
  {
    "order": {
      "id": "sz-hm-20250023",
      "dealer_name": "深圳虹米经销商",
      "dealer_credit_code": null,
      "territory": "shenzhen",
      "project_name": "海德园5A3502项目",
      "order_date": "2025-08-13",
      "estimated_ship_date": "2025-09-07",
      "total_amount": 5477,
      "status": "shipped",
      "notes": "阳台花园项目; 设计师: 陈雲; 业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担"
    },
    "items": [
      {
        "material_name": "微风Ⅳ 微风超薄地板",
        "material_code": "R0009X",
        "subtype": "展开面积",
        "specs": "1500*132*9mm 单面",
        "quantity": 6.93,
        "unit": "㎡",
        "unit_price": 451,
        "total_price": 3124,
        "remarks": ""
      },
      {
        "material_name": "芳华I 95墙板",
        "material_code": "R0060",
        "subtype": "展开面积",
        "specs": "2880*95*10mm 单面 白色（实）",
        "quantity": 5.47,
        "unit": "㎡",
        "unit_price": 273,
        "total_price": 1494,
        "remarks": ""
      },
      {
        "material_name": "阳角线",
        "material_code": "R0060",
        "subtype": "条状",
        "specs": "3000*25*25mm 白色（实）",
        "quantity": 18,
        "unit": "米",
        "unit_price": 9,
        "total_price": 164,
        "remarks": ""
      },
      {
        "material_name": "墙板龙骨",
        "material_code": "/",
        "subtype": "条状",
        "specs": "2880*50*10mm",
        "quantity": 31.7,
        "unit": "米",
        "unit_price": 14,
        "total_price": 444,
        "remarks": ""
      },
      {
        "material_name": "马赛方形层板",
        "material_code": "R0060",
        "subtype": "个",
        "specs": "270*220*H120*20mm 白色（实）",
        "quantity": 2,
        "unit": "个",
        "unit_price": 126,
        "total_price": 252,
        "remarks": ""
      }
    ]
  },
  {
    "order": {
      "id": "sz-hm-20250021",
      "dealer_name": "深圳虹米经销商",
      "dealer_credit_code": null,
      "territory": "shenzhen",
      "project_name": "崇文花园17栋708项目",
      "order_date": "2025-08-05",
      "estimated_ship_date": "2025-08-20",
      "total_amount": 2588,
      "status": "shipped",
      "notes": "阳台花园项目; 设计师: 陈雲; 业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担"
    },
    "items": [
      {
        "material_name": "微风Ⅳ 微风超薄地板",
        "material_code": "R0103",
        "subtype": "展开面积",
        "specs": "1500*132*9mm 单面",
        "quantity": 5.74,
        "unit": "㎡",
        "unit_price": 451,
        "total_price": 2588,
        "remarks": ""
      }
    ]
  },
  {
    "order": {
      "id": "sz-hm-20250028",
      "dealer_name": "深圳虹米经销商",
      "dealer_credit_code": null,
      "territory": "shenzhen",
      "project_name": "鼎胜金域阳光家园2A栋1001项目",
      "order_date": "2025-08-29",
      "estimated_ship_date": "2025-09-15",
      "total_amount": 2499,
      "status": "shipped",
      "notes": "阳台花园项目; 设计师: 陈雲; 业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担"
    },
    "items": [
      {
        "material_name": "微风Ⅳ 微风超薄地板",
        "material_code": "R0001X",
        "subtype": "展开面积",
        "specs": "1500*132*9mm 单面",
        "quantity": 5.54,
        "unit": "㎡",
        "unit_price": 451,
        "total_price": 2499,
        "remarks": ""
      }
    ]
  },
  {
    "order": {
      "id": "sz-hm-20250026",
      "dealer_name": "深圳虹米经销商",
      "dealer_credit_code": null,
      "territory": "shenzhen",
      "project_name": "店面样板项目",
      "order_date": "2025-09-05",
      "estimated_ship_date": "2025-09-30",
      "total_amount": 9198,
      "status": "shipped",
      "notes": "店面样板项目; 设计师: 陈雲; 业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担; 3.5折 then 7折; 实际应付9198元，门店装修，总部支持成交金额30%"
    },
    "items": [
      {
        "material_name": "微风Ⅳ 微风超薄地板",
        "material_code": "R0009X",
        "subtype": "展开面积",
        "specs": "1500*132*9mm 单面",
        "quantity": 6.73,
        "unit": "㎡",
        "unit_price": 316,
        "total_price": 2124,
        "remarks": ""
      },
      {
        "material_name": "定制95墙板1",
        "material_code": "R0060",
        "subtype": "展开面积",
        "specs": "2880*180*10mm 单面 白色（实）",
        "quantity": 13,
        "unit": "㎡",
        "unit_price": 191,
        "total_price": 2477,
        "remarks": ""
      },
      {
        "material_name": "定制95墙板2",
        "material_code": null,
        "subtype": "展开面积",
        "specs": "2880*180*10mm 单面 墨绿色",
        "quantity": 3.63,
        "unit": "㎡",
        "unit_price": 191,
        "total_price": 693,
        "remarks": ""
      },
      {
        "material_name": "墙板收边条",
        "material_code": null,
        "subtype": "展开面积",
        "specs": "2880*100*10mm 三面 墨绿色",
        "quantity": 2.88,
        "unit": "米",
        "unit_price": 31,
        "total_price": 90,
        "remarks": ""
      },
      {
        "material_name": "阳角线",
        "material_code": "R0060",
        "subtype": "条状",
        "specs": "3000*25*25mm 白色（实）",
        "quantity": 9,
        "unit": "米",
        "unit_price": 6,
        "total_price": 57,
        "remarks": ""
      },
      {
        "material_name": "墙板龙骨",
        "material_code": "/",
        "subtype": "条状",
        "specs": "2880*50*10mm",
        "quantity": 43.2,
        "unit": "米",
        "unit_price": 10,
        "total_price": 423,
        "remarks": ""
      },
      {
        "material_name": "米兰定制屏风1",
        "material_code": null,
        "subtype": "展开面积",
        "specs": "580*160*20mm 墨绿色",
        "quantity": 0.6,
        "unit": "㎡",
        "unit_price": 390,
        "total_price": 234,
        "remarks": ""
      },
      {
        "material_name": "米兰定制屏风2",
        "material_code": null,
        "subtype": "展开面积",
        "specs": "550*150*20mm 墨绿色",
        "quantity": 0.6,
        "unit": "㎡",
        "unit_price": 390,
        "total_price": 234,
        "remarks": ""
      },
      {
        "material_name": "米兰定制屏风3",
        "material_code": null,
        "subtype": "展开面积",
        "specs": "330*120*20mm 墨绿色",
        "quantity": 0.6,
        "unit": "㎡",
        "unit_price": 390,
        "total_price": 234,
        "remarks": ""
      },
      {
        "material_name": "米兰定制屏风4",
        "material_code": null,
        "subtype": "展开面积",
        "specs": "350*120*20mm 墨绿色",
        "quantity": 0.6,
        "unit": "㎡",
        "unit_price": 390,
        "total_price": 234,
        "remarks": ""
      },
      {
        "material_name": "米兰定制屏风5",
        "material_code": null,
        "subtype": "展开面积",
        "specs": "550*160*20mm 墨绿色",
        "quantity": 0.6,
        "unit": "㎡",
        "unit_price": 390,
        "total_price": 234,
        "remarks": ""
      },
      {
        "material_name": "米兰定制屏风6",
        "material_code": null,
        "subtype": "展开面积",
        "specs": "470*150*20mm 墨绿色",
        "quantity": 0.6,
        "unit": "㎡",
        "unit_price": 390,
        "total_price": 234,
        "remarks": ""
      },
      {
        "material_name": "米兰定制屏风7",
        "material_code": "R0060",
        "subtype": "展开面积",
        "specs": "2385*590*20mm 白色（实）",
        "quantity": 2.81,
        "unit": "㎡",
        "unit_price": 390,
        "total_price": 1096,
        "remarks": ""
      },
      {
        "material_name": "屏风辅助立柱",
        "material_code": null,
        "subtype": "条状",
        "specs": "3000*50*50mm 墨绿色",
        "quantity": 9,
        "unit": "米",
        "unit_price": 46,
        "total_price": 415,
        "remarks": ""
      },
      {
        "material_name": "屏风脚架",
        "material_code": "/",
        "subtype": "条状",
        "specs": "/",
        "quantity": 6,
        "unit": "个",
        "unit_price": 20,
        "total_price": 120,
        "remarks": "不打折"
      },
      {
        "material_name": "田园窗",
        "material_code": "R0001X",
        "subtype": "展开面积",
        "specs": "1050*720*40mm",
        "quantity": 1,
        "unit": "个",
        "unit_price": 299,
        "total_price": 299,
        "remarks": ""
      }
    ]
  },
  {
    "order": {
      "id": "sz-hm-20250024",
      "dealer_name": "深圳虹米经销商",
      "dealer_credit_code": null,
      "territory": "shenzhen",
      "project_name": "三湘海尚N栋7C李女士项目",
      "order_date": "2025-08-15",
      "estimated_ship_date": "2025-09-12",
      "total_amount": 18353,
      "status": "shipped",
      "notes": "阳台花园项目; 设计师: 陈雲; 业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担"
    },
    "items": [
      {
        "material_name": "米兰竖格屏风",
        "material_code": "R0049",
        "subtype": "展开面积",
        "specs": "2185*631*20mm 古木色（实）",
        "quantity": 4.14,
        "unit": "㎡",
        "unit_price": 473,
        "total_price": 1954,
        "remarks": ""
      },
      {
        "material_name": "屏风辅助立柱",
        "material_code": "R0001X",
        "subtype": "条状",
        "specs": "3000*50*50mm",
        "quantity": 12,
        "unit": "米",
        "unit_price": 66,
        "total_price": 790,
        "remarks": ""
      },
      {
        "material_name": "屏风脚架",
        "material_code": "/",
        "subtype": "条状",
        "specs": "/",
        "quantity": 8,
        "unit": "个",
        "unit_price": 20,
        "total_price": 160,
        "remarks": ""
      },
      {
        "material_name": "微风Ⅳ 微风超薄地板",
        "material_code": "R0001X",
        "subtype": "展开面积",
        "specs": "1500*132*9mm 单面",
        "quantity": 16.8,
        "unit": "㎡",
        "unit_price": 451,
        "total_price": 7587,
        "remarks": ""
      },
      {
        "material_name": "芳华I 95墙板",
        "material_code": "R0001X",
        "subtype": "展开面积",
        "specs": "2880*95*10mm 单面",
        "quantity": 21.9,
        "unit": "㎡",
        "unit_price": 273,
        "total_price": 5975,
        "remarks": ""
      },
      {
        "material_name": "阳角线",
        "material_code": "R0001X",
        "subtype": "条状",
        "specs": "3000*25*25mm",
        "quantity": 39,
        "unit": "米",
        "unit_price": 9,
        "total_price": 355,
        "remarks": ""
      },
      {
        "material_name": "墙板龙骨",
        "material_code": "/",
        "subtype": "条状",
        "specs": "2880*50*10mm",
        "quantity": 109,
        "unit": "米",
        "unit_price": 14,
        "total_price": 1532,
        "remarks": ""
      }
    ]
  },
  {
    "order": {
      "id": "sz-hm-20250029",
      "dealer_name": "深圳虹米经销商",
      "dealer_credit_code": null,
      "territory": "shenzhen",
      "project_name": "润科华府2A栋2901项目",
      "order_date": "2025-09-15",
      "estimated_ship_date": "2025-09-30",
      "total_amount": 4985,
      "status": "shipped",
      "notes": "阳台花园项目; 设计师: 陈雲; 业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担"
    },
    "items": [
      {
        "material_name": "微风Ⅳ 微风超薄地板",
        "material_code": "R0002X",
        "subtype": "展开面积",
        "specs": "1500*132*9mm 单面",
        "quantity": 8.32,
        "unit": "㎡",
        "unit_price": 451,
        "total_price": 3749,
        "remarks": ""
      },
      {
        "material_name": "芳华I 95墙板",
        "material_code": "R0002X",
        "subtype": "展开面积",
        "specs": "2880*95*10mm 单面",
        "quantity": 3.28,
        "unit": "㎡",
        "unit_price": 273,
        "total_price": 896,
        "remarks": ""
      },
      {
        "material_name": "阳角线",
        "material_code": "R0002X",
        "subtype": "条状",
        "specs": "3000*25*25mm 两面",
        "quantity": 24,
        "unit": "米",
        "unit_price": 9,
        "total_price": 218,
        "remarks": ""
      },
      {
        "material_name": "墙板龙骨",
        "material_code": "/",
        "subtype": "条状",
        "specs": "2880*50*10mm",
        "quantity": 8.64,
        "unit": "米",
        "unit_price": 14,
        "total_price": 121,
        "remarks": ""
      }
    ]
  },
  {
    "order": {
      "id": "sz-hm-20250027",
      "dealer_name": "深圳虹米经销商",
      "dealer_credit_code": null,
      "territory": "shenzhen",
      "project_name": "紫云府1-2-2507项目",
      "order_date": "2025-08-27",
      "estimated_ship_date": "2025-09-20",
      "total_amount": 2224,
      "status": "shipped",
      "notes": "阳台花园项目; 设计师: 陈雲; 业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担"
    },
    "items": [
      {
        "material_name": "米兰定制屏风",
        "material_code": "R0053",
        "subtype": "展开面积",
        "specs": "950*430*26mm 橙黄色（实）",
        "quantity": 0.6,
        "unit": "㎡",
        "unit_price": 557,
        "total_price": 334,
        "remarks": ""
      },
      {
        "material_name": "卡座",
        "material_code": "R0053",
        "subtype": "展开面积",
        "specs": "1242*450*H400mm 柜体外观",
        "quantity": 4.14,
        "unit": "㎡",
        "unit_price": 438,
        "total_price": 1810,
        "remarks": ""
      },
      {
        "material_name": "门铰",
        "material_code": "/",
        "subtype": "对",
        "specs": "/",
        "quantity": 4,
        "unit": "对",
        "unit_price": 20,
        "total_price": 80,
        "remarks": "不打折"
      }
    ]
  },
  {
    "order": {
      "id": "sz-hm-20250025",
      "dealer_name": "深圳虹米经销商",
      "dealer_credit_code": null,
      "territory": "shenzhen",
      "project_name": "欧洲城停车场店面样板项目",
      "order_date": "2025-09-03",
      "estimated_ship_date": "2025-09-18",
      "total_amount": 2209,
      "status": "shipped",
      "notes": "店面样板项目; 设计师: 陈雲; 业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担; 实际应付2209元，门店装修，总部支持成交金额30%"
    },
    "items": [
      {
        "material_name": "芳华I 95墙板",
        "material_code": "R0060",
        "subtype": "展开面积",
        "specs": "2880*95*10mm 单面 白色（实）",
        "quantity": 8.21,
        "unit": "㎡",
        "unit_price": 273,
        "total_price": 2241,
        "remarks": ""
      },
      {
        "material_name": "阳角线",
        "material_code": "R0060",
        "subtype": "条状",
        "specs": "3000*25*25mm 两面 白色（实）",
        "quantity": 12,
        "unit": "米",
        "unit_price": 9,
        "total_price": 109,
        "remarks": ""
      },
      {
        "material_name": "墙板龙骨",
        "material_code": "/",
        "subtype": "条状",
        "specs": "2880*50*10mm",
        "quantity": 57.6,
        "unit": "米",
        "unit_price": 14,
        "total_price": 806,
        "remarks": ""
      }
    ]
  },
  {
    "order": {
      "id": "sz-hm-20250021-increment1",
      "dealer_name": "深圳虹米经销商",
      "dealer_credit_code": null,
      "territory": "shenzhen",
      "project_name": "崇文花园17栋708项目",
      "order_date": "2025-09-18",
      "estimated_ship_date": "2025-09-30",
      "total_amount": 714,
      "status": "shipped",
      "notes": "增补1; 阳台花园项目; 设计师: 陈雲; 业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担"
    },
    "items": [
      {
        "material_name": "微风Ⅳ 微风超薄地板",
        "material_code": "R0103",
        "subtype": "展开面积",
        "specs": "1500*132*9mm 单面",
        "quantity": 1.58,
        "unit": "㎡",
        "unit_price": 451,
        "total_price": 714,
        "remarks": ""
      }
    ]
  },
  {
    "order": {
      "id": "sz-hm-20250015-increment1",
      "dealer_name": "深圳虹米经销商",
      "dealer_credit_code": null,
      "territory": "shenzhen",
      "project_name": "丹华公馆1栋904刘小姐项目",
      "order_date": "2025-08-11",
      "estimated_ship_date": "2025-08-26",
      "total_amount": 55,
      "status": "shipped",
      "notes": "增补1; 阳台花园项目; 设计师: 陈雲; 业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担"
    },
    "items": [
      {
        "material_name": "阳角线",
        "material_code": "R0049",
        "subtype": "条状",
        "specs": "3000*25*25mm 古木色（实）",
        "quantity": 6,
        "unit": "米",
        "unit_price": 9,
        "total_price": 55,
        "remarks": ""
      }
    ]
  },
  {
    "order": {
      "id": "sz-hm-20250029-increment1",
      "dealer_name": "深圳虹米经销商",
      "dealer_credit_code": null,
      "territory": "shenzhen",
      "project_name": "润科华府2A栋2901项目",
      "order_date": "2025-09-18",
      "estimated_ship_date": "2025-09-30",
      "total_amount": 1013,
      "status": "shipped",
      "notes": "增补1; 阳台花园项目; 设计师: 陈雲; 业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担"
    },
    "items": [
      {
        "material_name": "微风Ⅳ 微风超薄地板",
        "material_code": "R0002X",
        "subtype": "展开面积",
        "specs": "1500*132*9mm 单面",
        "quantity": 1.58,
        "unit": "㎡",
        "unit_price": 451,
        "total_price": 714,
        "remarks": ""
      },
      {
        "material_name": "芳华I 95墙板",
        "material_code": "R0002X",
        "subtype": "展开面积",
        "specs": "2880*95*10mm 单面",
        "quantity": 1.09,
        "unit": "㎡",
        "unit_price": 273,
        "total_price": 299,
        "remarks": ""
      }
    ]
  },
  {
    "order": {
      "id": "sz-hm-20250022-increment1",
      "dealer_name": "深圳虹米经销商",
      "dealer_credit_code": null,
      "territory": "shenzhen",
      "project_name": "越秀瑞樾府2-2903杨总项目",
      "order_date": "2025-09-19",
      "estimated_ship_date": "2025-09-30",
      "total_amount": 714,
      "status": "shipped",
      "notes": "增补1; 阳台花园项目; 设计师: 陈雲; 业务代表: 唐桂芬; 支付: 100% within 2 days; 运输: 甲方承担"
    },
    "items": [
      {
        "material_name": "微风Ⅳ 微风超薄地板",
        "material_code": "R0009X",
        "subtype": "展开面积",
        "specs": "1500*132*9mm 单面",
        "quantity": 1.58,
        "unit": "㎡",
        "unit_price": 451,
        "total_price": 714,
        "remarks": ""
      }
    ]
  }
]

const today = new Date('2025-10-07');  // Or use new Date() for dynamic

async function insertOrders() {

  for (const { order: rawOrder, items } of extractedOrders) {
    try {
      await db.transaction(async (tx) => {
        // Upsert dealer
        const existingDealer = await tx.select().from(dealers).where(eq(dealers.name, rawOrder.dealer_name));
        let dealerRecord;
        if (existingDealer.length > 0) {
          dealerRecord = existingDealer[0];
          if (dealerRecord.territory !== rawOrder.territory) {
            await tx.update(dealers).set({ territory: rawOrder.territory }).where(eq(dealers.id, dealerRecord.id));
          }
        } else {
          const newDealer = await tx.insert(dealers).values({
            name: rawOrder.dealer_name,
            territory: rawOrder.territory,
          }).returning();
          dealerRecord = newDealer[0];
        }
        const dealer = { id: dealerRecord.id };

        // No separate territory table, handled in dealer

        // Determine status based on date
        const estimatedShipDateStr = rawOrder.estimated_ship_date;
        let shipDate: Date | null = null;
        if (estimatedShipDateStr && !isNaN(Date.parse(estimatedShipDateStr))) {
          shipDate = new Date(estimatedShipDateStr);
        }
        
        let status;
        if (rawOrder.status === 'pending') {
          status = 'received';
        } else {
          status = 'delivered';
        }
        if (shipDate && shipDate < today) {
          status = 'delivered';
        } else if (shipDate && shipDate >= today) {
          status = 'received';
        }

        // Insert or update order
        const existingOrder = await tx.select().from(orders).where(eq(orders.orderNumber, rawOrder.id)).limit(1);
        const orderDate = new Date(rawOrder.order_date);
        const estimatedDelivery = shipDate ? shipDate : null;
        if (!existingOrder.length) {
          await tx.insert(orders).values({
            orderNumber: rawOrder.id,
            dealerId: dealer.id,
            status,
            items: items,
            totalValue: String(rawOrder.total_amount),
            estimatedDelivery,
            projectName: rawOrder.project_name,
            signingDate: orderDate,
            notes: rawOrder.notes,
          });
        } else {
          // Update status if existing
          await tx.update(orders).set({
            status,
            estimatedDelivery
          }).where(eq(orders.orderNumber, rawOrder.id));
        }

        // Items are stored as JSON in orders table
      });

      console.log(`Processed order '${rawOrder.id}' successfully.`);
    } catch (error) {
      console.error(`Error processing order '${rawOrder.id}':`, error);
    }
  }
}

insertOrders().catch(console.error);
