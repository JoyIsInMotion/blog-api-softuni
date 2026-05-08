import uploadHandler from '../../pages/api/upload';
import { createMockReq, createMockRes } from '../helpers/http';

jest.mock('../../lib/s3', () => ({
  uploadToR2: jest.fn(),
  deleteFromR2: jest.fn(),
}));
jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: jest.fn(),
    JsonWebTokenError: class MockJsonWebTokenError extends Error {},
  },
}));

const mockUploadToR2 = require('../../lib/s3').uploadToR2 as jest.Mock;
const mockDeleteFromR2 = require('../../lib/s3').deleteFromR2 as jest.Mock;
const mockJwt = require('jsonwebtoken').default as {
  verify: jest.Mock;
  JsonWebTokenError: new (...args: any[]) => Error;
};

const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('upload API route', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns 401 when the authorization header is missing', async () => {
    const req = createMockReq({ method: 'POST' });
    const res = createMockRes();

    await uploadHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid Authorization header' });
  });

  it('returns 401 when the token is invalid', async () => {
    mockJwt.verify.mockImplementation(() => {
      throw new mockJwt.JsonWebTokenError('invalid token');
    });

    const req = createMockReq({
      method: 'POST',
      headers: { authorization: 'Bearer invalid-token' },
    });
    const res = createMockRes();

    await uploadHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  it('uploads a file and returns its URL and key', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1715126400000);
    mockJwt.verify.mockReturnValue({ userId: 7 });
    mockUploadToR2.mockResolvedValue('https://cdn.example.com/uploaded-file.jpg');

    const req = createMockReq({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: {
        file: Buffer.from('sample file').toString('base64'),
        filename: 'hero image.jpg',
      },
    });
    const res = createMockRes();

    await uploadHandler(req, res);

    expect(mockUploadToR2).toHaveBeenCalledWith(
      'uploads/7/1715126400000-hero-image.jpg',
      expect.any(Buffer),
      'image/jpeg'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      url: 'https://cdn.example.com/uploaded-file.jpg',
      key: 'uploads/7/1715126400000-hero-image.jpg',
    });

    nowSpy.mockRestore();
  });

  it.each([
    ['photo.png', 'image/png'],
    ['animation.gif', 'image/gif'],
    ['preview.webp', 'image/webp'],
    ['document.txt', 'application/octet-stream'],
  ])('infers %s as %s', async (filename, contentType) => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1715126400000);
    mockJwt.verify.mockReturnValue({ userId: 7 });
    mockUploadToR2.mockResolvedValue('https://cdn.example.com/uploaded-file');

    const req = createMockReq({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: {
        file: Buffer.from('sample file').toString('base64'),
        filename,
      },
    });
    const res = createMockRes();

    await uploadHandler(req, res);

    expect(mockUploadToR2).toHaveBeenCalledWith(
      expect.stringContaining(`-${filename.replace(/\s+/g, '-')}`),
      expect.any(Buffer),
      contentType
    );
    expect(res.status).toHaveBeenCalledWith(200);

    nowSpy.mockRestore();
  });

  it('returns 400 when file data is missing', async () => {
    mockJwt.verify.mockReturnValue({ userId: 7 });

    const req = createMockReq({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: { filename: 'hero image.jpg' },
    });
    const res = createMockRes();

    await uploadHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing file or filename' });
  });

  it('returns 500 when the upload provider fails', async () => {
    mockJwt.verify.mockReturnValue({ userId: 7 });
    mockUploadToR2.mockRejectedValue(new Error('r2 down'));

    const req = createMockReq({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: {
        file: Buffer.from('sample file').toString('base64'),
        filename: 'hero image.jpg',
      },
    });
    const res = createMockRes();

    await uploadHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to upload file' });
  });

  it('deletes a stored file', async () => {
    mockJwt.verify.mockReturnValue({ userId: 7 });
    mockDeleteFromR2.mockResolvedValue(undefined);

    const req = createMockReq({
      method: 'DELETE',
      headers: { authorization: 'Bearer valid-token' },
      body: { key: 'uploads/7/1715126400000-hero-image.jpg' },
    });
    const res = createMockRes();

    await uploadHandler(req, res);

    expect(mockDeleteFromR2).toHaveBeenCalledWith('uploads/7/1715126400000-hero-image.jpg');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('returns 400 when the delete key is missing', async () => {
    mockJwt.verify.mockReturnValue({ userId: 7 });

    const req = createMockReq({
      method: 'DELETE',
      headers: { authorization: 'Bearer valid-token' },
      body: {},
    });
    const res = createMockRes();

    await uploadHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing key' });
  });

  it('returns 500 when deleting fails', async () => {
    mockJwt.verify.mockReturnValue({ userId: 7 });
    mockDeleteFromR2.mockRejectedValue(new Error('r2 delete failed'));

    const req = createMockReq({
      method: 'DELETE',
      headers: { authorization: 'Bearer valid-token' },
      body: { key: 'uploads/7/1715126400000-hero-image.jpg' },
    });
    const res = createMockRes();

    await uploadHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete file' });
  });

  it('returns 405 for unsupported methods', async () => {
    mockJwt.verify.mockReturnValue({ userId: 7 });

    const req = createMockReq({
      method: 'GET',
      headers: { authorization: 'Bearer valid-token' },
    });
    const res = createMockRes();

    await uploadHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });
});