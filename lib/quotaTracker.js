// lib/quotaTracker.js - SIMPLE VERSION FOR NETLIFY
const DAILY_TOKEN_LIMIT = 100000;
const DAILY_REQUEST_LIMIT = 14400;

// In-memory storage (resets on cold starts, but works on Netlify)
let quotaData = {
  date: new Date().toISOString().split('T')[0],
  tokensUsedToday: 0,
  requestsMadeToday: 0,
  lastReset: new Date().toISOString(),
  lastRateLimitHeaders: null,
  lastSyncTime: null
};

// Check and reset if new day
function checkAndResetQuota() {
  const today = new Date().toISOString().split('T')[0];
  
  if (quotaData.date !== today) {
    quotaData = {
      date: today,
      tokensUsedToday: 0,
      requestsMadeToday: 0,
      lastReset: new Date().toISOString(),
      lastRateLimitHeaders: null,
      lastSyncTime: null
    };
  }
  
  return quotaData;
}

// Parse rate limit headers from Groq API response
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
  
  console.log(`📊 Usage recorded: ${quota.tokensUsedToday}/${DAILY_TOKEN_LIMIT} tokens, ${quota.requestsMadeToday}/${DAILY_REQUEST_LIMIT} requests`);
  
  return getQuotaStatus();
}

// Get current quota status - using rate limit headers as source of truth
export function getQuotaStatus() {
  const quota = checkAndResetQuota();
  
  // If we have recent rate limit headers (within last 5 minutes), use them as source of truth
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const hasRecentHeaders = quota.lastSyncTime && quota.lastSyncTime > fiveMinutesAgo;
  
  let tokensUsed = quota.tokensUsedToday;
  let tokensRemaining = DAILY_TOKEN_LIMIT - tokensUsed;
  let requestsUsed = quota.requestsMadeToday;
  let requestsRemaining = DAILY_REQUEST_LIMIT - requestsUsed;
  
  // Use Groq's rate limit headers if available and recent
  if (hasRecentHeaders && quota.lastRateLimitHeaders) {
    tokensRemaining = quota.lastRateLimitHeaders.tokensRemaining;
    requestsRemaining = quota.lastRateLimitHeaders.requestsRemaining;
    // Reverse calculate used amounts
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

// Check if quota allows a new request
export function checkQuota() {
  return getQuotaStatus();
}