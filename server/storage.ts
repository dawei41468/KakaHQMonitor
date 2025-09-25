import {
  users, dealers, orders, materials, alerts,
  type User, type InsertUser, type Dealer, type InsertDealer,
  type Order, type InsertOrder, type Material, type InsertMaterial,
  type Alert, type InsertAlert
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, count } from "drizzle-orm";

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
  async getAllOrders(limit?: number, offset?: number): Promise<{ items: Order[], total: number }> {
    const query = db.select().from(orders).orderBy(desc(orders.createdAt));
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
    return order;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({
        status,
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
}

export const storage = new DatabaseStorage();
