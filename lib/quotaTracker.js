import fs from 'fs';
import path from 'path';

const QUOTA_FILE = path.join(process.cwd(), 'quota-data.json');
const DAILY_TOKEN_LIMIT = 100000; // Adjust to your Groq free tier
const DAILY_REQUEST_LIMIT = 14400; // Adjust to your Groq free tier

// Initialise quota file
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

// Read quota data
function readQuota() {
  initQuotaFile();
  const data = fs.readFileSync(QUOTA_FILE, 'utf8');
  return JSON.parse(data);
}

// Write quota data
function writeQuota(data) {
  fs.writeFileSync(QUOTA_FILE, JSON.stringify(data, null, 2));
}

// Check and reset if new day
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

// Parse rate limit headers from Groq API response
export function parseRateLimitHeaders(headers) {
  return {
    requestsRemaining: parseInt(headers.get('x-ratelimit-remaining-requests') || '0'),
    requestsLimit: parseInt(headers.get('x-ratelimit-limit-requests') || DAILY_REQUEST_LIMIT),
    tokensRemaining: parseInt(headers.get('x-ratelimit-remaining-tokens') || '0'),
    tokensLimit: parseInt(headers.get('x-ratelimit-limit-tokens') || DAILY_TOKEN_LIMIT),
    requestsReset: headers.get('x-ratelimit-reset-requests'),
    tokensReset: headers.get('x-ratelimit-reset-tokens')
  };
}

// Record usage after making a Groq API call
export function recordUsage(tokensUsed = 0, rateLimitHeaders = null) {
  const quota = checkAndResetQuota();
  
  // Update local tracking
  quota.tokensUsedToday += tokensUsed;
  quota.requestsMadeToday += 1;
  
  // Store rate limit headers if provided
  if (rateLimitHeaders) {
    quota.lastRateLimitHeaders = rateLimitHeaders;
    quota.lastSyncTime = new Date().toISOString();
  }
  
  writeQuota(quota);
  
  console.log(`📊 Usage recorded: ${quota.tokensUsedToday}/${DAILY_TOKEN_LIMIT} tokens, ${quota.requestsMadeToday}/${DAILY_REQUEST_LIMIT} requests`);
  
  return getQuotaStatus();
}

// Get current quota status
export function getQuotaStatus() {
  const quota = checkAndResetQuota();
  
  // Calculate based on local tracking
  const localTokensUsed = quota.tokensUsedToday;
  const localRequestsUsed = quota.requestsMadeToday;
  
  // If we have recent rate limit headers, use them for more accurate remaining counts
  let tokensRemaining = DAILY_TOKEN_LIMIT - localTokensUsed;
  let requestsRemaining = DAILY_REQUEST_LIMIT - localRequestsUsed;
  
  if (quota.lastRateLimitHeaders) {
    // Use the actual remaining counts from Groq if available
    // (these are more accurate than our local tracking)
    tokensRemaining = quota.lastRateLimitHeaders.tokensRemaining;
    requestsRemaining = quota.lastRateLimitHeaders.requestsRemaining;
  }
  
  const hasTokenQuota = tokensRemaining > 0;
  const hasRequestQuota = requestsRemaining > 0;
  
  // Calculate percentage based on local tracking
  const percentageUsed = Math.min(100, Math.round((localTokensUsed / DAILY_TOKEN_LIMIT) * 100));
  
  return {
    allowed: hasTokenQuota && hasRequestQuota,
    tokensUsed: localTokensUsed,
    tokensRemaining: Math.max(0, tokensRemaining),
    requestsUsed: localRequestsUsed,
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

// Check if quota allows a new request
export function canMakeRequest() {
  const status = getQuotaStatus();
  return status.allowed;
}