import fs from 'fs';
import path from 'path';

const QUOTA_FILE = path.join(process.cwd(), 'quota-data.json');
const DAILY_TOKEN_LIMIT = 100000;
const DAILY_REQUEST_LIMIT = 14400;

// initialise quota file
function initQuotaFile() {
  if (!fs.existsSync(QUOTA_FILE)) {
    const initialData = {
      date: new Date().toISOString().split('T')[0],
      tokensUsedToday: 0,
      requestsMadeToday: 0,
      lastReset: new Date().toISOString(),
      lastRateLimitHeaders: null,
      lastSyncTime: null
    };
    fs.writeFileSync(QUOTA_FILE, JSON.stringify(initialData, null, 2));
  }
}

// read quota data
function readQuota() {
  initQuotaFile();
  const data = fs.readFileSync(QUOTA_FILE, 'utf8');
  return JSON.parse(data);
}

// write quota data
function writeQuota(data) {
  fs.writeFileSync(QUOTA_FILE, JSON.stringify(data, null, 2));
}

// check and reset if new day
function checkAndResetQuota() {
  const quota = readQuota();
  const today = new Date().toISOString().split('T')[0];
  
  if (quota.date !== today) {
    const resetData = {
      date: today,
      tokensUsedToday: 0,
      requestsMadeToday: 0,
      lastReset: new Date().toISOString(),
      lastRateLimitHeaders: null,
      lastSyncTime: null
    };
    writeQuota(resetData);
    return resetData;
  }
  
  return quota;
}

// parse rate limit headers from Groq API response
export function parseRateLimitHeaders(headers) {
  try {
    return {
      requestsRemaining: parseInt(headers.get('x-ratelimit-remaining-requests') || '0'),
      requestsLimit: parseInt(headers.get('x-ratelimit-limit-requests') || DAILY_REQUEST_LIMIT),
      tokensRemaining: parseInt(headers.get('x-ratelimit-remaining-tokens') || '0'),
      tokensLimit: parseInt(headers.get('x-ratelimit-limit-tokens') || DAILY_TOKEN_LIMIT),
      requestsReset: headers.get('x-ratelimit-reset-requests'),
      tokensReset: headers.get('x-ratelimit-reset-tokens')
    };
  } catch (error) {
    console.error('Error parsing rate limit headers:', error);
    return null;
  }
}

// record usage after making a Groq API call
export function recordUsage(tokensUsed = 0, rateLimitHeaders = null) {
  const quota = checkAndResetQuota();
  
  // update local tracking
  quota.tokensUsedToday += tokensUsed;
  quota.requestsMadeToday += 1;
  
  // store rate limit headers if provided
  if (rateLimitHeaders) {
    quota.lastRateLimitHeaders = rateLimitHeaders;
    quota.lastSyncTime = new Date().toISOString();
  }
  
  writeQuota(quota);
  
  console.log(`📊 Usage recorded: ${quota.tokensUsedToday}/${DAILY_TOKEN_LIMIT} tokens, ${quota.requestsMadeToday}/${DAILY_REQUEST_LIMIT} requests`);
  
  return getQuotaStatus();
}

// get current quota status - now using rate limit headers as source of truth
export function getQuotaStatus() {
  const quota = checkAndResetQuota();
  
  // if we have recent rate limit headers (within last 5 minutes), use them as source of truth
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const hasRecentHeaders = quota.lastSyncTime && quota.lastSyncTime > fiveMinutesAgo;
  
  let tokensUsed = quota.tokensUsedToday;
  let tokensRemaining = DAILY_TOKEN_LIMIT - tokensUsed;
  let requestsUsed = quota.requestsMadeToday;
  let requestsRemaining = DAILY_REQUEST_LIMIT - requestsUsed;
  
  // use Groq's rate limit headers if available and recent
  if (hasRecentHeaders && quota.lastRateLimitHeaders) {
    tokensRemaining = quota.lastRateLimitHeaders.tokensRemaining;
    requestsRemaining = quota.lastRateLimitHeaders.requestsRemaining;
    // reverse calculate used amounts
    tokensUsed = quota.lastRateLimitHeaders.tokensLimit - tokensRemaining;
    requestsUsed = quota.lastRateLimitHeaders.requestsLimit - requestsRemaining;
  }
  
  const hasTokenQuota = tokensRemaining > 0;
  const hasRequestQuota = requestsRemaining > 0;
  
  const percentageUsed = Math.min(100, Math.round((tokensUsed / DAILY_TOKEN_LIMIT) * 100));
  
  return {
    allowed: hasTokenQuota && hasRequestQuota,
    tokensUsed,
    tokensRemaining: Math.max(0, tokensRemaining),
    requestsUsed,
    requestsRemaining: Math.max(0, requestsRemaining),
    resetDate: quota.date,
    percentageUsed,
    lastReset: quota.lastReset,
    lastSyncTime: quota.lastSyncTime,
    rateLimitInfo: quota.lastRateLimitHeaders ? {
      requestsReset: quota.lastRateLimitHeaders.requestsReset,
      tokensReset: quota.lastRateLimitHeaders.tokensReset
    } : null
  };
}

// check if quota allows a new request - EXPORTED NOW
export function checkQuota() {
  return getQuotaStatus();
}