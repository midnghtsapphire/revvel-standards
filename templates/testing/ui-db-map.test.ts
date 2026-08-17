// Stack-agnostic UI-to-DB shape validation template
// Replace [ROUTER_NAME], [ENDPOINT_NAME] with your actual router/endpoint names
// Copy to: tests/integration/[router-name]-ui-db-map.test.ts

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// Replace with your actual imports
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
      // Replace [TABLE_NAME] with your actual table name
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

const MOCK_TABLE_NAME_ROW = {
  id: 1,
  // INSTRUCTION: Replace with your actual field names and types
  '[FIELD_NAME_1]': '[mock value]',
  '[FIELD_NAME_2]': 42,
  '[FIELD_NAME_3]': true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('[ROUTER_NAME] router — UI/DB shape validation', () => {
  beforeAll(async () => {
    // INSTRUCTION: Set up test environment (e.g., mock auth context)
    // vi.mock('@/auth', () => ({
    //   auth: vi.fn().mockResolvedValue({ userId: 'test-user-1' }),
    // }));
    // vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3000');
  });

  afterAll(async () => {
    // INSTRUCTION: Clean up
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  // -------------------------------------------------------------------------
  // [ENDPOINT_NAME] endpoint shape validation
  // -------------------------------------------------------------------------

  describe('[ENDPOINT_NAME]', () => {
    it('should return an array of [TABLE_NAME] rows', async () => {
      // Replace with your actual mock setup and caller
      // const { db } = await import('@/db');
      // vi.mocked(db.query.[TABLE_NAME].findMany).mockResolvedValue([MOCK_TABLE_NAME_ROW]);

      // const caller = createCallerFactory(appRouter)({ userId: 'test-user-1' });
      // const result = await caller.[ROUTER_NAME].[ENDPOINT_NAME]();

      // Placeholder assertion — replace with real caller
      const mockResult = [MOCK_TABLE_NAME_ROW];
      expect(Array.isArray(mockResult)).toBe(true);
    });

    it('should return each row with the required shape', async () => {
      const mockResult = [MOCK_TABLE_NAME_ROW];
      const row = mockResult[0];

      // Assert the exact shape the UI components expect
      expect(row).toHaveProperty('id');
      expect(typeof row.id).toBe('number');

      // INSTRUCTION: Add assertions for each field your UI components use
      expect(row).toHaveProperty('[FIELD_NAME_1]');
      expect(typeof row['[FIELD_NAME_1]']).toBe('string');

      expect(row).toHaveProperty('[FIELD_NAME_2]');
      expect(typeof row['[FIELD_NAME_2]']).toBe('number');

      expect(row).toHaveProperty('[FIELD_NAME_3]');
      expect(typeof row['[FIELD_NAME_3]']).toBe('boolean');

      expect(row).toHaveProperty('createdAt');
      expect(row.createdAt).toBeInstanceOf(Date);

      expect(row).toHaveProperty('updatedAt');
      expect(row.updatedAt).toBeInstanceOf(Date);
    });

    it('should return an empty array when no records exist', async () => {
      // INSTRUCTION: Replace with your actual mock setup and caller
      // const { db } = await import('@/db');
      // vi.mocked(db.query.[TABLE_NAME].findMany).mockResolvedValue([]);

      // const caller = createCallerFactory(appRouter)({ userId: 'test-user-1' });
      // const result = await caller.[ROUTER_NAME].[ENDPOINT_NAME]();
      // expect(result).toEqual([]);

      // Placeholder assertion — replace with real caller
      const mockEmptyResult: typeof MOCK_TABLE_NAME_ROW[] = [];
      expect(mockEmptyResult.length).toBe(0);
      expect(mockEmptyResult).toEqual([]);
    });

    it('should not expose sensitive fields in the response', async () => {
      const mockResult = [MOCK_TABLE_NAME_ROW];
      const row = mockResult[0];

      // Ensure password hashes, secrets, and internal flags are not returned
      // Replace with your actual sensitive field names
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
      // Replace with your actual auth check
      // const unauthCaller = createCallerFactory(appRouter)({ userId: null });
      // await expect(unauthCaller.[ROUTER_NAME].[ENDPOINT_NAME]()).rejects.toThrow('UNAUTHORIZED');

      // Placeholder — replace with real auth check
      const mockUnauthCall = async () => {
        throw new Error('UNAUTHORIZED');
      };

      await expect(mockUnauthCall()).rejects.toThrow('UNAUTHORIZED');
    });
  });
});
