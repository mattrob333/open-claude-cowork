/**
 * Simple tests for validation middleware
 * Run: node middleware/validation.test.js
 */

import { validateChatRequest, validateWorkflowCreate, validateWorkflowRun, limits } from './validation.js';

let passed = 0;
let failed = 0;

function mockRes() {
  let statusCode = 200;
  let body = null;
  return {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      body = data;
      return this;
    },
    getStatus() { return statusCode; },
    getBody() { return body; }
  };
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${e.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${expected}, got ${actual}`);
  }
}

// ==================== Tests ====================

console.log('\n=== validateChatRequest ===');

test('rejects missing message', () => {
  const req = { body: {} };
  const res = mockRes();
  let nextCalled = false;
  validateChatRequest(req, res, () => { nextCalled = true; });
  assertEqual(res.getStatus(), 400, 'status');
  assertEqual(res.getBody().error, 'Message is required', 'error message');
  assertEqual(nextCalled, false, 'next should not be called');
});

test('rejects non-string message', () => {
  const req = { body: { message: 123 } };
  const res = mockRes();
  let nextCalled = false;
  validateChatRequest(req, res, () => { nextCalled = true; });
  assertEqual(res.getStatus(), 400, 'status');
  assertEqual(res.getBody().error, 'Message must be a string', 'error message');
});

test('rejects empty message', () => {
  const req = { body: { message: '   ' } };
  const res = mockRes();
  let nextCalled = false;
  validateChatRequest(req, res, () => { nextCalled = true; });
  assertEqual(res.getStatus(), 400, 'status');
  assertEqual(res.getBody().error, 'Message cannot be empty', 'error message');
});

test('rejects message exceeding max length (413)', () => {
  const req = { body: { message: 'x'.repeat(limits.MAX_MESSAGE_LENGTH + 1) } };
  const res = mockRes();
  let nextCalled = false;
  validateChatRequest(req, res, () => { nextCalled = true; });
  assertEqual(res.getStatus(), 413, 'status');
  assertEqual(nextCalled, false, 'next should not be called');
});

test('rejects invalid chatId characters (400)', () => {
  const req = { body: { message: 'hello', chatId: 'invalid<script>id' } };
  const res = mockRes();
  let nextCalled = false;
  validateChatRequest(req, res, () => { nextCalled = true; });
  assertEqual(res.getStatus(), 400, 'status');
  assertEqual(res.getBody().error, 'chatId contains invalid characters', 'error message');
});

test('rejects chatId with spaces (400)', () => {
  const req = { body: { message: 'hello', chatId: 'invalid id with spaces' } };
  const res = mockRes();
  let nextCalled = false;
  validateChatRequest(req, res, () => { nextCalled = true; });
  assertEqual(res.getStatus(), 400, 'status');
  assertEqual(res.getBody().error, 'chatId contains invalid characters', 'error message');
});

test('accepts valid request with all fields', () => {
  const req = { body: { message: 'hello', chatId: 'chat_123', userId: 'user_1', provider: 'claude', model: 'opus' } };
  const res = mockRes();
  let nextCalled = false;
  validateChatRequest(req, res, () => { nextCalled = true; });
  assertEqual(nextCalled, true, 'next should be called');
});

test('accepts valid request with minimal fields', () => {
  const req = { body: { message: 'hello' } };
  const res = mockRes();
  let nextCalled = false;
  validateChatRequest(req, res, () => { nextCalled = true; });
  assertEqual(nextCalled, true, 'next should be called');
});

console.log('\n=== validateWorkflowCreate ===');

test('rejects missing name', () => {
  const req = { body: { systemPrompt: 'test' } };
  const res = mockRes();
  let nextCalled = false;
  validateWorkflowCreate(req, res, () => { nextCalled = true; });
  assertEqual(res.getStatus(), 400, 'status');
  assertEqual(res.getBody().error, 'Name is required', 'error message');
});

test('rejects missing systemPrompt', () => {
  const req = { body: { name: 'test' } };
  const res = mockRes();
  let nextCalled = false;
  validateWorkflowCreate(req, res, () => { nextCalled = true; });
  assertEqual(res.getStatus(), 400, 'status');
  assertEqual(res.getBody().error, 'systemPrompt is required', 'error message');
});

test('accepts valid workflow', () => {
  const req = { body: { name: 'test', systemPrompt: 'do something' } };
  const res = mockRes();
  let nextCalled = false;
  validateWorkflowCreate(req, res, () => { nextCalled = true; });
  assertEqual(nextCalled, true, 'next should be called');
});

console.log('\n=== validateWorkflowRun ===');

test('rejects missing workflowId', () => {
  const req = { body: {} };
  const res = mockRes();
  let nextCalled = false;
  validateWorkflowRun(req, res, () => { nextCalled = true; });
  assertEqual(res.getStatus(), 400, 'status');
  assertEqual(res.getBody().error, 'workflowId is required', 'error message');
});

test('rejects invalid workflowId characters', () => {
  const req = { body: { workflowId: 'invalid<id>' } };
  const res = mockRes();
  let nextCalled = false;
  validateWorkflowRun(req, res, () => { nextCalled = true; });
  assertEqual(res.getStatus(), 400, 'status');
  assertEqual(res.getBody().error, 'workflowId contains invalid characters', 'error message');
});

test('accepts valid workflowId', () => {
  const req = { body: { workflowId: 'wf_123456789' } };
  const res = mockRes();
  let nextCalled = false;
  validateWorkflowRun(req, res, () => { nextCalled = true; });
  assertEqual(nextCalled, true, 'next should be called');
});

// ==================== Summary ====================

console.log('\n=== Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
