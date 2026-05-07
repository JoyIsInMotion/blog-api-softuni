import { db } from './index';
import { users, posts } from './schema';
import { count } from 'drizzle-orm';

async function verify() {
  try {
    const userCount = await db.select({ count: count() }).from(users);
    const postCount = await db.select({ count: count() }).from(posts);

    console.log('📊 Database verification:');
    console.log(`   Users in database: ${userCount[0].count}`);
    console.log(`   Posts in database: ${postCount[0].count}`);

    // Show sample users
    const allUsers = await db.select().from(users);
    console.log('\n👥 Users:');
    allUsers.forEach((u) => {
      console.log(`   - ${u.email}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verify();
