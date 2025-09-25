import { config } from 'dotenv';
config();

import { db } from './db.js';
import { users, dealers, orders, materials, alerts } from '@shared/schema.js';
import { hashPassword } from './auth.js';
import { eq, sql } from 'drizzle-orm';

export async function seedDatabase() {
  console.log('🌱 Seeding database...');

  try {
    // Create admin user
    const existingUser = await db.select().from(users).where(eq(users.email, 'admin@kaka-hq.com'));
    if (existingUser.length === 0) {
      const hashedPassword = await hashPassword('admin123');
      const [adminUser] = await db.insert(users).values({
        email: 'admin@kaka-hq.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        refreshTokens: []
      }).returning();

      console.log('✅ Created admin user');
    } else {
      console.log('✅ Admin user already exists, skipping');
    }

    // Clear existing dealers, orders and related alerts to reseed fresh data
    await db.delete(alerts).where(sql`${alerts.relatedOrderId} IS NOT NULL`);
    await db.delete(orders);
    await db.delete(dealers);
    console.log('✅ Cleared existing dealers, orders and related alerts');

    // Create dealers for the 5 territories
    const dealerData = [
      { name: '佛山', territory: '佛山', contactEmail: 'foshan@kaka.com', contactPhone: '+86-757-1234567' },
      { name: '广州', territory: '广州', contactEmail: 'guangzhou@kaka.com', contactPhone: '+86-20-1234567' },
      { name: '成都', territory: '成都', contactEmail: 'chengdu@kaka.com', contactPhone: '+86-28-1234567' },
      { name: '杭州', territory: '杭州', contactEmail: 'hangzhou@kaka.com', contactPhone: '+86-571-1234567' },
      { name: '深圳', territory: '深圳', contactEmail: 'shenzhen@kaka.com', contactPhone: '+86-755-1234567' }
    ];

    const createdDealers = await db.insert(dealers).values(dealerData).returning();
    console.log('✅ Created fresh dealers');

    // Create materials inventory
    let createdMaterials = await db.select().from(materials);
    if (createdMaterials.length === 0) {
      const materialData = [
        { name: 'Balcony Railing Material', category: 'Railings', currentStock: 12, maxStock: 100, threshold: 20, unit: 'units' },
        { name: 'Garden Lighting Components', category: 'Lighting', currentStock: 45, maxStock: 80, threshold: 15, unit: 'sets' },
        { name: 'Balcony Flooring Tiles', category: 'Flooring', currentStock: 234, maxStock: 500, threshold: 50, unit: 'sq ft' },
        { name: 'Privacy Screen Panels', category: 'Privacy', currentStock: 8, maxStock: 60, threshold: 10, unit: 'panels' },
        { name: 'Garden Upgrade Hardware', category: 'Hardware', currentStock: 67, maxStock: 120, threshold: 25, unit: 'kits' }
      ];

      createdMaterials = await db.insert(materials).values(materialData).returning();
      console.log('✅ Created materials');
    } else {
      console.log('✅ Materials already exist, skipping');
    }

    // Clear existing orders and related alerts to reseed fresh data
    await db.delete(alerts).where(sql`${alerts.relatedOrderId} IS NOT NULL`);
    await db.delete(orders);
    console.log('✅ Cleared existing orders and related alerts');

    // Create sample orders
    const baseOrderData = [
      {
        dealerId: createdDealers[0].id, // Shenzhen
        orderNumber: 'SZ-2024-0456',
        status: 'inProduction',
        items: [{ item: 'Balcony Railing Set', quantity: 3 }],
        totalValue: '45000.00',
        productionLeadTime: 14,
        estimatedDelivery: new Date('2024-09-28'),
        notes: 'High priority order'
      },
      {
        dealerId: createdDealers[1].id, // Guangzhou
        orderNumber: 'GZ-2024-0234',
        status: 'sentToFactory',
        items: [{ item: 'Garden Upgrade Kit', quantity: 2 }],
        totalValue: '32000.00',
        productionLeadTime: 12,
        estimatedDelivery: new Date('2024-09-30')
      },
      {
        dealerId: createdDealers[2].id, // Foshan
        orderNumber: 'FS-2024-0789',
        status: 'received',
        items: [{ item: 'Balcony Flooring', quantity: 5 }],
        totalValue: '28500.00',
        estimatedDelivery: new Date('2024-10-05')
      },
      {
        dealerId: createdDealers[3].id, // Hangzhou
        orderNumber: 'HZ-2024-0567',
        status: 'delivered',
        items: [{ item: 'Garden Lighting Set', quantity: 1 }],
        totalValue: '15000.00',
        productionLeadTime: 8,
        estimatedDelivery: new Date('2024-09-25'),
        actualDelivery: new Date('2024-09-24')
      },
      {
        dealerId: createdDealers[4].id, // Chengdu
        orderNumber: 'CD-2024-0123',
        status: 'inProduction',
        items: [{ item: 'Balcony Privacy Screen', quantity: 4 }],
        totalValue: '22000.00',
        productionLeadTime: 10,
        estimatedDelivery: new Date('2024-09-29')
      },
      // Additional mock orders
      {
        dealerId: createdDealers[0].id, // Shenzhen
        orderNumber: 'SZ-2024-0457',
        status: 'delivered',
        items: [{ item: 'Garden Lighting Components', quantity: 2 }],
        totalValue: '18000.00',
        productionLeadTime: 7,
        estimatedDelivery: new Date('2024-09-20'),
        actualDelivery: new Date('2024-09-19')
      },
      {
        dealerId: createdDealers[1].id, // Guangzhou
        orderNumber: 'GZ-2024-0235',
        status: 'received',
        items: [{ item: 'Balcony Railing Material', quantity: 10 }],
        totalValue: '75000.00',
        estimatedDelivery: new Date('2024-10-10')
      },
      {
        dealerId: createdDealers[2].id, // Foshan
        orderNumber: 'FS-2024-0790',
        status: 'sentToFactory',
        items: [{ item: 'Privacy Screen Panels', quantity: 6 }],
        totalValue: '36000.00',
        productionLeadTime: 9,
        estimatedDelivery: new Date('2024-10-02')
      },
      {
        dealerId: createdDealers[3].id, // Hangzhou
        orderNumber: 'HZ-2024-0568',
        status: 'inProduction',
        items: [{ item: 'Garden Upgrade Hardware', quantity: 8 }],
        totalValue: '56000.00',
        productionLeadTime: 11,
        estimatedDelivery: new Date('2024-09-27')
      },
      {
        dealerId: createdDealers[4].id, // Chengdu
        orderNumber: 'CD-2024-0124',
        status: 'delivered',
        items: [{ item: 'Balcony Flooring Tiles', quantity: 15 }],
        totalValue: '42000.00',
        productionLeadTime: 6,
        estimatedDelivery: new Date('2024-09-22'),
        actualDelivery: new Date('2024-09-21')
      },
      {
        dealerId: createdDealers[0].id, // Shenzhen
        orderNumber: 'SZ-2024-0458',
        status: 'received',
        items: [{ item: 'Privacy Screen Panels', quantity: 3 }],
        totalValue: '18000.00',
        estimatedDelivery: new Date('2024-10-15')
      },
      {
        dealerId: createdDealers[1].id, // Guangzhou
        orderNumber: 'GZ-2024-0236',
        status: 'inProduction',
        items: [{ item: 'Garden Lighting Set', quantity: 4 }],
        totalValue: '60000.00',
        productionLeadTime: 13,
        estimatedDelivery: new Date('2024-10-01')
      },
      {
        dealerId: createdDealers[2].id, // Foshan
        orderNumber: 'FS-2024-0791',
        status: 'delivered',
        items: [{ item: 'Balcony Railing Set', quantity: 2 }],
        totalValue: '30000.00',
        productionLeadTime: 10,
        estimatedDelivery: new Date('2024-09-18'),
        actualDelivery: new Date('2024-09-17')
      }
    ];

    // Generate additional orders to match mock data totals
    const additionalOrders = [];
    const statuses = ['received', 'sentToFactory', 'inProduction', 'delivered'];
    const items = [
      { item: 'Balcony Railing Set', quantity: 2, value: '30000.00' },
      { item: 'Garden Upgrade Kit', quantity: 1, value: '16000.00' },
      { item: 'Balcony Flooring', quantity: 3, value: '17100.00' },
      { item: 'Garden Lighting Set', quantity: 1, value: '15000.00' },
      { item: 'Balcony Privacy Screen', quantity: 2, value: '11000.00' }
    ];

    // Target orders per dealer (matching mock data)
    const targets = [
      { dealerIndex: 0, targetOrders: 167, current: 3 }, // Foshan
      { dealerIndex: 1, targetOrders: 198, current: 3 }, // Guangzhou
      { dealerIndex: 2, targetOrders: 123, current: 2 }, // Chengdu
      { dealerIndex: 3, targetOrders: 134, current: 2 }, // Hangzhou
      { dealerIndex: 4, targetOrders: 245, current: 3 }  // Shenzhen
    ];

    let orderCounter = 459; // Starting after existing orders

    for (const target of targets) {
      const toAdd = target.targetOrders - target.current;
      for (let i = 0; i < toAdd; i++) {
        const item = items[Math.floor(Math.random() * items.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const prefix = ['SZ', 'GZ', 'FS', 'HZ', 'CD'][target.dealerIndex];
        const orderNumber = `${prefix}-2024-${String(orderCounter++).padStart(4, '0')}`;

        const estimatedDelivery = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date within 30 days
        const order: any = {
          dealerId: createdDealers[target.dealerIndex].id,
          orderNumber,
          status,
          items: [item],
          totalValue: item.value,
          estimatedDelivery
        };

        if (status === 'delivered') {
          // Randomly make some deliveries late (matching mock onTimeRate)
          const isLate = Math.random() < 0.15; // 15% late deliveries
          if (isLate) {
            order.actualDelivery = new Date(estimatedDelivery.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000); // 0-5 days late
          } else {
            order.actualDelivery = new Date(estimatedDelivery.getTime() - Math.random() * 2 * 24 * 60 * 60 * 1000); // 0-2 days early
          }
        }

        additionalOrders.push(order);
      }
    }

    const orderData = [...baseOrderData, ...additionalOrders];

    // Insert fresh orders
    const createdOrders = await db.insert(orders).values(orderData).returning();
    console.log(`✅ Created ${createdOrders.length} fresh orders`);

    // Create alerts
    const existingAlerts = await db.select().from(alerts);
    if (existingAlerts.length === 0) {
      const alertData = [
        {
          type: 'lowStock',
          title: 'Low Inventory Alert',
          message: 'Balcony railing material running low (12 units remaining)',
          priority: 'high',
          relatedMaterialId: createdMaterials[0].id
        },
        {
          type: 'delay',
          title: 'Production Delay',
          message: 'Shenzhen order #SZ-2024-0456 delayed by 3 days',
          priority: 'medium',
          relatedOrderId: createdOrders[0].id
        },
        {
          type: 'critical',
          title: 'Quality Issue',
          message: 'Defective batch reported from Guangzhou dealer',
          priority: 'high'
        }
      ];

      await db.insert(alerts).values(alertData).returning();
      console.log('✅ Created alerts');
    } else {
      console.log('✅ Alerts already exist, skipping');
    }

    console.log('🎉 Database seeded successfully!');
    console.log('📧 Admin login: admin@kaka-hq.com / admin123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
}