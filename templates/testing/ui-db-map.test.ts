// Stack-agnostic UI-to-DB shape validation template
// Replace [ROUTER_NAME], [ENDPOINT_NAME] with your actual router/endpoint names
// Copy to: tests/integration/[router-name]-ui-db-map.test.ts

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// TODO: Replace with your actual imports
// For tRPC:
// import { createCallerFactory } from '@trpc/server';
// import { appRouter } from '@/server/routers';
//
// For Express:
// import request from 'supertest';
// import { app } from '@/server';

// -------------------------------------------------------------------------
// DB Mock Setup
// Mock the database layer so tests don't require a real DB connection.
// Replace with your actual DB module path.
// -------------------------------------------------------------------------

vi.mock('@/db', () => ({
  db: {
    query: {
      // TODO: Replace [TABLE_NAME] with your actual table name
      '[TABLE_NAME]': {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// -------------------------------------------------------------------------
// Test data factory
// Define the shape you expect the API to return.
// This is the "contract" — UI components depend on this exact shape.
// -------------------------------------------------------------------------

const MOCK_[TABLE_NAME]_ROW = {
  id: 1,
  // TODO: Replace with your actual field names and types
  '[FIELD_NAME_1]': '[mock value]',
  '[FIELD_NAME_2]': 42,
  '[FIELD_NAME_3]': true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('[ROUTER_NAME] router — UI/DB shape validation', () => {
  beforeAll(async () => {
    // TODO: Set up test environment (e.g., mock auth context)
    // vi.mock('@/auth', () => ({
    //   auth: vi.fn().mockResolvedValue({ userId: 'test-user-1' }),
    // }));
    // vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3000');
  });

  afterAll(async () => {
    // TODO: Clean up
    // vi.restoreAllMocks();
    // vi.unstubAllEnvs();
  });

  // -------------------------------------------------------------------------
  // [ENDPOINT_NAME] endpoint shape validation
  // -------------------------------------------------------------------------

  describe('[ENDPOINT_NAME]', () => {
    it('should return an array of [TABLE_NAME] rows', async () => {
      // TODO: Replace with your actual mock setup and caller
      // const { db } = await import('@/db');
      // vi.mocked(db.query.[TABLE_NAME].findMany).mockResolvedValue([MOCK_[TABLE_NAME]_ROW]);

      // const caller = createCallerFactory(appRouter)({ userId: 'test-user-1' });
      // const result = await caller.[ROUTER_NAME].[ENDPOINT_NAME]();

      // Placeholder assertion — replace with real caller
      const mockResult = [MOCK_[TABLE_NAME]_ROW];
      expect(Array.isArray(mockResult)).toBe(true);
    });

    it('should return each row with the required shape', async () => {
      const mockResult = [MOCK_[TABLE_NAME]_ROW];
      const row = mockResult[0];

      // Assert the exact shape the UI components expect
      expect(row).toHaveProperty('id');
      expect(typeof row.id).toBe('number');

      // TODO: Add assertions for each field your UI components use
      // expect(row).toHaveProperty('[FIELD_NAME_1]');
      // expect(typeof row['[FIELD_NAME_1]']).toBe('string');

      expect(row).toHaveProperty('createdAt');
      expect(row.createdAt).toBeInstanceOf(Date);
    });

    it('should return an empty array when no records exist', async () => {
      // TODO: Mock empty DB response
      // vi.mocked(db.query.[TABLE_NAME].findMany).mockResolvedValue([]);
      // const result = await caller.[ROUTER_NAME].[ENDPOINT_NAME]();
      // expect(result).toEqual([]);

      const mockEmptyResult: typeof MOCK_[TABLE_NAME]_ROW[] = [];
      expect(mockEmptyResult.length).toBe(0);
    });

    it('should not expose sensitive fields in the response', async () => {
      const mockResult = [MOCK_[TABLE_NAME]_ROW];
      const row = mockResult[0];

      // Ensure password hashes, secrets, and internal flags are not returned
      // TODO: Replace with your actual sensitive field names
      expect(row).not.toHaveProperty('passwordHash');
      expect(row).not.toHaveProperty('secretKey');
      expect(row).not.toHaveProperty('internalFlag');
    });
  });

  // -------------------------------------------------------------------------
  // Authentication guard
  // -------------------------------------------------------------------------

  describe('authentication', () => {
    it('should reject unauthenticated requests with 401', async () => {
      // TODO: Replace with your actual auth check
      // const unauthCaller = createCallerFactory(appRouter)({ userId: null });
      // await expect(unauthCaller.[ROUTER_NAME].[ENDPOINT_NAME]()).rejects.toThrow('UNAUTHORIZED');

      // Placeholder — replace with real auth check
      const isAuthenticated = false;
      if (!isAuthenticated) {
        expect(isAuthenticated).toBe(false);
      }
    });
  });
});
