import type { NextApiRequest, NextApiResponse } from 'next';

export type MockResponse = NextApiResponse & {
  status: jest.Mock;
  json: jest.Mock;
  end: jest.Mock;
};

export function createMockReq(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return {
    method: 'GET',
    query: {},
    body: {},
    headers: {},
    ...overrides,
  } as NextApiRequest;
}

export function createMockRes(): MockResponse {
  const res = {} as MockResponse;

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);

  return res;
}