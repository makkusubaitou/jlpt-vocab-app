// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const database = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@/lib/db', async () => {
  const { drizzle } = await import('drizzle-orm/pg-proxy');
  const schema = await import('@/lib/db/schema');
  return { ...schema, db: drizzle(database.query, { schema }) };
});
import { GET } from '@/app/api/words/route';

beforeEach(() => { database.query.mockReset(); database.query.mockResolvedValue({ rows: [] }); });

it('includes active, mastered and already-known words without a 50-word cutoff', async () => {
  const response = await GET(new NextRequest('http://localhost/api/words?practice=true&scope=learned&limit=50'));
  expect(response.status).toBe(200);
  const [sql, params] = database.query.mock.calls[0];
  expect(params).toEqual(['active', 'known', 'skipped']);
  expect(sql).not.toContain(' limit ');
  expect(sql.split(' where ')[1]).not.toContain('next_review');
});

it('keeps learning-pool practice limited to active words, regardless of due date', async () => {
  const response = await GET(new NextRequest('http://localhost/api/words?practice=true&limit=50'));
  expect(response.status).toBe(200);
  const [sql, params] = database.query.mock.calls[0];
  expect(params).toEqual(['active']);
  expect(sql).not.toContain(' limit ');
  expect(sql.split(' where ')[1]).not.toContain('next_review');
});

it('keeps scheduled reviews restricted to due active words and honors their limit', async () => {
  const response = await GET(new NextRequest('http://localhost/api/words?forReview=true&scope=learned&limit=50'));
  expect(response.status).toBe(200);
  const [sql, params] = database.query.mock.calls[0];
  expect(params[0]).toBe('active');
  expect(params.at(-1)).toBe(50);
  expect(params).not.toContain('known');
  expect(sql.split(' where ')[1]).toContain('next_review');
  expect(sql).toContain(' limit ');
});
