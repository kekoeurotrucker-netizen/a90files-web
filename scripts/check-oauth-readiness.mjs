#!/usr/bin/env node
// A90 Files: read-only OAuth readiness check against the production origin.
// Does not follow provider redirects, submit credentials, or log cookies.
import assert from 'node:assert/strict';

const origin = (process.env.A90_ORIGIN || 'https://a90files-web.a90files.workers.dev').replace(/\/$/, '');
const supabase = (process.env.A90_SUPABASE_ORIGIN || 'https://ugwdxcmmxeqzoxgdofkd.supabase.co').replace(/\/$/, '');
const callback = origin + '/api/auth/oauth/callback';
const providers = ['google', 'github', 'discord', 'facebook', 'x', 'apple'];
let passed = 0;
let failed = 0;

function check(condition, label) {
  if (condition) { console.log('PASS ' + label); passed++; }
  else { console.error('FAIL ' + label); failed++; }
}
async function get(path, headers) {
  const response = await fetch(origin + path, { redirect: 'manual', headers, signal: AbortSignal.timeout(6500) });
  return response;
}
function locationOf(response) {
  try { return new URL(response.headers.get('location') || '/', origin); }
  catch { return null; }
}

let standard, extra;
try {
  const response = await get('/api/auth/providers');
  check(response.ok, 'Provider status endpoint');
  standard = await response.json();
  check(standard.available === true && standard.email === true, 'Email and Supabase status available');
} catch (error) {
  console.error('FAIL status endpoint: ' + error.message);
  process.exit(1);
}
try {
  const response = await get('/api/auth/extra-providers');
  check(response.ok, 'Apple status endpoint');
  extra = await response.json();
  check(extra.available === true, 'Supabase extra-provider status available');
} catch (error) {
  console.error('FAIL extra-provider endpoint: ' + error.message);
  process.exit(1);
}

for (const provider of providers) {
  const enabled = provider === 'apple' ? extra.providers?.apple === true : standard.providers?.[provider] === true;
  try {
    const response = await get('/api/auth/oauth/start?provider=' + provider + '&return=%2Fforo%2F');
    const location = locationOf(response);
    if (!enabled) {
      check(response.status === 303
        && location?.origin === origin
        && location.pathname === '/foro/'
        && location.searchParams.get('auth_error') === 'provider_disabled'
        && location.searchParams.get('provider') === provider,
        provider + ': disabled provider fails closed');
      continue;
    }
    const cookie = response.headers.get('set-cookie') || '';
    check(response.status === 302
      && location?.origin === supabase
      && location.pathname === '/auth/v1/authorize'
      && location.searchParams.get('provider') === provider
      && location.searchParams.get('redirect_to') === callback
      && location.searchParams.get('code_challenge_method') === 's256'
      && /^[A-Za-z0-9_-]{43}$/.test(location.searchParams.get('code_challenge') || '')
      && cookie.includes('__Host-a90_oauth_verifier')
      && cookie.includes('Secure'),
      provider + ': enabled provider begins secure PKCE OAuth');
  } catch (error) {
    check(false, provider + ': request error ' + error.message);
  }
}
try {
  const response = await get('/api/auth/oauth/start?provider=not-a-provider&return=%2Fforo%2F');
  const location = locationOf(response);
  check(response.status === 303 && location?.origin === origin
    && location.searchParams.get('auth_error') === 'provider_invalid',
    'Unknown provider rejected');
} catch (error) { check(false, 'Unknown provider: ' + error.message); }

console.log('\n' + passed + ' PASS, ' + failed + ' FAIL.');
process.exitCode = failed ? 1 : 0;
