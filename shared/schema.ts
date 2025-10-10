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
  paymentStatus: text("payment_status").notNull().default("unpaid"), // unpaid | partiallyPaid | fullyPaid
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
  overallRetailTotal: decimal("overall_retail_total", { precision: 10, scale: 2 }),
  overallDealTotal: decimal("overall_deal_total", { precision: 10, scale: 2 }),
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

// Order attachments table for user-uploaded files
export const orderAttachments = pgTable("order_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  fileName: text("file_name").notNull(),
  fileData: text("file_data").notNull(), // Base64 encoded file data
  fileSize: integer("file_size").notNull(), // Size in bytes
  mimeType: text("mime_type").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
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

// Categories table for product categorization
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Products table for order form
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  defaultSpecification: text("default_specification").notNull(),
  categoryId: varchar("category_id").references(() => categories.id),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Colors table for color options
export const colors = pgTable("colors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Product colors junction table for usage tracking
export const productColors = pgTable("product_colors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  colorId: varchar("color_id").notNull().references(() => colors.id),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  productColorUnique: sql`UNIQUE(${table.productId}, ${table.colorId})`,
}));

// Regions table
export const regions = pgTable("regions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Product details table
export const productDetails = pgTable("product_details", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Color types table
export const colorTypes = pgTable("color_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Units table
export const units = pgTable("units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  categoryId: varchar("category_id").references(() => categories.id),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  attachments: many(orderAttachments),
}));

export const orderDocumentsRelations = relations(orderDocuments, ({ one }) => ({
  order: one(orders, {
    fields: [orderDocuments.orderId],
    references: [orders.id],
  }),
}));

export const orderAttachmentsRelations = relations(orderAttachments, ({ one }) => ({
  order: one(orders, {
    fields: [orderAttachments.orderId],
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

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
  units: many(units),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  productColors: many(productColors),
}));

export const colorsRelations = relations(colors, ({ many }) => ({
  productColors: many(productColors),
}));

export const productColorsRelations = relations(productColors, ({ one }) => ({
  product: one(products, {
    fields: [productColors.productId],
    references: [products.id],
  }),
  color: one(colors, {
    fields: [productColors.colorId],
    references: [colors.id],
  }),
}));

export const regionsRelations = relations(regions, ({}) => ({
  // No relations
}));

export const productDetailsRelations = relations(productDetails, ({}) => ({
  // No relations
}));

export const colorTypesRelations = relations(colorTypes, ({}) => ({
  // No relations
}));

export const unitsRelations = relations(units, ({ one }) => ({
  category: one(categories, {
    fields: [units.categoryId],
    references: [categories.id],
  }),
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

export const insertOrderAttachmentSchema = createInsertSchema(orderAttachments).omit({
  id: true,
  uploadedAt: true,
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

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertColorSchema = createInsertSchema(colors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductColorSchema = createInsertSchema(productColors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRegionSchema = createInsertSchema(regions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductDetailSchema = createInsertSchema(productDetails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertColorTypeSchema = createInsertSchema(colorTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUnitSchema = createInsertSchema(units).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
export type OrderAttachment = typeof orderAttachments.$inferSelect;
export type InsertOrderAttachment = z.infer<typeof insertOrderAttachmentSchema>;
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type RevokedToken = typeof revokedTokens.$inferSelect;
export type InsertRevokedToken = z.infer<typeof insertRevokedTokenSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Color = typeof colors.$inferSelect;
export type InsertColor = z.infer<typeof insertColorSchema>;
export type ProductColor = typeof productColors.$inferSelect;
export type InsertProductColor = z.infer<typeof insertProductColorSchema>;
export type Region = typeof regions.$inferSelect;
export type InsertRegion = z.infer<typeof insertRegionSchema>;
export type ProductDetail = typeof productDetails.$inferSelect;
export type InsertProductDetail = z.infer<typeof insertProductDetailSchema>;
export type ColorType = typeof colorTypes.$inferSelect;
export type InsertColorType = z.infer<typeof insertColorTypeSchema>;
export type Unit = typeof units.$inferSelect;
export type InsertUnit = z.infer<typeof insertUnitSchema>;

// Login schema for authentication
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginRequest = z.infer<typeof loginSchema>;
