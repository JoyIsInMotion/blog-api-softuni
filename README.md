# Blog API

A full-stack blog application built with Next.js, TypeScript, React, and PostgreSQL. Features JWT authentication, CRUD operations for posts, and cover image uploads to Cloudflare R2.

## Features

### Authentication
- **User Registration** — Email + password registration with bcrypt hashing
- **User Login** — Email/password authentication returning JWT tokens
- **JWT Protection** — Secure API endpoints with token-based auth
- **User Profile** — View authenticated user information and own posts

### Blog Posts
- **Create Posts** — Publish new blog posts with title, content, optional cover image
- **Read Posts** — View all posts with pagination, or read full post detail
- **Edit Posts** — Update existing posts (owner only)
- **Delete Posts** — Remove posts with automatic R2 image cleanup
- **Cover Images** — Upload images to Cloudflare R2, displayed on cards and detail pages

### User Experience
- **Pagination** — Browse posts with page navigation (10 posts per page)
- **Loading States** — Smooth loading indicators across the app
- **Error Handling** — User-friendly error messages with retry options
- **Responsive Design** — Mobile-friendly UI built with Tailwind CSS
- **Auth-Aware UI** — Different UI for anonymous vs authenticated users

## Tech Stack

### Backend
- **Framework** — Next.js 16.2.5 with API Routes
- **Runtime** — Node.js with TypeScript (strict mode)
- **Database** — PostgreSQL via Neon with HTTP driver
- **ORM** — Drizzle ORM with migrations
- **Auth** — JWT (jsonwebtoken) + bcrypt password hashing
- **File Storage** — AWS SDK S3 client for Cloudflare R2

### Frontend
- **Framework** — React 19 + Next.js
- **Language** — TypeScript (strict mode)
- **Styling** — Tailwind CSS 4.2.4 with PostCSS
- **State Management** — React Context API + localStorage
- **Image Optimization** — Next.js Image component

### Build & Deploy
- **Build Tool** — Turbopack-based Next.js build system
- **Build Output** — Optimized static + dynamic routes

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Neon PostgreSQL database account
- Cloudflare R2 account (for image uploads)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/JoyIsInMotion/blog-api-softuni.git
   cd blog-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL=postgresql://[user]:[password]@[neon-host]/[db-name]
   
   # Authentication
   JWT_SECRET=your-secure-random-secret
   
   # Cloudflare R2
   R2_ACCESS_KEY_ID=your-r2-access-key
   R2_SECRET_ACCESS_KEY=your-r2-secret-key
   R2_URL=https://your-account-id.r2.cloudflarestorage.com
   R2_BUCKET=your-bucket-name
   R2_PUBLIC_URL=https://your-public-r2-url.com
   ```

4. **Initialize the database**
   ```bash
   npm run db:push
   ```

5. **Seed demo data (optional)**
   ```bash
   npm run db:seed
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
blog-api/
├── pages/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login.ts          # POST login endpoint
│   │   │   ├── register.ts       # POST register endpoint
│   │   │   └── me.ts             # GET authenticated user
│   │   ├── posts/
│   │   │   ├── index.ts          # GET posts (paginated), POST create
│   │   │   └── [id].ts           # GET/PATCH/DELETE post by ID
│   │   └── upload.ts             # POST/DELETE file upload to R2
│   ├── posts/
│   │   ├── [postId].tsx          # Post detail page
│   │   ├── [postId]/edit.tsx     # Edit post page
│   │   └── new.tsx               # Create post page
│   ├── _app.tsx                  # App wrapper with providers
│   ├── index.tsx                 # Homepage (paginated posts)
│   ├── login.tsx                 # Login page
│   ├── register.tsx              # Register page
│   └── profile/
│       └── index.tsx             # User profile page
├── components/
│   ├── Header.tsx                # Navigation header
│   ├── Footer.tsx                # Page footer
│   ├── Layout.tsx                # Main layout wrapper
│   ├── AuthForm.tsx              # Reusable login/register form
│   ├── PostForm.tsx              # Create/edit post form with image upload
│   ├── PostCard.tsx              # Post card component with cover image
│   ├── Pagination.tsx            # Page navigation
│   ├── LoadingState.tsx          # Loading indicator
│   ├── ErrorState.tsx            # Error message display
│   └── EmptyState.tsx            # No results message
├── context/
│   └── AuthContext.tsx           # Global auth state & methods
├── hooks/
│   └── useAuth.ts                # Custom hook for auth context
├── lib/
│   ├── blog.ts                   # Fetch utilities & HTML helpers
│   ├── s3.ts                     # Cloudflare R2 client
│   └── blog.ts                   # Type definitions
├── db/
│   ├── schema.ts                 # Drizzle schema (users, posts)
│   ├── index.ts                  # Database client initialization
│   ├── seed.ts                   # Demo data seeder
│   └── migrations/               # SQL migrations
├── types/
│   └── blog.ts                   # TypeScript type definitions
├── styles/
│   └── globals.css               # Global styles & Tailwind directives
├── config/
│   └── mcporter.json             # Drizzle config
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## API Endpoints

