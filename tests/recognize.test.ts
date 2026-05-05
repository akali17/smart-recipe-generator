/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

const mockCreate = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    chat: {
      completions: {
        create: (...args: any[]) => mockCreate(...args)
      }
    }
  }))
}));
import { POST } from '../src/app/api/recognize/route';

describe('POST /api/recognize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tra ve danh sach ingredients hop le', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '["egg", "tomato", "onion"]' } }]
    });

    const req = new NextRequest('http://localhost:3000/api/recognize', {
      method: 'POST',
      body: JSON.stringify({ imageBase64: 'base64string' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ingredients).toEqual(['egg', 'tomato', 'onion']);
  });

  it('tra ve mang rong khi AI khong nhan ra gi', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '[]' } }]
    });

    const req = new NextRequest('http://localhost:3000/api/recognize', {
      method: 'POST',
      body: JSON.stringify({ imageBase64: 'base64string' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.ingredients).toEqual([]);
  });

  it('tra ve loi 500 khi API throw error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API Error'));

    const req = new NextRequest('http://localhost:3000/api/recognize', {
      method: 'POST',
      body: JSON.stringify({ imageBase64: 'base64string' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
  });