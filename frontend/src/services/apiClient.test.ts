import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert';
import { apiClient, ApiError } from './apiClient.ts';

describe('CaseWeave API Client Foundation', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('Success flow: parses and returns typed JSON payload', async () => {
    const mockHealth = {
      status: 'ok',
      version: '0.1.0',
      database: 'sqlite',
      synthetic_records_loaded: true,
    };

    globalThis.fetch = async () => {
      return new Response(JSON.stringify(mockHealth), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const result = await apiClient.getHealth();
    assert.strictEqual(result.status, 'ok');
    assert.strictEqual(result.version, '0.1.0');
    assert.strictEqual(result.synthetic_records_loaded, true);
  });

  test('Validation error (HTTP 422): parses Pydantic validation details into field errors', async () => {
    const mockPydanticDetail = {
      detail: [
        {
          loc: ['body', 'reviewer_reason'],
          msg: 'Field required when decision is dismissed',
          type: 'value_error.missing',
        },
      ],
    };

    globalThis.fetch = async () => {
      return new Response(JSON.stringify(mockPydanticDetail), {
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      await apiClient.reviewRelationship('rel-101', {
        decision: 'dismissed',
        reviewer_reason: 'dummy to bypass client check',
      });
      assert.fail('Expected ApiError to be thrown');
    } catch (err: unknown) {
      assert.ok(err instanceof ApiError);
      const apiErr = err as ApiError;
      assert.strictEqual(apiErr.status, 422);
      assert.ok(apiErr.validationErrors && apiErr.validationErrors.length > 0);
      assert.strictEqual(apiErr.validationErrors[0].field, 'reviewer_reason');
    }
  });

  test('Client-side dismissal constraint: blocks submission without a non-empty reason', async () => {
    try {
      await apiClient.reviewRelationship('rel-101', {
        decision: 'dismissed',
        reviewer_reason: '   ',
      });
      assert.fail('Expected ApiError to be thrown client-side');
    } catch (err: unknown) {
      assert.ok(err instanceof ApiError);
      const apiErr = err as ApiError;
      assert.strictEqual(apiErr.status, 400);
      assert.match(apiErr.message, /non-empty dismissal reason is strictly required/i);
      assert.ok(apiErr.validationErrors?.some((v) => v.field === 'reviewer_reason'));
    }
  });

  test('Network failure: handles unreachable server and marks isNetworkError true', async () => {
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch');
    };

    try {
      await apiClient.getDashboardSummary();
      assert.fail('Expected ApiError on network disconnection');
    } catch (err: unknown) {
      assert.ok(err instanceof ApiError);
      const apiErr = err as ApiError;
      assert.strictEqual(apiErr.isNetworkError, true);
      assert.match(apiErr.message, /network connection failure/i);
    }
  });

  test('Non-2xx HTTP failure (HTTP 500): captures status and does not swallow error', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ detail: 'Internal database lock error' }), {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      await apiClient.getInstitutions();
      assert.fail('Expected ApiError on HTTP 500');
    } catch (err: unknown) {
      assert.ok(err instanceof ApiError);
      const apiErr = err as ApiError;
      assert.strictEqual(apiErr.status, 500);
      assert.strictEqual(apiErr.message, 'Internal database lock error');
    }
  });
});
