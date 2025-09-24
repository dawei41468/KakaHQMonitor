import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateToken, requireAdmin } from "./middleware";
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  hashPassword, 
  comparePassword 
} from "./auth";
import { loginSchema, insertUserSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user || !(await comparePassword(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      
      // Store refresh token (in real app, you'd want to limit the number)
      const currentTokens = Array.isArray(user.refreshTokens) ? user.refreshTokens : [];
      await storage.updateUserRefreshTokens(user.id, [...currentTokens, { token: refreshToken, expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }]);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        accessToken,
        refreshToken
      });
    } catch (error) {
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(401).json({ error: "Refresh token required" });
      }

      const payload = verifyRefreshToken(refreshToken);
      if (!payload) {
        return res.status(403).json({ error: "Invalid refresh token" });
      }

      const user = await storage.getUser(payload.userId);
      if (!user) {
        return res.status(403).json({ error: "User not found" });
      }

      const accessToken = generateAccessToken(user);
      res.json({ accessToken });
    } catch (error) {
      res.status(403).json({ error: "Invalid refresh token" });
    }
  });

  app.post("/api/auth/logout", authenticateToken, async (req, res) => {
    try {
      // In a real app, you'd blacklist the refresh token
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ error: "Logout failed" });
    }
  });

  // Protected routes - require authentication
  app.use("/api", authenticateToken);

  // Dashboard routes
  app.get("/api/dashboard/overview", async (req, res) => {
    try {
      const orders = await storage.getAllOrders(100);
      const dealers = await storage.getAllDealers();
      const alerts = await storage.getActiveAlerts();
      const materials = await storage.getAllMaterials();
      const lowStockMaterials = await storage.getLowStockMaterials();

      // Calculate metrics
      const totalOrders = orders.length;
      const completedOrders = orders.filter(o => o.status === 'delivered').length;
      const activeOrders = orders.filter(o => o.status !== 'delivered').length;
      const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalValue), 0);
      const avgLeadTime = orders
        .filter(o => o.productionLeadTime)
        .reduce((sum, order, _, arr) => sum + (order.productionLeadTime || 0) / arr.length, 0);

      res.json({
        metrics: {
          totalOrders,
          completedOrders,
          activeOrders,
          totalRevenue,
          avgLeadTime: Math.round(avgLeadTime * 10) / 10,
          activeDealers: dealers.length,
          activeAlerts: alerts.length,
          lowStockItems: lowStockMaterials.length
        },
        recentOrders: orders.slice(0, 10),
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
        dealers.map(async (dealer) => {
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
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
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
      res.json(order);
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

  const httpServer = createServer(app);
  return httpServer;
}
