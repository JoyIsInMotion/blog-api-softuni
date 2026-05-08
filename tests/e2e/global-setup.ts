import { config } from 'dotenv';
import { Client } from 'pg';
import bcrypt from 'bcrypt';

config();

export default async function globalSetup() {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error('TEST_DATABASE_URL must be set for E2E tests');
  }

  const client = new Client({
    connectionString: testDatabaseUrl,
    // Neon requires SSL; skip certificate verification for test env
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    // Wipe and rebuild schema for a clean, deterministic state
    await client.query('DROP TABLE IF EXISTS posts CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');

    await client.query(`
      CREATE TABLE users (
        id            SERIAL      PRIMARY KEY,
        email         TEXT        NOT NULL UNIQUE,
        password_hash TEXT        NOT NULL,
        created_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP            DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE posts (
        id              SERIAL    PRIMARY KEY,
        author_id       INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title           TEXT      NOT NULL,
        content_html    TEXT      NOT NULL,
        cover_image_url TEXT,
        tags            TEXT[],
        published_at    TIMESTAMP,
        created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP          DEFAULT NOW()
      )
    `);

    // Two seed users — credentials match db/seed.ts
    const hash = await bcrypt.hash('pass123', 10);
    const { rows: userRows } = await client.query<{ id: number }>(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2), ($3, $4)
       RETURNING id`,
      ['steve@gmail.com', hash, 'maria@gmail.com', hash],
    );

    const steveId = userRows[0].id;
    const mariaId = userRows[1].id;

    // Seed 10 posts (> PAGE_SIZE=6) so the home page shows a full first page
    const seedPosts = [
      'Getting Started with TypeScript',
      'React Hooks Deep Dive',
      'Understanding Async Await',
      'Building Scalable APIs',
      'Database Optimization Tips',
      'Web Performance Best Practices',
      'CSS Grid vs Flexbox',
      'Node.js Clustering Explained',
      'Docker for Developers',
      'Microservices Architecture',
    ];

    for (let i = 0; i < seedPosts.length; i++) {
      const authorId = i % 2 === 0 ? steveId : mariaId;
      // Stagger published_at so ordering is deterministic (oldest first)
      await client.query(
        `INSERT INTO posts (author_id, title, content_html, published_at)
         VALUES ($1, $2, $3, NOW() - ($4 * INTERVAL '1 hour'))`,
        [authorId, seedPosts[i], `<p>Content for ${seedPosts[i]}.</p>`, seedPosts.length - i],
      );
    }
  } finally {
    await client.end();
  }
}
