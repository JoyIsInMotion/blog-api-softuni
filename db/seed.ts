import { db } from './index';
import { users, posts } from './schema';
import bcrypt from 'bcrypt';

const blogPostTitles = [
  'Getting Started with TypeScript',
  'React Hooks: A Deep Dive',
  'Understanding Async/Await',
  'Building Scalable APIs',
  'Database Optimization Tips',
  'Web Performance Best Practices',
  'CSS Grid vs Flexbox',
  'Node.js Clustering Explained',
  'Docker for Developers',
  'Microservices Architecture',
  'GraphQL vs REST',
  'Testing Strategies in JavaScript',
  'Security in Web Applications',
  'Machine Learning with JavaScript',
  'Serverless Computing on AWS',
  'React Server Components',
  'Next.js 13 App Router',
  'Zustand State Management',
  'TailwindCSS Advanced Patterns',
  'Vue 3 Composition API',
  'Angular Dependency Injection',
  'Svelte Reactive Statements',
  'Rust for Web Development',
  'WebAssembly Performance Tips',
  'Progressive Web Apps',
  'Accessibility in Web Design',
  'Responsive Design Techniques',
  'API Rate Limiting Strategies',
  'Caching Strategies for APIs',
  'Monitoring and Logging Best Practices',
];

const blogContent = [
  'TypeScript has revolutionized the way developers write JavaScript. In this comprehensive guide, we explore the fundamentals of static typing and how it improves code quality. Learn about interfaces, generics, and advanced type definitions that make your code more maintainable and bug-free.',
  'React Hooks changed the game for functional components. Discover how useState, useEffect, and custom hooks work together to manage state and side effects elegantly. We\'ll explore patterns and best practices for writing clean, reusable hook logic.',
  'Async/await syntax makes asynchronous code look synchronous and easy to understand. Learn how to handle promises, error handling with try/catch, and common pitfalls. Master the art of writing non-blocking code that scales.',
  'Designing APIs that can grow with your business requires careful planning. From RESTful principles to proper error handling, learn the patterns and practices that make APIs reliable and user-friendly.',
  'Database queries are often the bottleneck in applications. Explore indexing strategies, query optimization, and caching techniques to make your database lightning fast.',
  'Performance directly impacts user experience and SEO rankings. Learn about lazy loading, code splitting, image optimization, and critical rendering paths to build faster websites.',
  'CSS Grid and Flexbox are powerful layout tools. Understand when to use each, their strengths and weaknesses, and how to combine them for complex layouts.',
  'Node.js clustering allows you to utilize all CPU cores on your server. Learn how to spawn worker processes and balance load across them for maximum performance.',
  'Docker containerization simplifies development and deployment. Get started with Docker concepts, building images, and running containers in your workflow.',
  'Microservices break monolithic applications into smaller, manageable services. Explore the benefits, challenges, and strategies for implementing microservices architecture.',
  'GraphQL provides a flexible alternative to REST APIs. Learn how to define schemas, write queries, and build subscriptions with Apollo or similar frameworks.',
  'Testing is crucial for reliability. From unit tests to integration tests, explore Jest, Vitest, and testing libraries that ensure your code works as expected.',
  'Security vulnerabilities can expose user data. Learn about OWASP Top 10, input validation, CORS, CSP, and other security practices.',
  'Machine learning isn\'t just for Python. TensorFlow.js brings ML capabilities to JavaScript. Build neural networks and train models in the browser.',
  'Serverless computing removes infrastructure management. Learn about Lambda functions, API Gateway, and building scalable applications without managing servers.',
  'React Server Components blur the line between client and server. Explore how they improve performance and simplify data fetching.',
  'Next.js 13 App Router provides a new way to structure applications. Learn about layouts, server components, and file-based routing.',
  'Zustand is a lightweight state management solution. Discover how to manage complex state without the boilerplate of Redux or Zustand middleware.',
  'TailwindCSS utility-first approach speeds up development. Master advanced patterns like dark mode, responsive design, and custom configurations.',
  'Vue 3 Composition API offers flexibility similar to React Hooks. Learn to organize code logically and share composition functions.',
  'Angular Dependency Injection is powerful but complex. Understand providers, services, and how to structure large-scale applications.',
  'Svelte\'s reactive statements eliminate boilerplate. Explore how Svelte compiles away and offers better performance than traditional frameworks.',
  'Rust compiles to WebAssembly, offering near-native performance in the browser. Learn about Rust syntax and building performant web applications.',
  'WebAssembly brings native performance to web browsers. Explore use cases, tooling, and how to integrate Wasm modules in your projects.',
  'Progressive Web Apps work offline and load instantly. Learn about service workers, web manifests, and building app-like experiences on the web.',
  'Web accessibility ensures everyone can use your site. Understand ARIA attributes, semantic HTML, keyboard navigation, and screen reader compatibility.',
  'Responsive design adapts to different screen sizes. Master media queries, mobile-first approaches, and flexible layouts that work everywhere.',
  'API rate limiting protects your service from abuse. Explore token bucket algorithms, sliding windows, and implementing rate limits effectively.',
  'Caching strategies like LRU, TTL, and write-through improve application performance. Learn when and how to implement each strategy.',
  'Monitoring and logging provide visibility into your applications. Discover tools and practices for debugging, performance monitoring, and error tracking.',
];

const allTags = [
  'JavaScript',
  'TypeScript',
  'React',
  'Vue',
  'Angular',
  'Node.js',
  'Web Development',
  'Backend',
  'Frontend',
  'DevOps',
  'API',
  'Database',
  'Performance',
  'Security',
  'Testing',
  'CSS',
  'HTML',
  'Docker',
  'AWS',
  'GraphQL',
];

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // Hash password
    const passwordHash = await bcrypt.hash('pass123', 10);

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = await db
      .insert(users)
      .values([
        {
          email: 'steve@gmail.com',
          passwordHash,
        },
        {
          email: 'maria@gmail.com',
          passwordHash,
        },
      ])
      .returning();

    console.log(`✓ Created ${createdUsers.length} users`);

    // Create blog posts
    console.log('📝 Creating blog posts...');
    const postsData = [];

    for (let i = 0; i < 30; i++) {
      const authorId = createdUsers[i % 2].id; // Alternate between users
      const tags = [];

      // Randomly select 2-4 tags
      const tagCount = Math.floor(Math.random() * 3) + 2; // 2-4
      const selectedIndices = new Set<number>();
      while (selectedIndices.size < tagCount) {
        selectedIndices.add(Math.floor(Math.random() * allTags.length));
      }
      for (const idx of selectedIndices) {
        tags.push(allTags[idx]);
      }

      postsData.push({
        authorId,
        title: blogPostTitles[i],
        contentHtml: `<p>${blogContent[i]}</p>`,
        tags,
        publishedAt: new Date(
          Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000
        ), // Random date in last 90 days
      });
    }

    const createdPosts = await db.insert(posts).values(postsData).returning();

    console.log(`✓ Created ${createdPosts.length} blog posts`);

    console.log('✅ Database seeding complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Users: ${createdUsers.length}`);
    console.log(`   - Posts: ${createdPosts.length}`);
    console.log(
      `\n🔐 Test credentials:\n   steve@gmail.com / pass123\n   maria@gmail.com / pass123`
    );

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
