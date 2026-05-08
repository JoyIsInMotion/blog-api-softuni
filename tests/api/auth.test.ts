import loginHandler from '../../pages/api/auth/login';
import meHandler from '../../pages/api/auth/me';
import registerHandler from '../../pages/api/auth/register';
import { createMockReq, createMockRes } from '../helpers/http';

jest.mock('@/db', () => ({
  db: {
    query: {
      users: {
        findFirst: jest.fn(),
      },
    },
    insert: jest.fn(),
  },
}));
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));
jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: jest.fn(),
    verify: jest.fn(),
    JsonWebTokenError: class MockJsonWebTokenError extends Error {},
  },
}));

const mockDb = require('@/db').db as {
  query: {
    users: {
      findFirst: jest.Mock;
    };
  };
  insert: jest.Mock;
};
const mockHash = require('bcrypt').hash as jest.Mock;
const mockCompare = require('bcrypt').compare as jest.Mock;
const mockJwt = require('jsonwebtoken').default as {
  sign: jest.Mock;
  verify: jest.Mock;
  JsonWebTokenError: new (...args: any[]) => Error;
};

const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

function mockUserInsert(user: { id: number; email: string; createdAt: string }) {
  const returning = jest.fn().mockResolvedValue([user]);
  const values = jest.fn().mockReturnValue({ returning });

  mockDb.insert.mockReturnValue({ values });

  return { values, returning };
}

describe('auth API routes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('login handler', () => {
    it('returns 405 for non-POST requests', async () => {
      const req = createMockReq({ method: 'GET' });
      const res = createMockRes();

      await loginHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
    });

    it('returns 400 when credentials are missing', async () => {
      const req = createMockReq({
        method: 'POST',
        body: { email: 'user@example.com' },
      });
      const res = createMockRes();

      await loginHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email and password are required' });
    });

    it('returns 401 when the user does not exist', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);

      const req = createMockReq({
        method: 'POST',
        body: { email: 'missing@example.com', password: 'secret' },
      });
      const res = createMockRes();

      await loginHandler(req, res);

      expect(mockDb.query.users.findFirst).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('returns 401 when the password does not match', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        passwordHash: 'hashed-password',
        createdAt: new Date('2026-05-08T00:00:00.000Z'),
      });
      mockCompare.mockResolvedValue(false);

      const req = createMockReq({
        method: 'POST',
        body: { email: 'user@example.com', password: 'wrong-password' },
      });
      const res = createMockRes();

      await loginHandler(req, res);

      expect(mockCompare).toHaveBeenCalledWith('wrong-password', 'hashed-password');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('returns a token for valid credentials', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 7,
        email: 'user@example.com',
        passwordHash: 'hashed-password',
        createdAt: new Date('2026-05-08T00:00:00.000Z'),
      });
      mockCompare.mockResolvedValue(true);
      mockJwt.sign.mockReturnValue('signed-token');

      const req = createMockReq({
        method: 'POST',
        body: { email: 'user@example.com', password: 'secret' },
      });
      const res = createMockRes();

      await loginHandler(req, res);

      expect(mockJwt.sign).toHaveBeenCalledWith({ userId: 7 }, 'test-jwt-secret', {
        expiresIn: '1h',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ token: 'signed-token' });
    });

    it('returns 500 when the database query fails', async () => {
      mockDb.query.users.findFirst.mockRejectedValue(new Error('database unavailable'));

      const req = createMockReq({
        method: 'POST',
        body: { email: 'user@example.com', password: 'secret' },
      });
      const res = createMockRes();

      await loginHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
    });
  });

  describe('register handler', () => {
    it('returns 405 for non-POST requests', async () => {
      const req = createMockReq({ method: 'GET' });
      const res = createMockRes();

      await registerHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
    });

    it('returns 400 when credentials are missing', async () => {
      const req = createMockReq({
        method: 'POST',
        body: { password: 'secret' },
      });
      const res = createMockRes();

      await registerHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email and password are required' });
    });

    it('creates a new user when the request is valid', async () => {
      mockHash.mockResolvedValue('hashed-password');
      mockUserInsert({
        id: 12,
        email: 'new@example.com',
        createdAt: '2026-05-08T00:00:00.000Z',
      });

      const req = createMockReq({
        method: 'POST',
        body: { email: 'new@example.com', password: 'secret' },
      });
      const res = createMockRes();

      await registerHandler(req, res);

      expect(mockHash).toHaveBeenCalledWith('secret', 10);
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: 12,
        email: 'new@example.com',
        createdAt: '2026-05-08T00:00:00.000Z',
      });
    });

    it('returns 500 when password hashing fails', async () => {
      mockHash.mockRejectedValue(new Error('hash failed'));

      const req = createMockReq({
        method: 'POST',
        body: { email: 'new@example.com', password: 'secret' },
      });
      const res = createMockRes();

      await registerHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
    });
  });

  describe('me handler', () => {
    it('returns 405 for non-GET requests', async () => {
      const req = createMockReq({ method: 'POST' });
      const res = createMockRes();

      await meHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
    });

    it('returns 401 when the authorization header is missing', async () => {
      const req = createMockReq({ method: 'GET' });
      const res = createMockRes();

      await meHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
    });

    it('returns 401 when the token is invalid', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new mockJwt.JsonWebTokenError('invalid token');
      });

      const req = createMockReq({
        method: 'GET',
        headers: { authorization: 'Bearer invalid-token' },
      });
      const res = createMockRes();

      await meHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    });

    it('returns 404 when the user cannot be found', async () => {
      mockJwt.verify.mockReturnValue({ userId: 99 });
      mockDb.query.users.findFirst.mockResolvedValue(null);

      const req = createMockReq({
        method: 'GET',
        headers: { authorization: 'Bearer valid-token' },
      });
      const res = createMockRes();

      await meHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('returns the current user profile', async () => {
      mockJwt.verify.mockReturnValue({ userId: 7 });
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 7,
        email: 'user@example.com',
        createdAt: new Date('2026-05-08T00:00:00.000Z'),
      });

      const req = createMockReq({
        method: 'GET',
        headers: { authorization: 'Bearer valid-token' },
      });
      const res = createMockRes();

      await meHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: 7,
        email: 'user@example.com',
        createdAt: new Date('2026-05-08T00:00:00.000Z'),
      });
    });
  });
});