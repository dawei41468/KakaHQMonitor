import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for HQ team authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("standard"), // admin | standard
  name: text("name").notNull(),
  theme: text("theme").notNull().default("system"), // light | dark | system
  language: text("language").notNull().default("en"), // en | zh
  refreshTokens: jsonb("refresh_tokens").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Dealers table for the 5 territories
export const dealers = pgTable("dealers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "Shenzhen"
  territory: text("territory").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Orders table for tracking all orders
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealerId: varchar("dealer_id").notNull().references(() => dealers.id),
  orderNumber: text("order_number").notNull().unique(), // e.g., "SZ-2024-0456"
  status: text("status").notNull().default("received"), // received | sentToFactory | inProduction | delivered
  items: jsonb("items").notNull(), // Array of {item: string, quantity: number}
  totalValue: decimal("total_value", { precision: 10, scale: 2 }).notNull(),
  productionLeadTime: integer("production_lead_time"), // days
  estimatedDelivery: timestamp("estimated_delivery"),
  actualDelivery: timestamp("actual_delivery"),
  notes: text("notes"),
  // Contract-specific fields
  projectName: text("project_name"), // 项目名称
  signingDate: timestamp("signing_date"), // 签订日期
  designer: text("designer"), // 设计师
  salesRep: text("sales_rep"), // 业务代表
  buyerCompanyName: text("buyer_company_name"), // 甲方公司名称
  buyerAddress: text("buyer_address"), // 甲方地址
  buyerPhone: text("buyer_phone"), // 甲方电话
  buyerTaxNumber: text("buyer_tax_number"), // 甲方税号
  // Detailed product line items for contract generation
  contractItems: jsonb("contract_items"), // Array of detailed product items
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Materials table for inventory tracking
export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // e.g., "Railings", "Lighting", "Flooring"
  currentStock: integer("current_stock").notNull().default(0),
  maxStock: integer("max_stock").notNull(),
  threshold: integer("threshold").notNull(), // low stock alert threshold
  unit: text("unit").notNull(), // e.g., "units", "sets", "sq ft"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Alerts table for notifications
export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // lowStock | delay | critical | info
  title: text("title").notNull(),
  message: text("message").notNull(),
  priority: text("priority").notNull().default("medium"), // high | medium | low
  resolved: boolean("resolved").notNull().default(false),
  relatedOrderId: varchar("related_order_id").references(() => orders.id),
  relatedMaterialId: varchar("related_material_id").references(() => materials.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// Order documents table for storing generated PDFs
export const orderDocuments = pgTable("order_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  documentType: text("document_type").notNull().default("contract"), // contract | invoice | etc.
  fileName: text("file_name").notNull(),
  fileData: text("file_data").notNull(), // Base64 encoded PDF data
  fileSize: integer("file_size").notNull(), // Size in bytes
  mimeType: text("mime_type").notNull().default("application/pdf"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Revoked tokens table for token blacklisting
export const revokedTokens = pgTable("revoked_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jti: varchar("jti").notNull().unique(), // JWT ID
  userId: varchar("user_id").notNull(),
  tokenType: text("token_type").notNull(), // access | refresh
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at").defaultNow().notNull(),
  reason: text("reason"), // logout | rotation | admin
});

// Relations
export const dealersRelations = relations(dealers, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  dealer: one(dealers, {
    fields: [orders.dealerId],
    references: [dealers.id],
  }),
  alerts: many(alerts),
  documents: many(orderDocuments),
}));

export const orderDocumentsRelations = relations(orderDocuments, ({ one }) => ({
  order: one(orders, {
    fields: [orderDocuments.orderId],
    references: [orders.id],
  }),
}));

export const materialsRelations = relations(materials, ({ many }) => ({
  alerts: many(alerts),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  relatedOrder: one(orders, {
    fields: [alerts.relatedOrderId],
    references: [orders.id],
  }),
  relatedMaterial: one(materials, {
    fields: [alerts.relatedMaterialId],
    references: [materials.id],
  }),
}));

export const revokedTokensRelations = relations(revokedTokens, ({}) => ({
  // No relations needed for revoked tokens
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  role: true,
});

export const insertDealerSchema = createInsertSchema(dealers).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderDocumentSchema = createInsertSchema(orderDocuments).omit({
  id: true,
  createdAt: true,
});

export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export const insertRevokedTokenSchema = createInsertSchema(revokedTokens).omit({
  id: true,
  revokedAt: true,
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Dealer = typeof dealers.$inferSelect;
export type InsertDealer = z.infer<typeof insertDealerSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderDocument = typeof orderDocuments.$inferSelect;
export type InsertOrderDocument = z.infer<typeof insertOrderDocumentSchema>;
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type RevokedToken = typeof revokedTokens.$inferSelect;
export type InsertRevokedToken = z.infer<typeof insertRevokedTokenSchema>;

// Login schema for authentication
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginRequest = z.infer<typeof loginSchema>;
