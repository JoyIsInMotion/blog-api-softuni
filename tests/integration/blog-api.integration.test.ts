import { authHeaders, requestJson } from './http';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiUser {
  id: number;
  email: string;
  createdAt: string;
}

interface ApiToken {
  token: string;
}

interface ApiPost {
  id: number;
  authorId: number;
  title: string;
  contentHtml: string;
  coverImageUrl: string | null;
  tags: string[] | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface ApiPostWithAuthor extends ApiPost {
  author: { email: string };
}

// ---------------------------------------------------------------------------
// Seed constants (matches db/seed.ts)
// ---------------------------------------------------------------------------

const OWNER_EMAIL = 'steve@gmail.com';
const OWNER_PASSWORD = 'pass123';
const OTHER_EMAIL = 'maria@gmail.com';
const OTHER_PASSWORD = 'pass123';
const SEEDED_POST_TITLE = 'Getting Started with TypeScript';

function uniqueEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

// ===========================================================================
// POST /api/auth/register
// ===========================================================================

describe('POST /api/auth/register', () => {
  it('creates a user and returns id + email without passwordHash (201)', async () => {
    const email = uniqueEmail();
    const res = await requestJson<ApiUser>('/api/auth/register', {
      method: 'POST',
      body: { email, password: 'Secret#123' },
    });

    expect(res.response.status).toBe(201);
    expect(res.data?.email).toBe(email);
    expect(res.data?.id).toBeGreaterThan(0);
    expect(res.data).not.toHaveProperty('passwordHash');
  });

  it('returns 400 when email is missing', async () => {
    const res = await requestJson('/api/auth/register', {
      method: 'POST',
      body: { password: 'Secret#123' },
    });
    expect(res.response.status).toBe(400);
    expect(res.data).toMatchObject({ message: 'Email and password are required' });
  });

  it('returns 400 when password is missing', async () => {
    const res = await requestJson('/api/auth/register', {
      method: 'POST',
      body: { email: uniqueEmail() },
    });
    expect(res.response.status).toBe(400);
    expect(res.data).toMatchObject({ message: 'Email and password are required' });
  });

  it('returns 409 for a duplicate email', async () => {
    const res = await requestJson('/api/auth/register', {
      method: 'POST',
      body: { email: OWNER_EMAIL, password: 'anything' },
    });
    expect(res.response.status).toBe(409);
    expect(res.data).toMatchObject({ message: 'Email already in use' });
  });
});

// ===========================================================================
// POST /api/auth/login
// ===========================================================================

describe('POST /api/auth/login', () => {
  it('returns a JWT token on valid credentials (200)', async () => {
    const res = await requestJson<ApiToken>('/api/auth/login', {
      method: 'POST',
      body: { email: OWNER_EMAIL, password: OWNER_PASSWORD },
    });
    expect(res.response.status).toBe(200);
    expect(typeof res.data?.token).toBe('string');
    expect(res.data!.token.length).toBeGreaterThan(0);
  });

  it('returns 401 on wrong password', async () => {
    const res = await requestJson('/api/auth/login', {
      method: 'POST',
      body: { email: OWNER_EMAIL, password: 'wrongpassword' },
    });
    expect(res.response.status).toBe(401);
    expect(res.data).toMatchObject({ message: 'Invalid credentials' });
  });

  it('returns 401 for a nonexistent user', async () => {
    const res = await requestJson('/api/auth/login', {
      method: 'POST',
      body: { email: 'nobody@example.com', password: 'pass123' },
    });
    expect(res.response.status).toBe(401);
    expect(res.data).toMatchObject({ message: 'Invalid credentials' });
  });

  it('returns 400 when credentials are missing', async () => {
    const res = await requestJson('/api/auth/login', {
      method: 'POST',
      body: { email: OWNER_EMAIL },
    });
    expect(res.response.status).toBe(400);
    expect(res.data).toMatchObject({ message: 'Email and password are required' });
  });
});

// ===========================================================================
// GET /api/auth/me
// ===========================================================================

describe('GET /api/auth/me', () => {
  let ownerToken = '';

  beforeAll(async () => {
    const res = await requestJson<ApiToken>('/api/auth/login', {
      method: 'POST',
      body: { email: OWNER_EMAIL, password: OWNER_PASSWORD },
    });
    expect(res.response.status).toBe(200);
    ownerToken = res.data!.token;
  });

  it('returns the user profile for a valid token (200)', async () => {
    const res = await requestJson<ApiUser>('/api/auth/me', {
      method: 'GET',
      headers: authHeaders(ownerToken),
    });
    expect(res.response.status).toBe(200);
    expect(res.data?.email).toBe(OWNER_EMAIL);
    expect(res.data?.id).toBeGreaterThan(0);
    expect(res.data).not.toHaveProperty('passwordHash');
  });

  it('returns 401 with no Authorization header', async () => {
    const res = await requestJson('/api/auth/me', { method: 'GET' });
    expect(res.response.status).toBe(401);
    expect(res.data).toMatchObject({ message: 'Authentication required' });
  });

  it('returns 401 for a malformed JWT', async () => {
    const res = await requestJson('/api/auth/me', {
      method: 'GET',
      headers: authHeaders('not.a.valid.jwt'),
    });
    expect(res.response.status).toBe(401);
  });

  it('register → login → me flow returns consistent user data', async () => {
    const email = uniqueEmail();

    const registerRes = await requestJson<ApiUser>('/api/auth/register', {
      method: 'POST',
      body: { email, password: 'FlowTest#1' },
    });
    expect(registerRes.response.status).toBe(201);

    const loginRes = await requestJson<ApiToken>('/api/auth/login', {
      method: 'POST',
      body: { email, password: 'FlowTest#1' },
    });
    expect(loginRes.response.status).toBe(200);

    const meRes = await requestJson<ApiUser>('/api/auth/me', {
      method: 'GET',
      headers: authHeaders(loginRes.data!.token),
    });
    expect(meRes.response.status).toBe(200);
    expect(meRes.data?.email).toBe(email);
    expect(meRes.data?.id).toBe(registerRes.data?.id);
  });
});

// ===========================================================================
// Posts – shared auth setup
// ===========================================================================

describe('Posts endpoints', () => {
  let ownerToken = '';
  let otherToken = '';
  let ownerId = 0;

  beforeAll(async () => {
    const [ownerRes, otherRes] = await Promise.all([
      requestJson<ApiToken>('/api/auth/login', {
        method: 'POST',
        body: { email: OWNER_EMAIL, password: OWNER_PASSWORD },
      }),
      requestJson<ApiToken>('/api/auth/login', {
        method: 'POST',
        body: { email: OTHER_EMAIL, password: OTHER_PASSWORD },
      }),
    ]);

    expect(ownerRes.response.status).toBe(200);
    expect(otherRes.response.status).toBe(200);
    ownerToken = ownerRes.data!.token;
    otherToken = otherRes.data!.token;

    const meRes = await requestJson<ApiUser>('/api/auth/me', {
      method: 'GET',
      headers: authHeaders(ownerToken),
    });
    expect(meRes.response.status).toBe(200);
    ownerId = meRes.data!.id;
  });

  // -------------------------------------------------------------------------
  // GET /api/posts
  // -------------------------------------------------------------------------

  describe('GET /api/posts', () => {
    it('returns a list of posts (200)', async () => {
      const res = await requestJson<ApiPostWithAuthor[]>('/api/posts?page=1&limit=10', {
        method: 'GET',
      });
      expect(res.response.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data!.length).toBeGreaterThan(0);
    });

    it('each post includes author.email', async () => {
      const res = await requestJson<ApiPostWithAuthor[]>('/api/posts?page=1&limit=5', {
        method: 'GET',
      });
      expect(res.response.status).toBe(200);
      for (const post of res.data!) {
        expect(post).toHaveProperty('author');
        expect(post.author.email).toMatch(/@/);
      }
    });

    it('paginates correctly – page 2, limit 5 returns exactly 5 posts', async () => {
      const res = await requestJson<ApiPostWithAuthor[]>('/api/posts?page=2&limit=5', {
        method: 'GET',
      });
      expect(res.response.status).toBe(200);
      expect(res.data).toHaveLength(5);
    });

    it('page beyond total returns an empty array (200)', async () => {
      const res = await requestJson<ApiPostWithAuthor[]>('/api/posts?page=9999&limit=10', {
        method: 'GET',
      });
      expect(res.response.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/posts/:id
  // -------------------------------------------------------------------------

  describe('GET /api/posts/:id', () => {
    it('returns the seeded post with author info (200)', async () => {
      const listRes = await requestJson<ApiPostWithAuthor[]>('/api/posts?page=1&limit=30', {
        method: 'GET',
      });
      expect(listRes.response.status).toBe(200);

      const seededPost = listRes.data!.find((p) => p.title === SEEDED_POST_TITLE);
      expect(seededPost).toBeDefined();

      const res = await requestJson<ApiPostWithAuthor>(`/api/posts/${seededPost!.id}`, {
        method: 'GET',
      });
      expect(res.response.status).toBe(200);
      expect(res.data?.id).toBe(seededPost!.id);
      expect(res.data?.title).toBe(SEEDED_POST_TITLE);
      expect(res.data?.author.email).toBe(OWNER_EMAIL);
    });

    it('returns 404 for a nonexistent post ID', async () => {
      const res = await requestJson('/api/posts/99999999', { method: 'GET' });
      expect(res.response.status).toBe(404);
      expect(res.data).toMatchObject({ message: 'Post not found' });
    });

    it('returns 400 for a non-numeric post ID', async () => {
      const res = await requestJson('/api/posts/not-a-number', { method: 'GET' });
      expect(res.response.status).toBe(400);
      expect(res.data).toMatchObject({ message: 'Invalid post ID' });
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/posts
  // -------------------------------------------------------------------------

  describe('POST /api/posts', () => {
    it('creates a post for the authenticated user (201)', async () => {
      const res = await requestJson<ApiPost>('/api/posts', {
        method: 'POST',
        headers: authHeaders(ownerToken),
        body: { title: `New Post ${Date.now()}`, contentHtml: '<p>Hello world</p>' },
      });
      expect(res.response.status).toBe(201);
      expect(res.data!.id).toBeGreaterThan(0);
      expect(res.data!.authorId).toBe(ownerId);
      expect(res.data!.title).toContain('New Post');
    });

    it('returns 401 when no token is provided', async () => {
      const res = await requestJson('/api/posts', {
        method: 'POST',
        body: { title: 'Unauthorized post', contentHtml: '<p>x</p>' },
      });
      expect(res.response.status).toBe(401);
      expect(res.data).toMatchObject({ message: 'Authentication required' });
    });

    it('returns 401 for a malformed JWT', async () => {
      const res = await requestJson('/api/posts', {
        method: 'POST',
        headers: authHeaders('bad.token.here'),
        body: { title: 'Bad token post', contentHtml: '<p>x</p>' },
      });
      expect(res.response.status).toBe(401);
    });

    it('returns 400 when title is missing', async () => {
      const res = await requestJson('/api/posts', {
        method: 'POST',
        headers: authHeaders(ownerToken),
        body: { contentHtml: '<p>No title</p>' },
      });
      expect(res.response.status).toBe(400);
      expect(res.data).toMatchObject({ message: 'Title and content are required' });
    });

    it('returns 400 when contentHtml is missing', async () => {
      const res = await requestJson('/api/posts', {
        method: 'POST',
        headers: authHeaders(ownerToken),
        body: { title: 'No content' },
      });
      expect(res.response.status).toBe(400);
      expect(res.data).toMatchObject({ message: 'Title and content are required' });
    });
  });

  // -------------------------------------------------------------------------
  // PATCH & DELETE share a single freshly-created post
  // -------------------------------------------------------------------------

  describe('PATCH & DELETE /api/posts/:id', () => {
    let postId = 0;

    beforeAll(async () => {
      const res = await requestJson<ApiPost>('/api/posts', {
        method: 'POST',
        headers: authHeaders(ownerToken),
        body: {
          title: 'Post for edit/delete tests',
          contentHtml: '<p>Original content</p>',
        },
      });
      expect(res.response.status).toBe(201);
      postId = res.data!.id;
    });

    // -----------------------------------------------------------------------
    // PATCH /api/posts/:id
    // -----------------------------------------------------------------------

    describe('PATCH /api/posts/:id', () => {
      it('owner can update title and content (200)', async () => {
        const res = await requestJson<ApiPost>(`/api/posts/${postId}`, {
          method: 'PATCH',
          headers: authHeaders(ownerToken),
          body: { title: 'Updated Title', contentHtml: '<p>Updated content</p>' },
        });
        expect(res.response.status).toBe(200);
        expect(res.data?.title).toBe('Updated Title');
        expect(res.data?.contentHtml).toContain('Updated content');
      });

      it('returns 401 without a token', async () => {
        const res = await requestJson(`/api/posts/${postId}`, {
          method: 'PATCH',
          body: { title: 'No auth edit' },
        });
        expect(res.response.status).toBe(401);
        expect(res.data).toMatchObject({ message: 'Authentication required' });
      });

      it('returns 403 when authenticated as a non-owner', async () => {
        const res = await requestJson(`/api/posts/${postId}`, {
          method: 'PATCH',
          headers: authHeaders(otherToken),
          body: { title: 'Forbidden edit' },
        });
        expect(res.response.status).toBe(403);
        expect(res.data).toMatchObject({ message: 'You are not authorized to edit this post' });
      });

      it('returns 404 for a nonexistent post', async () => {
        const res = await requestJson('/api/posts/99999999', {
          method: 'PATCH',
          headers: authHeaders(ownerToken),
          body: { title: 'Ghost post edit' },
        });
        expect(res.response.status).toBe(404);
        expect(res.data).toMatchObject({ message: 'Post not found' });
      });
    });

    // -----------------------------------------------------------------------
    // DELETE /api/posts/:id
    // -----------------------------------------------------------------------

    describe('DELETE /api/posts/:id', () => {
      it('returns 401 without a token', async () => {
        const res = await requestJson(`/api/posts/${postId}`, { method: 'DELETE' });
        expect(res.response.status).toBe(401);
        expect(res.data).toMatchObject({ message: 'Authentication required' });
      });

      it('returns 403 when authenticated as a non-owner', async () => {
        const res = await requestJson(`/api/posts/${postId}`, {
          method: 'DELETE',
          headers: authHeaders(otherToken),
        });
        expect(res.response.status).toBe(403);
        expect(res.data).toMatchObject({ message: 'You are not authorized to delete this post' });
      });

      it('returns 404 for a nonexistent post', async () => {
        const res = await requestJson('/api/posts/99999999', {
          method: 'DELETE',
          headers: authHeaders(ownerToken),
        });
        expect(res.response.status).toBe(404);
        expect(res.data).toMatchObject({ message: 'Post not found' });
      });

      it('owner deletes the post (204) and it becomes unfindable (404)', async () => {
        const deleteRes = await requestJson(`/api/posts/${postId}`, {
          method: 'DELETE',
          headers: authHeaders(ownerToken),
        });
        expect(deleteRes.response.status).toBe(204);
        expect(deleteRes.text).toBe('');

        const viewRes = await requestJson(`/api/posts/${postId}`, { method: 'GET' });
        expect(viewRes.response.status).toBe(404);
        expect(viewRes.data).toMatchObject({ message: 'Post not found' });
      });
    });
  });
});
