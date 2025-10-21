import { config } from 'dotenv';
config();

import { db } from './db.js';
import { users, dealers } from '@shared/schema.js';
import { hashPassword } from './auth.js';
import { eq } from 'drizzle-orm';

export async function seedDatabase() {
  console.log('🌱 Seeding database...');

  try {
    // Create admin user
    const existingUser = await db.select().from(users).where(eq(users.email, 'admin@kaka-hq.com'));
    if (existingUser.length === 0) {
      const hashedPassword = await hashPassword('admin123');
      await db.insert(users).values({
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

    // Clear existing dealers to reseed fresh data
    await db.delete(dealers);
    console.log('✅ Cleared existing dealers');

    // Create dealers for the 5 territories
    const dealerData = [
      { name: '佛山', territory: '佛山', contactEmail: 'foshan@kaka.com', contactPhone: '+86-757-1234567' },
      { name: '广州芊丝软装设计有限公司', territory: '广州', contactEmail: 'guangzhou@kaka.com', contactPhone: '+86-20-1234567' },
      { name: '四川合久晟建筑科技有限公司', territory: '成都', contactEmail: 'chengdu@kaka.com', contactPhone: '+86-28-1234567' },
      { name: '杭州乔耐经销商', territory: '杭州', contactEmail: 'hangzhou@kaka.com', contactPhone: '+86-571-1234567' },
      { name: '深圳虹米经销商', territory: '深圳', contactEmail: 'shenzhen@kaka.com', contactPhone: '+86-755-1234567' }
    ];

    const _createdDealers = await db.insert(dealers).values(dealerData).returning();
    console.log('✅ Created fresh dealers');

    console.log('🎉 Database seeded successfully!');
    console.log('📧 Admin login: admin@kaka-hq.com / admin123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seed if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
}