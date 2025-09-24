import { 
  users, dealers, orders, materials, alerts,
  type User, type InsertUser, type Dealer, type InsertDealer,
  type Order, type InsertOrder, type Material, type InsertMaterial,
  type Alert, type InsertAlert
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRefreshTokens(id: string, tokens: any[]): Promise<void>;
  
  // Dealer management
  getAllDealers(): Promise<Dealer[]>;
  getDealerById(id: string): Promise<Dealer | undefined>;
  createDealer(dealer: InsertDealer): Promise<Dealer>;
  
  // Order management
  getAllOrders(limit?: number): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | undefined>;
  getOrdersByDealer(dealerId: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  
  // Material management
  getAllMaterials(): Promise<Material[]>;
  getMaterialById(id: string): Promise<Material | undefined>;
  updateMaterialStock(id: string, newStock: number): Promise<Material | undefined>;
  getLowStockMaterials(): Promise<Material[]>;
  
  // Alert management
  getAllAlerts(includeResolved?: boolean): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
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

  // Dealer methods
  async getAllDealers(): Promise<Dealer[]> {
    return await db.select().from(dealers).orderBy(dealers.name);
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

  // Order methods
  async getAllOrders(limit = 50): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(limit);
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

  // Material methods
  async getAllMaterials(): Promise<Material[]> {
    return await db
      .select()
      .from(materials)
      .orderBy(materials.category, materials.name);
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

  // Alert methods
  async getAllAlerts(includeResolved = false): Promise<Alert[]> {
    const query = db.select().from(alerts);
    
    if (!includeResolved) {
      query.where(eq(alerts.resolved, false));
    }
    
    return await query.orderBy(desc(alerts.createdAt));
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
}

export const storage = new DatabaseStorage();
