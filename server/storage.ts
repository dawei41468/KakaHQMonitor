import {
  users, dealers, orders, materials, alerts, orderDocuments, orderAttachments,
  categories, products, colors, productColors, regions, productDetails, colorTypes, units, applicationSettings, auditLogs,
  type User, type InsertUser, type Dealer, type InsertDealer,
  type Order, type InsertOrder, type Material, type InsertMaterial,
  type Alert, type InsertAlert, type OrderDocument, type InsertOrderDocument, type OrderAttachment, type InsertOrderAttachment,
  type Category, type InsertCategory, type Product, type InsertProduct,
  type Color, type InsertColor,
  type Region, type InsertRegion, type ProductDetail, type InsertProductDetail,
  type ColorType, type InsertColorType, type Unit, type InsertUnit,
  type ApplicationSetting, type InsertApplicationSetting,
  type AuditLog, type InsertAuditLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lte, gte, count } from "drizzle-orm";
import { notificationService } from "./notifications";

// Additional types for joined queries
type ContractItem = {
  productName: string;
  colorCode: string;
  // Add other fields as needed
};

type OrderWithDealer = Omit<Order, 'overallRetailTotal' | 'overallDealTotal'> & { dealerName: string | null };

type ProductWithCategory = Product & { category: Category | null };

