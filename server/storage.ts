import {
  users, dealers, orders, materials, alerts, orderDocuments, orderAttachments,
  categories, products, colors, productColors, regions, productDetails, colorTypes, units,
  type User, type InsertUser, type Dealer, type InsertDealer,
  type Order, type InsertOrder, type Material, type InsertMaterial,
  type Alert, type InsertAlert, type OrderDocument, type InsertOrderDocument, type OrderAttachment, type InsertOrderAttachment,
  type Category, type InsertCategory, type Product, type InsertProduct,
  type Color, type InsertColor, type ProductColor, type InsertProductColor,
  type Region, type InsertRegion, type ProductDetail, type InsertProductDetail,
  type ColorType, type InsertColorType, type Unit, type InsertUnit
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, count, sql } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(limit?: number, offset?: number): Promise<{ items: User[], total: number }>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  updateUserRefreshTokens(id: string, tokens: any[]): Promise<void>;

  // Dealer management
  getAllDealers(limit?: number, offset?: number): Promise<{ items: Dealer[], total: number }>;
  getDealerById(id: string): Promise<Dealer | undefined>;
  createDealer(dealer: InsertDealer): Promise<Dealer>;
  updateDealer(id: string, dealer: Partial<InsertDealer>): Promise<Dealer | undefined>;
  deleteDealer(id: string): Promise<boolean>;

  // Order management
  getAllOrders(limit?: number, offset?: number): Promise<{ items: Order[], total: number }>;
  getOrderById(id: string): Promise<Order | undefined>;
  getOrdersByDealer(dealerId: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;

  // Order document management
  getOrderDocument(orderId: string): Promise<OrderDocument | undefined>;
  createOrderDocument(document: InsertOrderDocument): Promise<OrderDocument>;
  deleteOrderDocument(orderId: string): Promise<boolean>;

  // Order attachment management
  getOrderAttachments(orderId: string): Promise<OrderAttachment[]>;
  getOrderAttachment(id: string): Promise<OrderAttachment | undefined>;
  createOrderAttachment(attachment: InsertOrderAttachment): Promise<OrderAttachment>;
  deleteOrderAttachment(id: string): Promise<boolean>;

  // Material management
  getAllMaterials(limit?: number, offset?: number): Promise<{ items: Material[], total: number }>;
  getMaterialById(id: string): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: string, material: Partial<InsertMaterial>): Promise<Material | undefined>;
  deleteMaterial(id: string): Promise<boolean>;
  updateMaterialStock(id: string, newStock: number): Promise<Material | undefined>;
  getLowStockMaterials(): Promise<Material[]>;

  // Alert management
  getAllAlerts(includeResolved?: boolean, limit?: number, offset?: number): Promise<{ items: Alert[], total: number }>;
  getAlertById(id: string): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlert(id: string, alert: Partial<InsertAlert>): Promise<Alert | undefined>;
  deleteAlert(id: string): Promise<boolean>;
  resolveAlert(id: string): Promise<Alert | undefined>;
  getActiveAlerts(): Promise<Alert[]>;

  // Form options management
  getAllCategories(): Promise<{ items: Category[], total: number }>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  getAllProducts(): Promise<{ items: Product[], total: number }>;
  getProductsByCategory(categoryId: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  getAllColors(): Promise<{ items: Color[], total: number }>;
  getColorsForProduct(productId: string): Promise<Color[]>;
  createColor(color: InsertColor): Promise<Color>;
  updateColor(id: string, color: Partial<InsertColor>): Promise<Color | undefined>;
  deleteColor(id: string): Promise<boolean>;

  getAllRegions(): Promise<{ items: Region[], total: number }>;
  createRegion(region: InsertRegion): Promise<Region>;
  updateRegion(id: string, region: Partial<InsertRegion>): Promise<Region | undefined>;
  deleteRegion(id: string): Promise<boolean>;

  getAllProductDetails(): Promise<{ items: ProductDetail[], total: number }>;
  createProductDetail(productDetail: InsertProductDetail): Promise<ProductDetail>;
  updateProductDetail(id: string, productDetail: Partial<InsertProductDetail>): Promise<ProductDetail | undefined>;
  deleteProductDetail(id: string): Promise<boolean>;

  getAllColorTypes(): Promise<{ items: ColorType[], total: number }>;
  createColorType(colorType: InsertColorType): Promise<ColorType>;
  updateColorType(id: string, colorType: Partial<InsertColorType>): Promise<ColorType | undefined>;
  deleteColorType(id: string): Promise<boolean>;

  getAllUnits(): Promise<{ items: Unit[], total: number }>;
  getUnitsByCategory(categoryId: string): Promise<Unit[]>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  updateUnit(id: string, unit: Partial<InsertUnit>): Promise<Unit | undefined>;
  deleteUnit(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return user;
  }

  async updateUserRefreshTokens(id: string, tokens: any[]): Promise<void> {
    await db
      .update(users)
      .set({
        refreshTokens: tokens,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
  }

  async getAllUsers(limit?: number, offset?: number): Promise<{ items: User[], total: number }> {
    const query = db.select().from(users).orderBy(users.name);
    if (limit) query.limit(limit);
    if (offset) query.offset(offset);
    const items = await query;
    const result = await db.select({ count: count() }).from(users);
    const total = result[0].count;
    return { items, total };
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Dealer methods
  async getAllDealers(limit?: number, offset?: number): Promise<{ items: Dealer[], total: number }> {
    const query = db.select().from(dealers).where(eq(dealers.isActive, true)).orderBy(dealers.name);
    if (limit) query.limit(limit);
    if (offset) query.offset(offset);
    const items = await query;
    const result = await db.select({ count: count() }).from(dealers).where(eq(dealers.isActive, true));
    const total = result[0].count;
    return { items, total };
  }

  async getDealerById(id: string): Promise<Dealer | undefined> {
    const [dealer] = await db.select().from(dealers).where(eq(dealers.id, id));
    return dealer || undefined;
  }

  async createDealer(insertDealer: InsertDealer): Promise<Dealer> {
    const [dealer] = await db
      .insert(dealers)
      .values({
        ...insertDealer,
        createdAt: new Date()
      })
      .returning();
    return dealer;
  }

  async updateDealer(id: string, dealerData: Partial<InsertDealer>): Promise<Dealer | undefined> {
    const [dealer] = await db
      .update(dealers)
      .set(dealerData)
      .where(eq(dealers.id, id))
      .returning();
    return dealer || undefined;
  }

  async deleteDealer(id: string): Promise<boolean> {
    const [dealer] = await db
      .update(dealers)
      .set({ isActive: false })
      .where(eq(dealers.id, id))
      .returning();
    return !!dealer;
  }

  // Order methods
  async getAllOrders(limit?: number, offset?: number): Promise<{ items: any[], total: number }> {
    const query = db.select({
      id: orders.id,
      dealerId: orders.dealerId,
      orderNumber: orders.orderNumber,
      status: orders.status,
      items: orders.items,
      totalValue: orders.totalValue,
      productionLeadTime: orders.productionLeadTime,
      estimatedDelivery: orders.estimatedDelivery,
      actualDelivery: orders.actualDelivery,
      notes: orders.notes,
      projectName: orders.projectName,
      signingDate: orders.signingDate,
      designer: orders.designer,
      salesRep: orders.salesRep,
      buyerCompanyName: orders.buyerCompanyName,
      buyerAddress: orders.buyerAddress,
      buyerPhone: orders.buyerPhone,
      buyerTaxNumber: orders.buyerTaxNumber,
      contractItems: orders.contractItems,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      dealerName: dealers.name
    }).from(orders).leftJoin(dealers, eq(orders.dealerId, dealers.id)).orderBy(desc(orders.createdAt));
    if (limit) query.limit(limit);
    if (offset) query.offset(offset);
    const items = await query;
    const result = await db.select({ count: count() }).from(orders);
    const total = result[0].count;
    return { items, total };
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrdersByDealer(dealerId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.dealerId, dealerId))
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db
      .insert(orders)
      .values({
        ...insertOrder,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Update product-color usage counts
    if (insertOrder.contractItems && Array.isArray(insertOrder.contractItems)) {
      for (const item of insertOrder.contractItems as any[]) {
        if (item.productName && item.colorCode) {
          const [product] = await db.select().from(products).where(eq(products.name, item.productName));
          const [color] = await db.select().from(colors).where(eq(colors.name, item.colorCode));
          if (product && color) {
            // Check if record exists
            const [existing] = await db.select().from(productColors).where(and(eq(productColors.productId, product.id), eq(productColors.colorId, color.id)));
            if (existing) {
              // Update existing
              await db.update(productColors).set({
                usageCount: existing.usageCount + 1,
                updatedAt: new Date()
              }).where(eq(productColors.id, existing.id));
            } else {
              // Insert new
              await db.insert(productColors).values({
                productId: product.id,
                colorId: color.id,
                usageCount: 1,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          }
        }
      }
    }

    return order;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({
        status,
        actualDelivery: status === 'delivered' ? new Date() : null,
        updatedAt: new Date()
      })
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }

  async updateOrder(id: string, orderData: Partial<InsertOrder>): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({
        ...orderData,
        updatedAt: new Date()
      })
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }

  async deleteOrder(id: string): Promise<boolean> {
    const result = await db.delete(orders).where(eq(orders.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Order document methods
  async getOrderDocument(orderId: string): Promise<OrderDocument | undefined> {
    const [document] = await db
      .select()
      .from(orderDocuments)
      .where(eq(orderDocuments.orderId, orderId))
      .orderBy(desc(orderDocuments.createdAt));
    return document || undefined;
  }

  async createOrderDocument(insertDocument: InsertOrderDocument): Promise<OrderDocument> {
    const [document] = await db
      .insert(orderDocuments)
      .values({
        ...insertDocument,
        createdAt: new Date()
      })
      .returning();
    return document;
  }

  async deleteOrderDocument(orderId: string): Promise<boolean> {
    const result = await db.delete(orderDocuments).where(eq(orderDocuments.orderId, orderId));
    return (result.rowCount || 0) > 0;
  }

  // Order attachment methods
  async getOrderAttachments(orderId: string): Promise<OrderAttachment[]> {
    return await db
      .select()
      .from(orderAttachments)
      .where(eq(orderAttachments.orderId, orderId))
      .orderBy(desc(orderAttachments.uploadedAt));
  }

  async getOrderAttachment(id: string): Promise<OrderAttachment | undefined> {
    const [attachment] = await db.select().from(orderAttachments).where(eq(orderAttachments.id, id));
    return attachment || undefined;
  }

  async createOrderAttachment(insertAttachment: InsertOrderAttachment): Promise<OrderAttachment> {
    const [attachment] = await db
      .insert(orderAttachments)
      .values({
        ...insertAttachment,
        uploadedAt: new Date()
      })
      .returning();
    return attachment;
  }

  async deleteOrderAttachment(id: string): Promise<boolean> {
    const result = await db.delete(orderAttachments).where(eq(orderAttachments.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Material methods
  async getAllMaterials(limit?: number, offset?: number): Promise<{ items: Material[], total: number }> {
    const query = db.select().from(materials).orderBy(materials.category, materials.name);
    if (limit) query.limit(limit);
    if (offset) query.offset(offset);
    const items = await query;
    const result = await db.select({ count: count() }).from(materials);
    const total = result[0].count;
    return { items, total };
  }

  async getMaterialById(id: string): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    return material || undefined;
  }

  async updateMaterialStock(id: string, newStock: number): Promise<Material | undefined> {
    const [material] = await db
      .update(materials)
      .set({ 
        currentStock: newStock,
        updatedAt: new Date()
      })
      .where(eq(materials.id, id))
      .returning();
    return material || undefined;
  }

  async getLowStockMaterials(): Promise<Material[]> {
    return await db
      .select()
      .from(materials)
      .where(lte(materials.currentStock, materials.threshold));
  }

  async createMaterial(insertMaterial: InsertMaterial): Promise<Material> {
    const [material] = await db
      .insert(materials)
      .values({
        ...insertMaterial,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return material;
  }

  async updateMaterial(id: string, materialData: Partial<InsertMaterial>): Promise<Material | undefined> {
    const [material] = await db
      .update(materials)
      .set({
        ...materialData,
        updatedAt: new Date()
      })
      .where(eq(materials.id, id))
      .returning();
    return material || undefined;
  }

  async deleteMaterial(id: string): Promise<boolean> {
    const result = await db.delete(materials).where(eq(materials.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Alert methods
  async getAllAlerts(includeResolved = false, limit?: number, offset?: number): Promise<{ items: Alert[], total: number }> {
    const query = db.select().from(alerts);

    if (!includeResolved) {
      query.where(eq(alerts.resolved, false));
    }

    if (limit) query.limit(limit);
    if (offset) query.offset(offset);

    const items = await query.orderBy(desc(alerts.createdAt));

    const countQuery = db.select({ count: count() }).from(alerts);
    if (!includeResolved) {
      countQuery.where(eq(alerts.resolved, false));
    }
    const countResult = await countQuery;
    const total = countResult[0].count;

    return { items, total };
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const [alert] = await db
      .insert(alerts)
      .values({
        ...insertAlert,
        createdAt: new Date()
      })
      .returning();
    return alert;
  }

  async resolveAlert(id: string): Promise<Alert | undefined> {
    const [alert] = await db
      .update(alerts)
      .set({ 
        resolved: true,
        resolvedAt: new Date()
      })
      .where(eq(alerts.id, id))
      .returning();
    return alert || undefined;
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return await db
      .select()
      .from(alerts)
      .where(eq(alerts.resolved, false))
      .orderBy(desc(alerts.priority), desc(alerts.createdAt));
  }

  async getAlertById(id: string): Promise<Alert | undefined> {
    const [alert] = await db.select().from(alerts).where(eq(alerts.id, id));
    return alert || undefined;
  }

  async updateAlert(id: string, alertData: Partial<InsertAlert>): Promise<Alert | undefined> {
    const [alert] = await db
      .update(alerts)
      .set(alertData)
      .where(eq(alerts.id, id))
      .returning();
    return alert || undefined;
  }

  async deleteAlert(id: string): Promise<boolean> {
    const result = await db.delete(alerts).where(eq(alerts.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Form options methods
  async getAllCategories(): Promise<{ items: Category[], total: number }> {
    const items = await db.select().from(categories).orderBy(categories.name);
    const result = await db.select({ count: count() }).from(categories);
    const total = result[0].count;
    return { items, total };
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values({
        ...insertCategory,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return category;
  }

  async updateCategory(id: string, categoryData: Partial<InsertCategory>): Promise<Category | undefined> {
    const [category] = await db
      .update(categories)
      .set({
        ...categoryData,
        updatedAt: new Date()
      })
      .where(eq(categories.id, id))
      .returning();
    return category || undefined;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllProducts(): Promise<{ items: any[], total: number }> {
    const items = await db.select({
      id: products.id,
      name: products.name,
      defaultSpecification: products.defaultSpecification,
      categoryId: products.categoryId,
      category: categories,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt
    }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).orderBy(products.name);
    const result = await db.select({ count: count() }).from(products);
    const total = result[0].count;
    return { items, total };
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.categoryId, categoryId))
      .orderBy(products.name);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values({
        ...insertProduct,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return product;
  }

  async updateProduct(id: string, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({
        ...productData,
        updatedAt: new Date()
      })
      .where(eq(products.id, id))
      .returning();
    return product || undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllColors(): Promise<{ items: Color[], total: number }> {
    const items = await db.select().from(colors).orderBy(colors.name);
    const result = await db.select({ count: count() }).from(colors);
    const total = result[0].count;
    return { items, total };
  }

  async getColorsForProduct(productId: string): Promise<Color[]> {
    // Get colors ordered by usage count for this product
    const result = await db
      .select({
        id: colors.id,
        name: colors.name,
        createdAt: colors.createdAt,
        updatedAt: colors.updatedAt,
        usageCount: productColors.usageCount
      })
      .from(colors)
      .leftJoin(productColors, and(eq(colors.id, productColors.colorId), eq(productColors.productId, productId)))
      .orderBy(desc(productColors.usageCount), colors.name);
    return result;
  }

  async createColor(insertColor: InsertColor): Promise<Color> {
    const [color] = await db
      .insert(colors)
      .values({
        ...insertColor,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return color;
  }

  async updateColor(id: string, colorData: Partial<InsertColor>): Promise<Color | undefined> {
    const [color] = await db
      .update(colors)
      .set({
        ...colorData,
        updatedAt: new Date()
      })
      .where(eq(colors.id, id))
      .returning();
    return color || undefined;
  }

  async deleteColor(id: string): Promise<boolean> {
    const result = await db.delete(colors).where(eq(colors.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllRegions(): Promise<{ items: Region[], total: number }> {
    const items = await db.select().from(regions).orderBy(regions.name);
    const result = await db.select({ count: count() }).from(regions);
    const total = result[0].count;
    return { items, total };
  }

  async createRegion(insertRegion: InsertRegion): Promise<Region> {
    const [region] = await db
      .insert(regions)
      .values({
        ...insertRegion,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return region;
  }

  async updateRegion(id: string, regionData: Partial<InsertRegion>): Promise<Region | undefined> {
    const [region] = await db
      .update(regions)
      .set({
        ...regionData,
        updatedAt: new Date()
      })
      .where(eq(regions.id, id))
      .returning();
    return region || undefined;
  }

  async deleteRegion(id: string): Promise<boolean> {
    const result = await db.delete(regions).where(eq(regions.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllProductDetails(): Promise<{ items: ProductDetail[], total: number }> {
    const items = await db.select().from(productDetails).orderBy(productDetails.name);
    const result = await db.select({ count: count() }).from(productDetails);
    const total = result[0].count;
    return { items, total };
  }

  async createProductDetail(insertProductDetail: InsertProductDetail): Promise<ProductDetail> {
    const [productDetail] = await db
      .insert(productDetails)
      .values({
        ...insertProductDetail,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return productDetail;
  }

  async updateProductDetail(id: string, productDetailData: Partial<InsertProductDetail>): Promise<ProductDetail | undefined> {
    const [productDetail] = await db
      .update(productDetails)
      .set({
        ...productDetailData,
        updatedAt: new Date()
      })
      .where(eq(productDetails.id, id))
      .returning();
    return productDetail || undefined;
  }

  async deleteProductDetail(id: string): Promise<boolean> {
    const result = await db.delete(productDetails).where(eq(productDetails.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllColorTypes(): Promise<{ items: ColorType[], total: number }> {
    const items = await db.select().from(colorTypes).orderBy(colorTypes.name);
    const result = await db.select({ count: count() }).from(colorTypes);
    const total = result[0].count;
    return { items, total };
  }

  async createColorType(insertColorType: InsertColorType): Promise<ColorType> {
    const [colorType] = await db
      .insert(colorTypes)
      .values({
        ...insertColorType,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return colorType;
  }

  async updateColorType(id: string, colorTypeData: Partial<InsertColorType>): Promise<ColorType | undefined> {
    const [colorType] = await db
      .update(colorTypes)
      .set({
        ...colorTypeData,
        updatedAt: new Date()
      })
      .where(eq(colorTypes.id, id))
      .returning();
    return colorType || undefined;
  }

  async deleteColorType(id: string): Promise<boolean> {
    const result = await db.delete(colorTypes).where(eq(colorTypes.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllUnits(): Promise<{ items: Unit[], total: number }> {
    const items = await db.select().from(units).orderBy(units.name);
    const result = await db.select({ count: count() }).from(units);
    const total = result[0].count;
    return { items, total };
  }

  async getUnitsByCategory(categoryId: string): Promise<Unit[]> {
    return await db
      .select()
      .from(units)
      .where(eq(units.categoryId, categoryId))
      .orderBy(units.name);
  }

  async createUnit(insertUnit: InsertUnit): Promise<Unit> {
    const [unit] = await db
      .insert(units)
      .values({
        ...insertUnit,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return unit;
  }

  async updateUnit(id: string, unitData: Partial<InsertUnit>): Promise<Unit | undefined> {
    const [unit] = await db
      .update(units)
      .set({
        ...unitData,
        updatedAt: new Date()
      })
      .where(eq(units.id, id))
      .returning();
    return unit || undefined;
  }

  async deleteUnit(id: string): Promise<boolean> {
    const result = await db.delete(units).where(eq(units.id, id));
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new DatabaseStorage();
