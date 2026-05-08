import postsHandler from '../../pages/api/posts/index';
import postByIdHandler from '../../pages/api/posts/[id]';
import { createMockReq, createMockRes } from '../helpers/http';

jest.mock('@/db', () => ({
  db: {
    query: {
      posts: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    },
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: jest.fn(),
    JsonWebTokenError: class MockJsonWebTokenError extends Error {},
  },
}));
jest.mock('@/lib/s3', () => ({
  deleteFromR2: jest.fn(),
}));

const mockDb = require('@/db').db as {
  query: {
    posts: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};
const mockJwt = require('jsonwebtoken').default as {
  verify: jest.Mock;
  JsonWebTokenError: new (...args: any[]) => Error;
};
const mockDeleteFromR2 = require('@/lib/s3').deleteFromR2 as jest.Mock;

const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

function mockPostInsert(post: Record<string, unknown>) {
  const returning = jest.fn().mockResolvedValue([post]);
  const values = jest.fn().mockReturnValue({ returning });

  mockDb.insert.mockReturnValue({ values });

  return { values, returning };
}

function mockPostUpdate(post: Record<string, unknown>) {
  const returning = jest.fn().mockResolvedValue([post]);
  const where = jest.fn().mockReturnValue({ returning });
  const set = jest.fn().mockReturnValue({ where });

  mockDb.update.mockReturnValue({ set });

  return { set, where, returning };
}

function mockPostDelete() {
  const where = jest.fn().mockResolvedValue(undefined);

  mockDb.delete.mockReturnValue({ where });

  return where;
}

describe('posts API routes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('posts index handler', () => {
    it('returns 405 for unsupported methods', async () => {
      const req = createMockReq({ method: 'PUT' });
      const res = createMockRes();

      await postsHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
    });

    it('returns the requested page of posts', async () => {
      mockDb.query.posts.findMany.mockResolvedValue([
        {
          id: 1,
          title: 'Hello world',
          contentHtml: '<p>Body</p>',
          author: { email: 'author@example.com' },
        },
      ]);

      const req = createMockReq({
        method: 'GET',
        query: { page: '2', limit: '5' },
      });
      const res = createMockRes();

      await postsHandler(req, res);

      expect(mockDb.query.posts.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5, offset: 5 })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        {
          id: 1,
          title: 'Hello world',
          contentHtml: '<p>Body</p>',
          author: { email: 'author@example.com' },
        },
      ]);
    });

    it('returns 500 when loading posts fails', async () => {
      mockDb.query.posts.findMany.mockRejectedValue(new Error('query failed'));

      const req = createMockReq({ method: 'GET' });
      const res = createMockRes();

      await postsHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
    });

    it('creates a post for an authenticated user', async () => {
      mockJwt.verify.mockReturnValue({ userId: 9 });
      mockPostInsert({
        id: 11,
        authorId: 9,
        title: 'New post',
        contentHtml: '<p>Content</p>',
        coverImageUrl: 'https://cdn.example.com/cover.jpg',
      });

      const req = createMockReq({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          title: 'New post',
          contentHtml: '<p>Content</p>',
          coverImageUrl: 'https://cdn.example.com/cover.jpg',
        },
      });
      const res = createMockRes();

      await postsHandler(req, res);

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', 'test-jwt-secret');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: 11,
        authorId: 9,
        title: 'New post',
        contentHtml: '<p>Content</p>',
        coverImageUrl: 'https://cdn.example.com/cover.jpg',
      });
    });

    it('rejects unauthenticated create requests', async () => {
      const req = createMockReq({
        method: 'POST',
        body: { title: 'New post', contentHtml: '<p>Content</p>' },
      });
      const res = createMockRes();

      await postsHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
    });

    it('rejects create requests with invalid JWTs', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new mockJwt.JsonWebTokenError('invalid token');
      });

      const req = createMockReq({
        method: 'POST',
        headers: { authorization: 'Bearer invalid-token' },
        body: { title: 'New post', contentHtml: '<p>Content</p>' },
      });
      const res = createMockRes();

      await postsHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    });

    it('rejects create requests with missing content', async () => {
      mockJwt.verify.mockReturnValue({ userId: 9 });

      const req = createMockReq({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: { title: 'New post' },
      });
      const res = createMockRes();

      await postsHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Title and content are required' });
    });
  });

  describe('post by id handler', () => {
    it('returns 400 when the post id is invalid', async () => {
      const req = createMockReq({
        method: 'GET',
        query: { id: 'abc' },
      });
      const res = createMockRes();

      await postByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid post ID' });
    });

    it('returns the requested post', async () => {
      mockDb.query.posts.findFirst.mockResolvedValue({
        id: 3,
        authorId: 5,
        title: 'Existing post',
        contentHtml: '<p>Body</p>',
        coverImageUrl: 'https://cdn.example.com/uploads/cover.jpg',
        author: { email: 'author@example.com' },
      });

      const req = createMockReq({
        method: 'GET',
        query: { id: '3' },
      });
      const res = createMockRes();

      await postByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: 3,
        authorId: 5,
        title: 'Existing post',
        contentHtml: '<p>Body</p>',
        coverImageUrl: 'https://cdn.example.com/uploads/cover.jpg',
        author: { email: 'author@example.com' },
      });
    });

    it('returns 404 when the post is missing', async () => {
      mockDb.query.posts.findFirst.mockResolvedValue(null);

      const req = createMockReq({
        method: 'GET',
        query: { id: '3' },
      });
      const res = createMockRes();

      await postByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Post not found' });
    });

    it('updates a post owned by the authenticated user', async () => {
      mockJwt.verify.mockReturnValue({ userId: 5 });
      mockDb.query.posts.findFirst.mockResolvedValue({
        id: 3,
        authorId: 5,
        title: 'Existing post',
        contentHtml: '<p>Body</p>',
        coverImageUrl: 'https://cdn.example.com/uploads/cover.jpg',
      });
      mockPostUpdate({
        id: 3,
        authorId: 5,
        title: 'Updated post',
        contentHtml: '<p>Updated body</p>',
        coverImageUrl: '',
      });
      mockDeleteFromR2.mockResolvedValue(undefined);

      const req = createMockReq({
        method: 'PATCH',
        query: { id: '3' },
        headers: { authorization: 'Bearer valid-token' },
        body: {
          title: 'Updated post',
          contentHtml: '<p>Updated body</p>',
          coverImageUrl: '',
        },
      });
      const res = createMockRes();

      await postByIdHandler(req, res);

      expect(mockDeleteFromR2).toHaveBeenCalledWith('uploads/cover.jpg');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: 3,
        authorId: 5,
        title: 'Updated post',
        contentHtml: '<p>Updated body</p>',
        coverImageUrl: '',
      });
    });

    it('continues updating even if cover image deletion fails', async () => {
      mockJwt.verify.mockReturnValue({ userId: 5 });
      mockDb.query.posts.findFirst.mockResolvedValue({
        id: 3,
        authorId: 5,
        title: 'Existing post',
        contentHtml: '<p>Body</p>',
        coverImageUrl: 'https://cdn.example.com/uploads/cover.jpg',
      });
      mockPostUpdate({
        id: 3,
        authorId: 5,
        title: 'Updated post',
        contentHtml: '<p>Updated body</p>',
        coverImageUrl: '',
      });
      mockDeleteFromR2.mockRejectedValueOnce(new Error('r2 unavailable'));

      const req = createMockReq({
        method: 'PATCH',
        query: { id: '3' },
        headers: { authorization: 'Bearer valid-token' },
        body: {
          title: 'Updated post',
          contentHtml: '<p>Updated body</p>',
          coverImageUrl: '',
        },
      });
      const res = createMockRes();

      await postByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: 3,
        authorId: 5,
        title: 'Updated post',
        contentHtml: '<p>Updated body</p>',
        coverImageUrl: '',
      });
    });

    it('rejects unauthenticated updates', async () => {
      const req = createMockReq({
        method: 'PATCH',
        query: { id: '3' },
        body: { title: 'Updated post' },
      });
      const res = createMockRes();

      await postByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
    });

    it('rejects updates when the authenticated user is not the owner', async () => {
      mockJwt.verify.mockReturnValue({ userId: 99 });
      mockDb.query.posts.findFirst.mockResolvedValue({
        id: 3,
        authorId: 5,
        title: 'Existing post',
        contentHtml: '<p>Body</p>',
        coverImageUrl: null,
      });

      const req = createMockReq({
        method: 'PATCH',
        query: { id: '3' },
        headers: { authorization: 'Bearer valid-token' },
        body: { title: 'Updated post' },
      });
      const res = createMockRes();

      await postByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'You are not authorized to edit this post' });
    });

    it('returns 400 when no update fields are provided', async () => {
      mockJwt.verify.mockReturnValue({ userId: 5 });

      const req = createMockReq({
        method: 'PATCH',
        query: { id: '3' },
        headers: { authorization: 'Bearer valid-token' },
        body: {},
      });
      const res = createMockRes();

      await postByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Title, content, or coverImageUrl is required for update',
      });
    });

    it('returns 401 when the update JWT is invalid', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new mockJwt.JsonWebTokenError('invalid token');
      });

      const req = createMockReq({
        method: 'PATCH',
        query: { id: '3' },
        headers: { authorization: 'Bearer invalid-token' },
        body: { title: 'Updated post' },
      });
      const res = createMockRes();

      await postByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    });

    it('deletes a post owned by the authenticated user', async () => {
      mockJwt.verify.mockReturnValue({ userId: 5 });
      mockDb.query.posts.findFirst.mockResolvedValue({
        id: 3,
        authorId: 5,
        title: 'Existing post',
        contentHtml: '<p>Body</p>',
        coverImageUrl: 'https://cdn.example.com/uploads/cover.jpg',
      });
      mockDeleteFromR2.mockResolvedValue(undefined);
      mockPostDelete();

      const req = createMockReq({
        method: 'DELETE',
        query: { id: '3' },
        headers: { authorization: 'Bearer valid-token' },
      });
      const res = createMockRes();

      await postByIdHandler(req, res);

      expect(mockDeleteFromR2).toHaveBeenCalledWith('uploads/cover.jpg');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalledWith();
    });

    it('continues deleting even if cover image deletion fails', async () => {
      mockJwt.verify.mockReturnValue({ userId: 5 });
      mockDb.query.posts.findFirst.mockResolvedValue({
        id: 3,
        authorId: 5,
        title: 'Existing post',
        contentHtml: '<p>Body</p>',
        coverImageUrl: 'https://cdn.example.com/uploads/cover.jpg',
      });
      mockDeleteFromR2.mockRejectedValueOnce(new Error('r2 unavailable'));
      mockPostDelete();

      const req = createMockReq({
        method: 'DELETE',
        query: { id: '3' },
        headers: { authorization: 'Bearer valid-token' },
      });
      const res = createMockRes();

      await postByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalledWith();
    });

    it('rejects unauthenticated deletes', async () => {
      const req = createMockReq({
        method: 'DELETE',
        query: { id: '3' },
      });
      const res = createMockRes();

      await postByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
    });

    it('rejects deletes when the authenticated user is not the owner', async () => {
      mockJwt.verify.mockReturnValue({ userId: 99 });
      mockDb.query.posts.findFirst.mockResolvedValue({
        id: 3,
        authorId: 5,
        title: 'Existing post',
        contentHtml: '<p>Body</p>',
        coverImageUrl: null,
      });

      const req = createMockReq({
        method: 'DELETE',
        query: { id: '3' },
        headers: { authorization: 'Bearer valid-token' },
      });
      const res = createMockRes();

      await postByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'You are not authorized to delete this post' });
    });

    it('returns 404 when deleting a missing post', async () => {
      mockJwt.verify.mockReturnValue({ userId: 5 });
      mockDb.query.posts.findFirst.mockResolvedValue(null);

      const req = createMockReq({
        method: 'DELETE',
        query: { id: '3' },
        headers: { authorization: 'Bearer valid-token' },
      });
      const res = createMockRes();

      await postByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Post not found' });
    });

    it('returns 405 for unsupported methods', async () => {
      const req = createMockReq({
        method: 'PUT',
        query: { id: '3' },
      });
      const res = createMockRes();

      await postByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
    });
  });
});