### Authentication

**POST /api/auth/register**
- Register a new user
- Body: `{ email: string, password: string }`
- Returns: `{ id, email, createdAt }`

**POST /api/auth/login**
- Login user and get JWT token
- Body: `{ email: string, password: string }`
- Returns: `{ token: string }`

**GET /api/auth/me**
- Get authenticated user info
- Headers: `Authorization: Bearer <token>`
- Returns: `{ id, email, createdAt }`

### Posts

**GET /api/posts**
- List all posts (paginated)
- Query: `?page=1&limit=10`
- Returns: `PostWithAuthor[]`

**POST /api/posts**
- Create a new post
- Headers: `Authorization: Bearer <token>`
- Body: `{ title: string, contentHtml: string, coverImageUrl?: string }`
- Returns: `Post`

**GET /api/posts/[id]**
- Get single post by ID
- Returns: `PostWithAuthor`

**PATCH /api/posts/[id]**
- Update post (owner only)
- Headers: `Authorization: Bearer <token>`
- Body: `{ title?: string, contentHtml?: string, coverImageUrl?: string }`
- Returns: `Post`

**DELETE /api/posts/[id]**
- Delete post (owner only, removes R2 image)
- Headers: `Authorization: Bearer <token>`
- Returns: `204 No Content`

### File Upload

**POST /api/upload**
- Upload image to Cloudflare R2
- Headers: `Authorization: Bearer <token>`
- Body: `{ file: string (base64), filename: string }`
- Returns: `{ url: string, key: string }`

**DELETE /api/upload**
- Delete image from Cloudflare R2
- Headers: `Authorization: Bearer <token>`
- Body: `{ key: string }`
- Returns: `{ success: boolean }`

## Database Schema

### Users Table
```
id (serial PK)
email (text unique)
passwordHash (text)
createdAt (timestamp)
updatedAt (timestamp)
```

### Posts Table
```
id (serial PK)
authorId (integer FK → users.id)
title (text)
contentHtml (text)
coverImageUrl (text nullable)
tags (text[] nullable)
publishedAt (timestamp nullable)
createdAt (timestamp)
updatedAt (timestamp)
```

## Development

### Available Scripts

```bash
# Start development server (Turbopack)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Seed database with demo data
npm run db:seed

# Push schema changes to database
npm run db:push

# Generate TypeScript types from schema
npm run db:generate
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://...` |
| `JWT_SECRET` | Secret key for signing JWT tokens | `your-secret` |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key | `abc123...` |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key | `xyz789...` |
| `R2_URL` | Cloudflare R2 API endpoint | `https://xxx.r2.cloudflarestorage.com` |
| `R2_BUCKET` | Cloudflare R2 bucket name | `my-blog-bucket` |
| `R2_PUBLIC_URL` | Public R2 URL for accessing images | `https://cdn.example.com` |

## Building & Deployment

### Production Build

```bash
npm run build
npm start
```

The build output includes:
- 14 optimized routes (API + pages)
- Static pre-rendered pages
- Dynamic server-rendered routes
- Zero TypeScript errors in strict mode

### Deployment Targets

This application can be deployed to:
- **Vercel** — Recommended for Next.js
- **Netlify** — With appropriate configuration
- **Self-hosted** — Any Node.js-compatible server (AWS EC2, DigitalOcean, etc.)
- **Docker** — Containerized deployment

## Demo Credentials

When seed data is populated with `npm run db:seed`:

**User 1 (Steve)**
- Email: `steve@gmail.com`
- Password: `pass123`

**User 2 (Maria)**
- Email: `maria@gmail.com`
- Password: `pass123`

Both users have sample blog posts to view and edit.

## Performance

- **TypeScript** — Strict mode ensures type safety
- **Next.js Turbopack** — Lightning-fast dev server
- **Image Optimization** — Next.js Image component with lazy loading
- **Database Queries** — Optimized with Drizzle relations
- **Pagination** — Prevents loading large datasets
- **Caching** — Browser caching via Next.js HTTP headers

## Security

- **Password Hashing** — bcrypt with 10 rounds
- **JWT Tokens** — HS256 signing, 1-hour expiration
- **HTTPS Only** — Enforced in production
- **CORS** — Configured for safe cross-origin requests
- **SQL Injection** — Protected via Drizzle ORM parameterized queries
- **File Uploads** — Type and size validation, R2 storage

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

Created with ❤️ for SoftUni
