import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateToken, requireAdmin } from "./middleware";
import { authRateLimit, apiRateLimit, securityHeaders, generateCsrfToken } from "./security";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeToken,
  logAuthEvent,
  hashPassword,
  comparePassword
} from "./auth";
import { loginSchema, insertUserSchema, insertDealerSchema, insertOrderSchema, insertMaterialSchema, insertAlertSchema } from "@shared/schema";
import { generateContractDOCX } from "./docx-generator";
import { convertDocxToPdf } from "./pdf-generator";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", authRateLimit, async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user || !(await comparePassword(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Store single refresh token (replace any existing ones)
      await storage.updateUserRefreshTokens(user.id, [{ token: refreshToken, expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }]);

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      logAuthEvent('LOGIN_SUCCESS', user.id, { email: user.email, role: user.role });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          theme: user.theme,
          language: user.language
        },
        accessToken
      });
    } catch (error) {
      res.status(400).json({ error: `Invalid request data. Received: ${JSON.stringify(req.body)}` });
    }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({ error: "Refresh token required" });
      }

      const payload = await verifyRefreshToken(refreshToken);
      if (!payload) {
        return res.status(403).json({ error: "Invalid refresh token" });
      }

      const user = await storage.getUser(payload.userId);
      if (!user) {
        return res.status(403).json({ error: "User not found" });
      }

      // Revoke the old refresh token
      await revokeToken(payload.jti, user.id, 'refresh', 'rotation');

      // Generate new tokens
      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      // Store new refresh token
      await storage.updateUserRefreshTokens(user.id, [{ token: newRefreshToken, expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }]);

      // Set new refresh token cookie
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      logAuthEvent('TOKEN_REFRESH', user.id);

      res.json({
        accessToken: newAccessToken
      });
    } catch (error) {
      res.status(403).json({ error: "Invalid refresh token" });
    }
  });

  app.post("/api/auth/logout", authenticateToken, async (req, res) => {
    try {
      const user = req.user!;

      // Revoke current access token
      if (user.jti) {
        await revokeToken(user.jti, user.userId, 'access', 'logout');
      }

      // Clear refresh tokens from storage
      await storage.updateUserRefreshTokens(user.userId, []);

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      logAuthEvent('LOGOUT', user.userId);

      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ error: "Logout failed" });
    }
  });

  // Protected routes - require authentication
  app.use("/api", authenticateToken);


  // User routes
  app.get("/api/user", async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        theme: user.theme,
        language: user.language
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.put("/api/user", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: "Valid name required" });
      }

      const user = await storage.updateUser(req.user!.userId, { name: name.trim() });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        theme: user.theme,
        language: user.language
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.put("/api/user/preferences", async (req, res) => {
    try {
      const { theme, language } = req.body;
      if (theme && !['light', 'dark', 'system'].includes(theme)) {
        return res.status(400).json({ error: "Invalid theme" });
      }
      if (language && !['en', 'zh'].includes(language)) {
        return res.status(400).json({ error: "Invalid language" });
      }

      const updates: any = {};
      if (theme) updates.theme = theme;
      if (language) updates.language = language;

      const user = await storage.updateUser(req.user!.userId, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        theme: user.theme,
        language: user.language
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  app.put("/api/user/password", async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword || typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword.trim() || !newPassword.trim()) {
        return res.status(400).json({ error: "Current and new passwords required" });
      }

      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!(await comparePassword(currentPassword, user.password))) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(req.user!.userId, { password: hashedPassword });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update password" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/overview", async (req, res) => {
    try {
      const orders = await storage.getAllOrders(); // Get all orders, not just 100
      const dealers = await storage.getAllDealers();
      const alerts = await storage.getActiveAlerts();
      const materials = await storage.getAllMaterials();
      const lowStockMaterials = await storage.getLowStockMaterials();

      // Calculate metrics
      const totalOrders = orders.total;
      const completedOrders = orders.items.filter(o => o.status === 'delivered').length;
      const activeOrders = orders.items.filter(o => o.status !== 'delivered').length;
      const totalRevenue = orders.items.reduce((sum, order) => sum + Number(order.totalValue), 0);
      const avgLeadTime = orders.items
        .filter(o => o.productionLeadTime)
        .reduce((sum, order, _, arr) => sum + (order.productionLeadTime || 0) / arr.length, 0);

      res.json({
        metrics: {
          totalOrders,
          completedOrders,
          activeOrders,
          totalRevenue,
          avgLeadTime: Math.round(avgLeadTime * 10) / 10,
          activeDealers: dealers.total,
          activeAlerts: alerts.length,
          lowStockItems: lowStockMaterials.length
        },
        recentOrders: orders.items.slice(0, 10),
        alerts: alerts.slice(0, 5)
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // Dealer routes
  app.get("/api/dealers", async (req, res) => {
    try {
      const dealers = await storage.getAllDealers();
      
      // Get performance data for each dealer
      const dealersWithPerformance = await Promise.all(
        dealers.items.map(async (dealer) => {
          const orders = await storage.getOrdersByDealer(dealer.id);
          const totalOrders = orders.length;
          const completedOrders = orders.filter(o => o.status === 'delivered').length;
          const revenue = orders.reduce((sum, order) => sum + Number(order.totalValue), 0);
          const onTimeDeliveries = orders.filter(o => 
            o.status === 'delivered' && 
            o.actualDelivery && 
            o.estimatedDelivery &&
            new Date(o.actualDelivery) <= new Date(o.estimatedDelivery)
          ).length;
          const onTimeRate = completedOrders > 0 ? Math.round((onTimeDeliveries / completedOrders) * 100) : 0;

          return {
            ...dealer,
            performance: {
              totalOrders,
              completedOrders,
              revenue,
              onTimeRate
            }
          };
        })
      );

      res.json(dealersWithPerformance);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dealers" });
    }
  });

  // Order routes
  app.get("/api/orders", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const orders = await storage.getAllOrders(limit);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      const dealer = order.dealerId ? await storage.getDealerById(order.dealerId) : null;
      res.json({ ...order, dealer });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.put("/api/orders/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      if (!['received', 'sentToFactory', 'inProduction', 'delivered'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const order = await storage.updateOrderStatus(req.params.id, status);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  app.post("/api/orders/preview", async (req, res) => {
    try {
      console.log('Preview request received');
      console.log('Auth header present:', !!req.headers.authorization);
      console.log('Contract data keys:', Object.keys(req.body));
      console.log('Contract number:', req.body.contractNumber);
      console.log('Items count:', req.body.items?.length || 0);

      const contractData = req.body;

      // Validate required fields
      if (!contractData.contractNumber) {
        throw new Error('Contract number is required');
      }
      if (!contractData.items || !Array.isArray(contractData.items) || contractData.items.length === 0) {
        throw new Error('At least one contract item is required');
      }

      const docxBuffer = await generateContractDOCX(contractData);
      const pdfBuffer = await convertDocxToPdf(docxBuffer);

      const base64DOCX = docxBuffer.toString('base64');
      const base64PDF = pdfBuffer.toString('base64');

      res.json({
        docxData: base64DOCX,
        pdfPreview: base64PDF,
        fileName: `${contractData.contractNumber}_contract.docx`
      });
    } catch (error) {
      console.error('DOCX/PDF preview generation error:', error);
      res.status(500).json({ error: "Failed to generate DOCX/PDF preview", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      console.log('Order creation request body:', JSON.stringify(req.body, null, 2));

      // Convert date strings to Date objects
      const processedBody = {
        ...req.body,
        signingDate: req.body.signingDate ? new Date(req.body.signingDate) : null,
        estimatedShipDate: req.body.estimatedShipDate ? new Date(req.body.estimatedShipDate) : null,
      };

      const orderData = insertOrderSchema.parse(processedBody);
      console.log('Order data after validation:', JSON.stringify(orderData, null, 2));
      const order = await storage.createOrder(orderData);

      let docxData = null;
  
      // Generate PDF if contract data is provided
      if (orderData.contractItems && Array.isArray(orderData.contractItems) && orderData.contractItems.length > 0) {
        const contractData = {
          contractNumber: orderData.orderNumber,
          projectName: orderData.projectName || '',
          signingDate: orderData.signingDate || new Date(),
          designer: orderData.designer || '',
          salesRep: orderData.salesRep || '',
          estimatedShipDate: orderData.estimatedShipDate || new Date(),
          buyerCompanyName: orderData.buyerCompanyName || '',
          buyerAddress: orderData.buyerAddress || undefined,
          buyerPhone: orderData.buyerPhone || undefined,
          buyerTaxNumber: orderData.buyerTaxNumber || undefined,
          items: orderData.contractItems as any[],
          totalAmount: Number(orderData.totalValue)
        };
  
        const docxBuffer = await generateContractDOCX(contractData);
        const base64DOCX = docxBuffer.toString('base64');
        docxData = base64DOCX;
  
        // Save DOCX to order_documents table
        await storage.createOrderDocument({
          orderId: order.id,
          documentType: 'contract',
          fileName: `${orderData.orderNumber}_contract.docx`,
          fileData: base64DOCX,
          fileSize: docxBuffer.length,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
      }
  
      res.status(201).json({ ...order, docxData });
    } catch (error) {
      console.error('Order creation error:', error);
      res.status(400).json({ error: "Invalid order data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Material/Inventory routes
  app.get("/api/materials", async (req, res) => {
    try {
      const materials = await storage.getAllMaterials();
      res.json(materials);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch materials" });
    }
  });

  app.put("/api/materials/:id/stock", async (req, res) => {
    try {
      const { stock } = req.body;
      if (typeof stock !== 'number' || stock < 0) {
        return res.status(400).json({ error: "Invalid stock value" });
      }

      const material = await storage.updateMaterialStock(req.params.id, stock);
      if (!material) {
        return res.status(404).json({ error: "Material not found" });
      }

      // Check if we need to create a low stock alert
      if (stock <= material.threshold) {
        await storage.createAlert({
          type: 'lowStock',
          title: 'Low Inventory Alert',
          message: `${material.name} is running low (${stock} ${material.unit} remaining)`,
          priority: stock <= material.threshold * 0.5 ? 'high' : 'medium',
          relatedMaterialId: material.id
        });
      }

      res.json(material);
    } catch (error) {
      res.status(500).json({ error: "Failed to update material stock" });
    }
  });

  // Alert routes
  app.get("/api/alerts", async (req, res) => {
    try {
      const includeResolved = req.query.includeResolved === 'true';
      const alerts = await storage.getAllAlerts(includeResolved);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.put("/api/alerts/:id/resolve", async (req, res) => {
    try {
      const alert = await storage.resolveAlert(req.params.id);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      res.status(500).json({ error: "Failed to resolve alert" });
    }
  });

  // Admin-only routes
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await storage.getAllUsers(limit, offset);
      res.json({ items: result.items, total: result.total });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });

      // Don't return password
      const { password, ...userResponse } = user;
      res.status(201).json(userResponse);
    } catch (error) {
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userData = req.body;
      const user = await storage.updateUser(req.params.id, userData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Don't return password
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.get("/api/admin/dealers", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await storage.getAllDealers(limit, offset);
      res.json({ items: result.items, total: result.total });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dealers" });
    }
  });

  app.post("/api/admin/dealers", requireAdmin, async (req, res) => {
    try {
      const dealerData = insertDealerSchema.parse(req.body);
      const dealer = await storage.createDealer(dealerData);
      res.status(201).json(dealer);
    } catch (error) {
      res.status(400).json({ error: "Invalid dealer data" });
    }
  });

  app.put("/api/admin/dealers/:id", requireAdmin, async (req, res) => {
    try {
      const dealerData = insertDealerSchema.partial().parse(req.body);
      const dealer = await storage.updateDealer(req.params.id, dealerData);
      if (!dealer) {
        return res.status(404).json({ error: "Dealer not found" });
      }
      res.json(dealer);
    } catch (error) {
      res.status(400).json({ error: "Invalid dealer data" });
    }
  });

  app.delete("/api/admin/dealers/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteDealer(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Dealer not found" });
      }
      res.json({ message: "Dealer deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete dealer" });
    }
  });

  app.get("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await storage.getAllOrders(limit, offset);
      res.json({ items: result.items, total: result.total });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.post("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ error: "Invalid order data" });
    }
  });

  app.put("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
      const orderData = req.body;
      const order = await storage.updateOrder(req.params.id, orderData);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(400).json({ error: "Invalid order data" });
    }
  });

  app.delete("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteOrder(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json({ message: "Order deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete order" });
    }
  });

  app.get("/api/admin/materials", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await storage.getAllMaterials(limit, offset);
      res.json({ items: result.items, total: result.total });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch materials" });
    }
  });

  app.post("/api/admin/materials", requireAdmin, async (req, res) => {
    try {
      const materialData = insertMaterialSchema.parse(req.body);
      const material = await storage.createMaterial(materialData);
      res.status(201).json(material);
    } catch (error) {
      res.status(400).json({ error: "Invalid material data" });
    }
  });

  app.put("/api/admin/materials/:id", requireAdmin, async (req, res) => {
    try {
      const materialData = req.body;
      const material = await storage.updateMaterial(req.params.id, materialData);
      if (!material) {
        return res.status(404).json({ error: "Material not found" });
      }
      res.json(material);
    } catch (error) {
      res.status(400).json({ error: "Invalid material data" });
    }
  });

  app.delete("/api/admin/materials/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteMaterial(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Material not found" });
      }
      res.json({ message: "Material deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete material" });
    }
  });

  app.get("/api/admin/alerts", requireAdmin, async (req, res) => {
    try {
      const includeResolved = req.query.includeResolved === 'true';
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await storage.getAllAlerts(includeResolved, limit, offset);
      res.json({ items: result.items, total: result.total });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/admin/alerts", requireAdmin, async (req, res) => {
    try {
      const alertData = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(alertData);
      res.status(201).json(alert);
    } catch (error) {
      res.status(400).json({ error: "Invalid alert data" });
    }
  });

  app.put("/api/admin/alerts/:id", requireAdmin, async (req, res) => {
    try {
      const alertData = req.body;
      const alert = await storage.updateAlert(req.params.id, alertData);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      res.status(400).json({ error: "Invalid alert data" });
    }
  });

  app.delete("/api/admin/alerts/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteAlert(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json({ message: "Alert deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete alert" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
