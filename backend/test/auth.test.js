const test = require('node:test');
const assert = require('node:assert/strict');
const { getConfiguredToken, isValidBearerToken } = require('../middleware/auth');

test('development uses the explicit demo token when no token is configured', () => {
  const previousEnvironment = process.env.NODE_ENV;
  const previousToken = process.env.API_TOKEN;
  delete process.env.API_TOKEN;
  process.env.NODE_ENV = 'development';

  assert.equal(getConfiguredToken(), 'demo-token');
  assert.equal(isValidBearerToken('Bearer', 'demo-token'), true);
  assert.equal(isValidBearerToken('Bearer', 'wrong-token'), false);
  assert.equal(isValidBearerToken('Basic', 'demo-token'), false);

  process.env.NODE_ENV = previousEnvironment;
  if (previousToken === undefined) delete process.env.API_TOKEN;
  else process.env.API_TOKEN = previousToken;
});

test('configured API tokens are required in production', () => {
  const previousEnvironment = process.env.NODE_ENV;
  const previousToken = process.env.API_TOKEN;
  process.env.NODE_ENV = 'production';
  process.env.API_TOKEN = 'interview-secret';

  assert.equal(getConfiguredToken(), 'interview-secret');
  assert.equal(isValidBearerToken('Bearer', 'interview-secret'), true);
  assert.equal(isValidBearerToken('Bearer', 'demo-token'), false);

  process.env.NODE_ENV = previousEnvironment;
  if (previousToken === undefined) delete process.env.API_TOKEN;
  else process.env.API_TOKEN = previousToken;
});
