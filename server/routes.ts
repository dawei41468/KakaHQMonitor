import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateToken, requireAdmin } from "./middleware";
import { authRateLimit } from "./security";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeToken,
  logAuthEvent,
  hashPassword,
  comparePassword
} from "./auth";
import { loginSchema, insertUserSchema, insertDealerSchema, insertOrderSchema, insertMaterialSchema, insertAlertSchema, insertCategorySchema, insertProductSchema, insertColorSchema, insertRegionSchema, insertProductDetailSchema, insertColorTypeSchema, insertUnitSchema, insertOrderAttachmentSchema } from "@shared/schema";
import { generateContractDOCX } from "./docx-generator";
import { convertDocxToPdf } from "./pdf-generator";
import { checkPaymentOverdueAlerts, resolveCompletedPaymentAlerts, checkOverdueOrdersAlerts, resolveCompletedOverdueAlerts, checkStuckOrdersAlerts } from "./alert-checker";
import ExcelJS from "exceljs";

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
      await storage.updateUserRefreshTokens(user.id, [{ token: refreshToken, expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }]);

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'lax' : false,
        maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
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
      await storage.updateUserRefreshTokens(user.id, [{ token: newRefreshToken, expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }]);

      // Set new refresh token cookie
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'lax' : false,
        maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
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
  app.get("/api/dashboard/overview", async (_req, res) => {
    try {
      const orders = await storage.getAllOrders(); // Get all orders, not just 100
      const dealers = await storage.getAllDealers();
      const alerts = await storage.getActiveAlerts();
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
  app.get("/api/dealers", async (_req, res) => {
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

   app.get("/api/export-orders", async (req, res) => {
     try {
       // Build filter conditions
       const dealerFilter = req.query.dealer as string;
       const statusFilter = req.query.status as string;
       const paymentStatusFilter = req.query.paymentStatus as string;
       const signingDateFrom = req.query.signingDateFrom as string;
       const signingDateTo = req.query.signingDateTo as string;
       const sortBy = req.query.sortBy as string;
       const sortOrder = req.query.sortOrder as string;

       // Get all orders first (we'll filter in memory to match frontend logic)
       const allOrders = await storage.getAllOrders();

       let filteredOrders = allOrders.items;

       // Apply filters
       if (dealerFilter) {
         filteredOrders = filteredOrders.filter(order => order.dealerName === dealerFilter);
       }

       if (statusFilter) {
         filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
       }

       if (paymentStatusFilter) {
         filteredOrders = filteredOrders.filter(order => order.paymentStatus === paymentStatusFilter);
       }

       if (signingDateFrom || signingDateTo) {
         filteredOrders = filteredOrders.filter(order => {
           if (!order.signingDate) return false;
           const signingDate = new Date(order.signingDate);
           if (signingDateFrom && signingDate < new Date(signingDateFrom)) return false;
           if (signingDateTo && signingDate > new Date(signingDateTo)) return false;
           return true;
         });
       }

       // Apply sorting
       if (sortBy) {
         filteredOrders.sort((a, b) => {
           let aValue: any = a[sortBy as keyof typeof a];
           let bValue: any = b[sortBy as keyof typeof b];

           // Handle date fields
           if (sortBy === 'createdAt' || sortBy === 'estimatedDelivery' || sortBy === 'signingDate') {
             aValue = aValue ? new Date(aValue).getTime() : 0;
             bValue = bValue ? new Date(bValue).getTime() : 0;
           }

           // Handle numeric fields
           if (sortBy === 'totalValue') {
             aValue = Number(aValue) || 0;
             bValue = Number(bValue) || 0;
           }

           if (aValue < bValue) return sortOrder === 'desc' ? 1 : -1;
           if (aValue > bValue) return sortOrder === 'desc' ? -1 : 1;
           return 0;
         });
       }

       // Create Excel workbook
       const workbook = new ExcelJS.Workbook();
       const worksheet = workbook.addWorksheet('Orders');

       // Define columns with better widths
       worksheet.columns = [
         { header: 'Order Number', key: 'orderNumber', width: 18 },
         { header: 'Dealer', key: 'dealer', width: 25 },
         { header: 'Order Status', key: 'status', width: 18 },
         { header: 'Payment Status', key: 'paymentStatus', width: 18 },
         { header: 'Total Value', key: 'totalValue', width: 15 },
         { header: 'Signing Date', key: 'signingDate', width: 15 },
         { header: 'Estimated Delivery', key: 'estimatedDelivery', width: 20 },
         { header: 'Created At', key: 'createdAt', width: 15 }
       ];

       // Status and payment status mappings to Chinese
       const statusMap: Record<string, string> = {
         received: '已收到',
         sentToFactory: '已发工厂',
         inProduction: '生产中',
         delivered: '已交付'
       };

       const paymentStatusMap: Record<string, string> = {
         unpaid: '未付款',
         partiallyPaid: '部分付款',
         fullyPaid: '已全款'
       };

       // Add Chinese headers (row 1)
       worksheet.getCell('A1').value = '订单编号';
       worksheet.getCell('B1').value = '经销商';
       worksheet.getCell('C1').value = '订单状态';
       worksheet.getCell('D1').value = '付款状态';
       worksheet.getCell('E1').value = '总价值';
       worksheet.getCell('F1').value = '签订日期';
       worksheet.getCell('G1').value = '预计交付';
       worksheet.getCell('H1').value = '创建时间';

       // Add English headers (row 2)
       worksheet.getCell('A2').value = 'Order Number';
       worksheet.getCell('B2').value = 'Dealer';
       worksheet.getCell('C2').value = 'Order Status';
       worksheet.getCell('D2').value = 'Payment Status';
       worksheet.getCell('E2').value = 'Total Value';
       worksheet.getCell('F2').value = 'Signing Date';
       worksheet.getCell('G2').value = 'Estimated Delivery';
       worksheet.getCell('H2').value = 'Created At';

       // Style header rows
       worksheet.getRow(1).font = { bold: true };
       worksheet.getRow(1).fill = {
         type: 'pattern',
         pattern: 'solid',
         fgColor: { argb: 'FFE6E6FA' }
       };
       worksheet.getRow(2).font = { bold: true };
       worksheet.getRow(2).fill = {
         type: 'pattern',
         pattern: 'solid',
         fgColor: { argb: 'FFE6E6FA' }
       };

       // Add data rows starting from row 3
       filteredOrders.forEach((order, index) => {
         const rowNumber = index + 3;
         worksheet.getCell(`A${rowNumber}`).value = order.orderNumber;
         worksheet.getCell(`B${rowNumber}`).value = order.dealerName || 'Unknown';
         worksheet.getCell(`C${rowNumber}`).value = statusMap[order.status] || order.status;
         worksheet.getCell(`D${rowNumber}`).value = paymentStatusMap[order.paymentStatus || 'unpaid'] || order.paymentStatus;
         worksheet.getCell(`E${rowNumber}`).value = Number(order.totalValue);
         worksheet.getCell(`F${rowNumber}`).value = order.signingDate ? new Date(order.signingDate).toLocaleDateString('en-US') : 'TBD';
         worksheet.getCell(`G${rowNumber}`).value = order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString('en-US') : 'TBD';
         worksheet.getCell(`H${rowNumber}`).value = new Date(order.createdAt).toLocaleDateString('en-US');
       });

       // Format total value column as currency (CNY)
       worksheet.getColumn('E').numFmt = '¥#,##0.00';

       // Set response headers
       const fileName = `orders_export_${new Date().toISOString().split('T')[0]}.xlsx`;
       res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
       res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

       // Write to response
       await workbook.xlsx.write(res);
       res.end();

     } catch (error) {
       console.error('Export error:', error);
       res.status(500).json({ error: "Failed to export orders" });
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
      const { status, actualDelivery } = req.body;
      if (!['received', 'sentToFactory', 'inProduction', 'delivered'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const order = await storage.updateOrderStatus(req.params.id, status, actualDelivery ? new Date(actualDelivery) : undefined);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  app.put("/api/orders/:id/payment-status", async (req, res) => {
    try {
      const { paymentStatus } = req.body;
      if (!['unpaid', 'partiallyPaid', 'fullyPaid'].includes(paymentStatus)) {
        return res.status(400).json({ error: "Invalid payment status" });
      }

      const order = await storage.updateOrderPaymentStatus(req.params.id, paymentStatus);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order payment status" });
    }
  });

  app.put("/api/orders/:id", async (req, res) => {
    try {
      const { overallRetailTotal, overallDealTotal, ...rest } = req.body;
      const processedBody = {
        ...rest,
        signingDate: req.body.signingDate ? new Date(req.body.signingDate) : null,
        estimatedDelivery: req.body.estimatedDelivery ? new Date(req.body.estimatedDelivery) : null,
        ...(overallRetailTotal != null && { overallRetailTotal: overallRetailTotal.toString() }),
        ...(overallDealTotal != null && { overallDealTotal: overallDealTotal.toString() }),
      };

      const orderData = insertOrderSchema.partial().parse(processedBody);
      const order = await storage.updateOrder(req.params.id, orderData);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Regenerate DOCX if order has contract items
      if (order.contractItems && Array.isArray(order.contractItems) && order.contractItems.length > 0) {
        // Delete existing document
        await storage.deleteOrderDocument(order.id);

        // Generate new DOCX
        const contractData = {
          contractNumber: order.orderNumber,
          projectName: order.projectName || '',
          signingDate: order.signingDate || new Date(),
          designer: order.designer || '',
          salesRep: order.salesRep || '',
          estimatedDelivery: order.estimatedDelivery || new Date(),
          buyerCompanyName: order.buyerCompanyName || '',
          buyerAddress: order.buyerAddress || undefined,
          buyerPhone: order.buyerPhone || undefined,
          buyerTaxNumber: order.buyerTaxNumber || undefined,
          items: order.contractItems as any[],
          totalAmount: Number(order.totalValue),
          retailTotalAmount: order.contractItems ? (order.contractItems as any[]).reduce((sum: number, item: any) => sum + (item.retailTotal || 0), 0) : 0
        };

        const docxBuffer = await generateContractDOCX(contractData);
        const base64DOCX = docxBuffer.toString('base64');

        // Save new document
        await storage.createOrderDocument({
          orderId: order.id,
          documentType: 'contract',
          fileName: `${order.orderNumber}_contract.docx`,
          fileData: base64DOCX,
          fileSize: docxBuffer.length,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
      }

      res.json(order);
    } catch (error) {
      res.status(400).json({ error: "Invalid order data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check if user owns this order (assuming dealerId represents the user/dealer)
      // For now, allow deletion - you may want to add ownership checks later

      const success = await storage.deleteOrder(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json({ message: "Order deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete order" });
    }
  });

  app.get("/api/orders/:id/document", async (req, res) => {
    try {
      const document = await storage.getOrderDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const buffer = Buffer.from(document.fileData, 'base64');
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve document" });
    }
  });

  app.get("/api/orders/:id/attachments", async (req, res) => {
    try {
      const attachments = await storage.getOrderAttachments(req.params.id);
      res.json(attachments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attachments" });
    }
  });

  app.post("/api/orders/:id/attachments", async (req, res) => {
    try {
      const { fileName, fileData, mimeType, fileSize } = req.body;
      if (!fileName || !fileData || !mimeType || !fileSize) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const attachmentData = insertOrderAttachmentSchema.parse({
        orderId: req.params.id,
        fileName,
        fileData,
        mimeType,
        fileSize
      });

      const attachment = await storage.createOrderAttachment(attachmentData);
      res.status(201).json(attachment);
    } catch (error) {
      res.status(400).json({ error: "Invalid attachment data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/orders/:orderId/attachments/:attachmentId/download", async (req, res) => {
    try {
      const attachment = await storage.getOrderAttachment(req.params.attachmentId);
      if (!attachment || attachment.orderId !== req.params.orderId) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      const buffer = Buffer.from(attachment.fileData, 'base64');
      res.setHeader('Content-Type', attachment.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve attachment" });
    }
  });

  app.delete("/api/orders/:orderId/attachments/:attachmentId", async (req, res) => {
    try {
      const attachment = await storage.getOrderAttachment(req.params.attachmentId);
      if (!attachment || attachment.orderId !== req.params.orderId) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      const success = await storage.deleteOrderAttachment(req.params.attachmentId);
      if (!success) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      res.json({ message: "Attachment deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete attachment" });
    }
  });

  app.get("/api/orders/:id/pdf-preview", async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Construct contract data from order
      const contractData = {
        contractNumber: order.orderNumber,
        projectName: order.projectName || '',
        signingDate: order.signingDate || new Date(),
        designer: order.designer || '',
        salesRep: order.salesRep || '',
        estimatedDelivery: order.estimatedDelivery || new Date(),
        buyerCompanyName: order.buyerCompanyName || '',
        buyerAddress: order.buyerAddress || undefined,
        buyerPhone: order.buyerPhone || undefined,
        buyerTaxNumber: order.buyerTaxNumber || undefined,
        items: (order.contractItems && Array.isArray(order.contractItems) && order.contractItems.length > 0) ? order.contractItems : (Array.isArray(order.items) ? (order.items as any[]).map((item: any) => ({
          ...item,
          productName: item.item,
          quantity: item.quantity,
          unit: '个', // default
          dealPrice: 0, // not available
          dealTotal: 0,
          retailPrice: 0,
          retailTotal: 0,
          colorType: '',
          colorCode: '',
          specification: '',
          productDetail: '',
          region: '',
          category: '',
          remarks: ''
        })) : []),
        totalAmount: Number(order.totalValue),
        retailTotalAmount: order.contractItems ? (order.contractItems as any[]).reduce((sum: number, item: any) => sum + (item.retailTotal || 0), 0) : 0
      };

      const docxBuffer = await generateContractDOCX(contractData);
      const pdfBuffer = await convertDocxToPdf(docxBuffer);

      const base64PDF = pdfBuffer.toString('base64');

      res.json(base64PDF);
    } catch (error) {
      console.error('PDF preview generation error:', error);
      res.status(500).json({ error: "Failed to generate PDF preview" });
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
      const { overallRetailTotal, overallDealTotal, ...rest } = req.body;
      const processedBody = {
        ...rest,
        signingDate: req.body.signingDate ? new Date(req.body.signingDate) : null,
        estimatedDelivery: req.body.estimatedDelivery ? new Date(req.body.estimatedDelivery) : null,
        ...(overallRetailTotal != null && { overallRetailTotal: overallRetailTotal.toString() }),
        ...(overallDealTotal != null && { overallDealTotal: overallDealTotal.toString() }),
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
          estimatedDelivery: orderData.estimatedDelivery || new Date(),
          buyerCompanyName: orderData.buyerCompanyName || '',
          buyerAddress: orderData.buyerAddress || undefined,
          buyerPhone: orderData.buyerPhone || undefined,
          buyerTaxNumber: orderData.buyerTaxNumber || undefined,
          items: orderData.contractItems as any[],
          totalAmount: Number(orderData.totalValue),
          retailTotalAmount: orderData.contractItems ? (orderData.contractItems as any[]).reduce((sum: number, item: any) => sum + (item.retailTotal || 0), 0) : 0
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
  app.get("/api/materials", async (_req, res) => {
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

  app.put("/api/alerts/:id/unresolve", async (req, res) => {
    try {
      const alert = await storage.unresolveAlert(req.params.id);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      res.status(500).json({ error: "Failed to unresolve alert" });
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

  // Alert checking endpoints
  app.post("/api/admin/check-payment-alerts", requireAdmin, async (_req, res) => {
    try {
      const result = await checkPaymentOverdueAlerts();
      res.json({ message: "Payment alert check completed", ...result });
    } catch (error) {
      res.status(500).json({ error: "Failed to check payment alerts" });
    }
  });

  app.post("/api/admin/resolve-payment-alerts", requireAdmin, async (_req, res) => {
    try {
      const result = await resolveCompletedPaymentAlerts();
      res.json({ message: "Payment alert resolution completed", ...result });
    } catch (error) {
      res.status(500).json({ error: "Failed to resolve payment alerts" });
    }
  });

  app.post("/api/admin/check-overdue-alerts", requireAdmin, async (_req, res) => {
    try {
      const result = await checkOverdueOrdersAlerts();
      res.json({ message: "Overdue orders alert check completed", ...result });
    } catch (error) {
      res.status(500).json({ error: "Failed to check overdue alerts" });
    }
  });

  app.post("/api/admin/resolve-overdue-alerts", requireAdmin, async (_req, res) => {
    try {
      const result = await resolveCompletedOverdueAlerts();
      res.json({ message: "Overdue alert resolution completed", ...result });
    } catch (error) {
      res.status(500).json({ error: "Failed to resolve overdue alerts" });
    }
  });

  app.post("/api/admin/check-stuck-alerts", requireAdmin, async (_req, res) => {
    try {
      const result = await checkStuckOrdersAlerts();
      res.json({ message: "Stuck orders alert check completed", ...result });
    } catch (error) {
      res.status(500).json({ error: "Failed to check stuck alerts" });
    }
  });

  // Public form options endpoints
  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories.items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/products", async (req, res) => {
    try {
      const categoryId = req.query.categoryId as string;
      if (categoryId) {
        const products = await storage.getProductsByCategory(categoryId);
        res.json(products);
      } else {
        const products = await storage.getAllProducts();
        res.json(products.items);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/colors", async (req, res) => {
    try {
      const productId = req.query.productId as string;
      if (productId) {
        const colors = await storage.getColorsForProduct(productId);
        res.json(colors);
      } else {
        const colors = await storage.getAllColors();
        res.json(colors.items);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch colors" });
    }
  });

  app.get("/api/regions", async (_req, res) => {
    try {
      const regions = await storage.getAllRegions();
      res.json(regions.items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch regions" });
    }
  });

  app.get("/api/product-details", async (_req, res) => {
    try {
      const productDetails = await storage.getAllProductDetails();
      res.json(productDetails.items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product details" });
    }
  });

  app.get("/api/color-types", async (_req, res) => {
    try {
      const colorTypes = await storage.getAllColorTypes();
      res.json(colorTypes.items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch color types" });
    }
  });

  app.get("/api/units", async (req, res) => {
    try {
      const categoryId = req.query.categoryId as string;
      if (categoryId) {
        const units = await storage.getUnitsByCategory(categoryId);
        res.json(units);
      } else {
        const units = await storage.getAllUnits();
        res.json(units.items);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch units" });
    }
  });

  // Categories admin routes
  app.get("/api/admin/categories", requireAdmin, async (_req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/admin/categories", requireAdmin, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      res.status(400).json({ error: "Invalid category data" });
    }
  });

  app.put("/api/admin/categories/reorder", requireAdmin, async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Items array required" });
      }

      // Update order for each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await storage.updateCategory(item.id, { order: i });
      }

      res.json({ message: "Categories reordered successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder categories" });
    }
  });

  app.put("/api/admin/categories/:id", requireAdmin, async (req, res) => {
    try {
      const categoryData = req.body;
      const category = await storage.updateCategory(req.params.id, categoryData);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(400).json({ error: "Invalid category data" });
    }
  });

  app.delete("/api/admin/categories/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteCategory(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Products admin routes
  app.get("/api/admin/products", requireAdmin, async (_req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.post("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ error: "Invalid product data" });
    }
  });

  app.put("/api/admin/products/reorder", requireAdmin, async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Items array required" });
      }

      // Update order for each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await storage.updateProduct(item.id, { order: i });
      }

      res.json({ message: "Products reordered successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder products" });
    }
  });

  app.put("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      const productData = req.body;
      const product = await storage.updateProduct(req.params.id, productData);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: "Invalid product data" });
    }
  });

  app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteProduct(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Colors admin routes
  app.get("/api/admin/colors", requireAdmin, async (_req, res) => {
    try {
      const colors = await storage.getAllColors();
      res.json(colors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch colors" });
    }
  });

  app.post("/api/admin/colors", requireAdmin, async (req, res) => {
    try {
      const colorData = insertColorSchema.parse(req.body);
      const color = await storage.createColor(colorData);
      res.status(201).json(color);
    } catch (error) {
      res.status(400).json({ error: "Invalid color data" });
    }
  });

  app.put("/api/admin/colors/reorder", requireAdmin, async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Items array required" });
      }

      // Update order for each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await storage.updateColor(item.id, { order: i });
      }

      res.json({ message: "Colors reordered successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder colors" });
    }
  });

  app.put("/api/admin/colors/:id", requireAdmin, async (req, res) => {
    try {
      const colorData = req.body;
      const color = await storage.updateColor(req.params.id, colorData);
      if (!color) {
        return res.status(404).json({ error: "Color not found" });
      }
      res.json(color);
    } catch (error) {
      res.status(400).json({ error: "Invalid color data" });
    }
  });

  app.delete("/api/admin/colors/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteColor(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Color not found" });
      }
      res.json({ message: "Color deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete color" });
    }
  });

  // Regions admin routes
  app.get("/api/admin/regions", requireAdmin, async (_req, res) => {
    try {
      const regions = await storage.getAllRegions();
      res.json(regions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch regions" });
    }
  });

  app.post("/api/admin/regions", requireAdmin, async (req, res) => {
    try {
      const regionData = insertRegionSchema.parse(req.body);
      const region = await storage.createRegion(regionData);
      res.status(201).json(region);
    } catch (error) {
      res.status(400).json({ error: "Invalid region data" });
    }
  });

  app.put("/api/admin/regions/reorder", requireAdmin, async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Items array required" });
      }

      // Update order for each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await storage.updateRegion(item.id, { order: i });
      }

      res.json({ message: "Regions reordered successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder regions" });
    }
  });

  app.put("/api/admin/regions/:id", requireAdmin, async (req, res) => {
    try {
      const regionData = req.body;
      const region = await storage.updateRegion(req.params.id, regionData);
      if (!region) {
        return res.status(404).json({ error: "Region not found" });
      }
      res.json(region);
    } catch (error) {
      res.status(400).json({ error: "Invalid region data" });
    }
  });

  app.delete("/api/admin/regions/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteRegion(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Region not found" });
      }
      res.json({ message: "Region deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete region" });
    }
  });

  // Product details admin routes
  app.get("/api/admin/product-details", requireAdmin, async (_req, res) => {
    try {
      const productDetails = await storage.getAllProductDetails();
      res.json(productDetails);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product details" });
    }
  });

  app.post("/api/admin/product-details", requireAdmin, async (req, res) => {
    try {
      const productDetailData = insertProductDetailSchema.parse(req.body);
      const productDetail = await storage.createProductDetail(productDetailData);
      res.status(201).json(productDetail);
    } catch (error) {
      res.status(400).json({ error: "Invalid product detail data" });
    }
  });

  app.put("/api/admin/product-details/reorder", requireAdmin, async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Items array required" });
      }

      // Update order for each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await storage.updateProductDetail(item.id, { order: i });
      }

      res.json({ message: "Product details reordered successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder product details" });
    }
  });

  app.put("/api/admin/product-details/:id", requireAdmin, async (req, res) => {
    try {
      const productDetailData = req.body;
      const productDetail = await storage.updateProductDetail(req.params.id, productDetailData);
      if (!productDetail) {
        return res.status(404).json({ error: "Product detail not found" });
      }
      res.json(productDetail);
    } catch (error) {
      res.status(400).json({ error: "Invalid product detail data" });
    }
  });

  app.delete("/api/admin/product-details/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteProductDetail(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Product detail not found" });
      }
      res.json({ message: "Product detail deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product detail" });
    }
  });

  // Color types admin routes
  app.get("/api/admin/color-types", requireAdmin, async (_req, res) => {
    try {
      const colorTypes = await storage.getAllColorTypes();
      res.json(colorTypes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch color types" });
    }
  });

  app.post("/api/admin/color-types", requireAdmin, async (req, res) => {
    try {
      const colorTypeData = insertColorTypeSchema.parse(req.body);
      const colorType = await storage.createColorType(colorTypeData);
      res.status(201).json(colorType);
    } catch (error) {
      res.status(400).json({ error: "Invalid color type data" });
    }
  });

  app.put("/api/admin/color-types/reorder", requireAdmin, async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Items array required" });
      }

      // Update order for each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await storage.updateColorType(item.id, { order: i });
      }

      res.json({ message: "Color types reordered successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder color types" });
    }
  });

  app.put("/api/admin/color-types/:id", requireAdmin, async (req, res) => {
    try {
      const colorTypeData = req.body;
      const colorType = await storage.updateColorType(req.params.id, colorTypeData);
      if (!colorType) {
        return res.status(404).json({ error: "Color type not found" });
      }
      res.json(colorType);
    } catch (error) {
      res.status(400).json({ error: "Invalid color type data" });
    }
  });

  app.delete("/api/admin/color-types/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteColorType(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Color type not found" });
      }
      res.json({ message: "Color type deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete color type" });
    }
  });

  // Units admin routes
  app.get("/api/admin/units", requireAdmin, async (_req, res) => {
    try {
      const units = await storage.getAllUnits();
      res.json(units);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch units" });
    }
  });

  app.post("/api/admin/units", requireAdmin, async (req, res) => {
    try {
      const unitData = insertUnitSchema.parse(req.body);
      const unit = await storage.createUnit(unitData);
      res.status(201).json(unit);
    } catch (error) {
      res.status(400).json({ error: "Invalid unit data" });
    }
  });

  app.put("/api/admin/units/reorder", requireAdmin, async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Items array required" });
      }

      // Update order for each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await storage.updateUnit(item.id, { order: i });
      }

      res.json({ message: "Units reordered successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder units" });
    }
  });

  app.put("/api/admin/units/:id", requireAdmin, async (req, res) => {
    try {
      const unitData = req.body;
      const unit = await storage.updateUnit(req.params.id, unitData);
      if (!unit) {
        return res.status(404).json({ error: "Unit not found" });
      }
      res.json(unit);
    } catch (error) {
      res.status(400).json({ error: "Invalid unit data" });
    }
  });

  app.delete("/api/admin/units/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteUnit(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Unit not found" });
      }
      res.json({ message: "Unit deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete unit" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