type AuditLogWithDisplay = {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string;
  timestamp: Date;
  oldValues: unknown | null;
  newValues: unknown | null;
  changesDiff: unknown | null;
  sessionId: string | null;
  userName: string | null;
  userEmail: string | null;
  orderNumber: string | null;
  alertTitle: string | null;
  dealerName: string | null;
  materialName: string | null;
  userDisplayName: string;
  entityDisplayName: string | null;
};

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(limit?: number, offset?: number): Promise<{ items: User[], total: number }>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  updateUserRefreshTokens(id: string, tokens: { token: string; expires: Date }[]): Promise<void>;

  // Dealer management
  getAllDealers(limit?: number, offset?: number): Promise<{ items: Dealer[], total: number }>;
  getDealerById(id: string): Promise<Dealer | undefined>;
  createDealer(dealer: InsertDealer): Promise<Dealer>;
  updateDealer(id: string, dealer: Partial<InsertDealer>): Promise<Dealer | undefined>;
  deleteDealer(id: string): Promise<boolean>;

  // Order management
  getAllOrders(limit?: number, offset?: number): Promise<{ items: OrderWithDealer[], total: number }>;
  getOrderById(id: string): Promise<Order | undefined>;
  getOrdersByDealer(dealerId: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;
  updateOrderStatus(id: string, status: string, actualDelivery?: Date): Promise<Order | undefined>;
  updateOrderPaymentStatus(id: string, paymentStatus: string): Promise<Order | undefined>;

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
  unresolveAlert(id: string): Promise<Alert | undefined>;
  getActiveAlerts(): Promise<Alert[]>;

  // Form options management
  getAllCategories(): Promise<{ items: Category[], total: number }>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  getAllProducts(): Promise<{ items: ProductWithCategory[], total: number }>;
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

  // Application settings management
  getAllApplicationSettings(): Promise<ApplicationSetting[]>;
  createApplicationSetting(setting: InsertApplicationSetting): Promise<ApplicationSetting>;
  updateApplicationSetting(key: string, value: unknown): Promise<ApplicationSetting | undefined>;

  // Audit log management
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    userEmail?: string;
    action?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: AuditLogWithDisplay[], total: number }>;
  purgeOldLogs(cutoffDate: Date): Promise<number>;
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

  async updateUserRefreshTokens(id: string, tokens: { token: string; expires: Date }[]): Promise<void> {
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

  async updateUser(id: string, userData: Partial<User>): Promise<User | undefined> {
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
  async getAllOrders(limit?: number, offset?: number): Promise<{ items: OrderWithDealer[], total: number }> {
    const query = db.select({
      id: orders.id,
      dealerId: orders.dealerId,
      orderNumber: orders.orderNumber,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
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
      for (const item of (insertOrder.contractItems as ContractItem[])) {
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

  async updateOrderStatus(id: string, status: string, actualDelivery?: Date, expectedUpdatedAt?: Date): Promise<Order | undefined> {
    return await db.transaction(async (tx) => {
      const updateData = {
        status,
        actualDelivery: status === 'delivered' ? (actualDelivery || new Date()) : null,
        updatedAt: new Date()
      };

      const conditions = [eq(orders.id, id)];
      if (expectedUpdatedAt) {
        conditions.push(eq(orders.updatedAt, expectedUpdatedAt));
      }

      const result = await tx.update(orders).set(updateData).where(and(...conditions)).returning();
      if (result.length === 0) {
        return undefined; // Indicates conflict
      }
      return result[0];
    });
  }

  async updateOrderPaymentStatus(id: string, paymentStatus: string, expectedUpdatedAt?: Date): Promise<Order | undefined> {
    return await db.transaction(async (tx) => {
      const updateData = {
        paymentStatus,
        updatedAt: new Date()
      };

      const conditions = [eq(orders.id, id)];
      if (expectedUpdatedAt) {
        conditions.push(eq(orders.updatedAt, expectedUpdatedAt));
      }

      const result = await tx.update(orders).set(updateData).where(and(...conditions)).returning();
      if (result.length === 0) {
        return undefined; // Indicates conflict
      }
      return result[0];
    });
  }

  async updateOrder(id: string, orderData: Partial<InsertOrder>, expectedUpdatedAt?: Date): Promise<Order | undefined> {
    return await db.transaction(async (tx) => {
      const updateData = {
        ...orderData,
        updatedAt: new Date()
      };

      const conditions = [eq(orders.id, id)];
      if (expectedUpdatedAt) {
        conditions.push(eq(orders.updatedAt, expectedUpdatedAt));
      }

      const result = await tx.update(orders).set(updateData).where(and(...conditions)).returning();
      if (result.length === 0) {
        return undefined; // Indicates conflict
      }
      return result[0];
    });
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

    // Send notification for high-priority alerts
    if (insertAlert.priority === 'high') {
      // Run notification asynchronously to avoid blocking alert creation
      process.nextTick(async () => {
        try {
          await notificationService.notifyAdminsOfCriticalAlert(
            insertAlert.title,
            insertAlert.message
          );
        } catch (error) {
          console.error('Failed to send alert notification:', error);
        }
      });
    }

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

  async unresolveAlert(id: string): Promise<Alert | undefined> {
    const [alert] = await db
      .update(alerts)
      .set({
        resolved: false,
        resolvedAt: null
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
    const items = await db.select().from(categories).orderBy(categories.order, categories.name);
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

  async getAllProducts(): Promise<{ items: ProductWithCategory[], total: number }> {
    const items = await db.select({
      id: products.id,
      name: products.name,
      defaultSpecification: products.defaultSpecification,
      categoryId: products.categoryId,
      order: products.order,
      category: categories,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt
    }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).orderBy(products.order, products.name);
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
    const items = await db.select().from(colors).orderBy(colors.order, colors.name);
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
        order: colors.order,
        createdAt: colors.createdAt,
        updatedAt: colors.updatedAt,
        usageCount: productColors.usageCount
      })
      .from(colors)
      .leftJoin(productColors, and(eq(colors.id, productColors.colorId), eq(productColors.productId, productId)))
      .orderBy(desc(productColors.usageCount), colors.order, colors.name);
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
    const items = await db.select().from(regions).orderBy(regions.order, regions.name);
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
    const items = await db.select().from(productDetails).orderBy(productDetails.order, productDetails.name);
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
    const items = await db.select().from(colorTypes).orderBy(colorTypes.order, colorTypes.name);
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
    const items = await db.select().from(units).orderBy(units.order, units.name);
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

  // Application settings methods
  async getAllApplicationSettings(): Promise<ApplicationSetting[]> {
    return await db.select().from(applicationSettings).orderBy(applicationSettings.key);
  }

  async createApplicationSetting(insertSetting: InsertApplicationSetting): Promise<ApplicationSetting> {
    const [setting] = await db
      .insert(applicationSettings)
      .values({
        ...insertSetting,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return setting;
  }

  async updateApplicationSetting(key: string, value: unknown): Promise<ApplicationSetting> {
    // First try to update existing setting
    const [existingSetting] = await db
      .update(applicationSettings)
      .set({
        value: value,
        updatedAt: new Date()
      })
      .where(eq(applicationSettings.key, key))
      .returning();

    if (existingSetting) {
      return existingSetting;
    }

    // If no existing setting, create new one
    const [newSetting] = await db
      .insert(applicationSettings)
      .values({
        key,
        value: value,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return newSetting;
  }

  // Audit log methods
  async createAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db
      .insert(auditLogs)
      .values(insertAuditLog)
      .returning();
    return auditLog;
  }

  async getAuditLogs(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    userEmail?: string;
    action?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: AuditLogWithDisplay[], total: number }> {
    // Build where conditions
    const whereConditions = [];
    if (filters?.dateFrom) {
      whereConditions.push(gte(auditLogs.timestamp, filters.dateFrom));
    }
    if (filters?.dateTo) {
      whereConditions.push(lte(auditLogs.timestamp, filters.dateTo));
    }
    if (filters?.userEmail) {
      whereConditions.push(eq(users.email, filters.userEmail));
    }
    if (filters?.action) {
      whereConditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters?.entityType) {
      whereConditions.push(eq(auditLogs.entityType, filters.entityType));
    }

    // Get total count - need to join with users if filtering by email
    let countQuery;
    if (filters?.userEmail) {
      // When filtering by email, we need to join with users table
      countQuery = db.select({ count: count() })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(eq(users.email, filters.userEmail));
    } else {
      countQuery = whereConditions.length > 0
        ? db.select({ count: count() }).from(auditLogs).where(and(...whereConditions))
        : db.select({ count: count() }).from(auditLogs);
    }
    const countResult = await countQuery;
    const total = countResult[0].count;

    // Get items with LEFT JOINs for display names
    const baseQuery = db.select({
      // Audit log fields
      id: auditLogs.id,
      userId: auditLogs.userId,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      ipAddress: auditLogs.ipAddress,
      timestamp: auditLogs.timestamp,
      oldValues: auditLogs.oldValues,
      newValues: auditLogs.newValues,
      changesDiff: auditLogs.changesDiff,
      sessionId: auditLogs.sessionId,
      // User display name (who performed the action)
      userName: users.name,
      userEmail: users.email,
      // Entity display names based on entityType
      orderNumber: orders.orderNumber,
      alertTitle: alerts.title,
      dealerName: dealers.name,
      materialName: materials.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .leftJoin(orders, and(eq(auditLogs.entityType, 'order'), eq(auditLogs.entityId, orders.id)))
    .leftJoin(alerts, and(eq(auditLogs.entityType, 'alert'), eq(auditLogs.entityId, alerts.id)))
    .leftJoin(dealers, and(eq(auditLogs.entityType, 'dealer'), eq(auditLogs.entityId, dealers.id)))
    .leftJoin(materials, and(eq(auditLogs.entityType, 'material'), eq(auditLogs.entityId, materials.id)))
    .orderBy(desc(auditLogs.timestamp));

    // Apply filters and pagination
    const query = whereConditions.length > 0
      ? baseQuery.where(and(...whereConditions)).limit(filters?.limit || 50).offset(filters?.offset || 0)
      : baseQuery.limit(filters?.limit || 50).offset(filters?.offset || 0);

    const items = await query;

    // Transform items to include computed display names
    const transformedItems = await Promise.all(items.map(async (item) => ({
      ...item,
      userDisplayName: item.userEmail || 'System',
      entityDisplayName: await (async () => {
        switch (item.entityType) {
          case 'order': return item.orderNumber ? `Order ${item.orderNumber}` : `Order: ${item.entityId}`;
          case 'alert': return item.alertTitle || `Alert: ${item.entityId}`;
          case 'dealer': return item.dealerName || `Dealer: ${item.entityId}`;
          case 'material': return item.materialName || `Material: ${item.entityId}`;
          case 'user':
            // For user entities, just show the email (Entity Type column already shows "user")
            if (item.entityId) {
              try {
                const entityUser = await this.getUser(item.entityId);
                return entityUser ? entityUser.email : item.entityId;
              } catch {
                return item.entityId;
              }
            }
            return item.entityId;
          default: return item.entityId ? `${item.entityType}: ${item.entityId}` : '-';
        }
      })(),
    })));

    return { items: transformedItems, total };
  }

  async purgeOldLogs(cutoffDate: Date): Promise<number> {
    const result = await db.delete(auditLogs).where(lte(auditLogs.timestamp, cutoffDate));
    return result.rowCount || 0;
  }
}

export const storage = new DatabaseStorage();
