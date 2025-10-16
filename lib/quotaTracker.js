  // lib/quotaTracker.js - PERSISTENT VERSION WITH NETLIFY BLOBS
  import { getStore } from '@netlify/blobs';

  const DAILY_TOKEN_LIMIT = 100000;
  const DAILY_REQUEST_LIMIT = 14400;
  const QUOTA_BLOB_KEY = 'quota-data';

  // In-memory cache to reduce blob reads
  let quotaCache = null;
  let cacheTimestamp = null;
  const CACHE_TTL_MS = 30000; // 30 seconds cache

  // Get the Netlify Blobs store
  function getQuotaStore() {
    try {
      return getStore('quota');
    } catch (error) {
      console.warn('⚠️  Netlify Blobs not available, falling back to in-memory storage:', error.message);
      return null;
    }
  }

  // Load quota data from Netlify Blobs or cache
  async function loadQuotaData() {
    // Return cached data if still valid
    if (quotaCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_TTL_MS)) {
      return quotaCache;
    }

    const store = getQuotaStore();

    if (!store) {
      // Fallback to in-memory if Netlify Blobs unavailable
      if (!quotaCache) {
        quotaCache = createFreshQuotaData();
      }
      return quotaCache;
    }

    try {
      const storedData = await store.get(QUOTA_BLOB_KEY, { type: 'json' });

      if (storedData) {
        quotaCache = storedData;
        cacheTimestamp = Date.now();
        return storedData;
      }
    } catch (error) {
      console.error('📊 Error loading quota data from Netlify Blobs:', error);
    }

    // Create fresh data if nothing stored
    const freshData = createFreshQuotaData();
    quotaCache = freshData;
    cacheTimestamp = Date.now();

    // Save it immediately
    try {
      if (store) {
        await store.setJSON(QUOTA_BLOB_KEY, freshData);
      }
    } catch (error) {
      console.error('📊 Error saving fresh quota data:', error);
    }

    return freshData;
  }

  // Save quota data to Netlify Blobs
  async function saveQuotaData(data) {
    const store = getQuotaStore();

    // Update cache
    quotaCache = data;
    cacheTimestamp = Date.now();

    if (!store) {
      // Just keep in memory if Netlify Blobs unavailable
      return;
    }

    try {
      await store.setJSON(QUOTA_BLOB_KEY, data);
      console.log('💾 Quota data persisted to Netlify Blobs');
    } catch (error) {
      console.error('📊 Error saving quota data to Netlify Blobs:', error);
    }
  }

  // Create fresh quota data structure
  function createFreshQuotaData() {
    return {
      date: new Date().toISOString().split('T')[0],
      tokensUsedToday: 0,
      requestsMadeToday: 0,
      lastReset: new Date().toISOString(),
      lastRateLimitHeaders: null,
      lastSyncTime: null
    };
  }

  // Check and reset if new day
  async function checkAndResetQuota() {
    const quotaData = await loadQuotaData();
    const today = new Date().toISOString().split('T')[0];

    if (quotaData.date !== today) {
      console.log('📅 New day detected - resetting quota');
      const freshData = createFreshQuotaData();
      await saveQuotaData(freshData);
      return freshData;
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
  export async function recordUsage(tokensUsed = 0, rateLimitHeaders = null) {
    const quota = await checkAndResetQuota();

    // Update local tracking
    quota.tokensUsedToday += tokensUsed;
    quota.requestsMadeToday += 1;

    // Store rate limit headers if provided
    if (rateLimitHeaders) {
      quota.lastRateLimitHeaders = rateLimitHeaders;
      quota.lastSyncTime = new Date().toISOString();
    }

    // Persist updated quota data
    await saveQuotaData(quota);

    console.log(`📊 Usage recorded & persisted: ${quota.tokensUsedToday}/${DAILY_TOKEN_LIMIT} tokens, ${quota.requestsMadeToday}/${DAILY_REQUEST_LIMIT} requests`);

    return await getQuotaStatus();
  }

  // Get current quota status - using rate limit headers as source of truth
  export async function getQuotaStatus() {
    const quota = await checkAndResetQuota();

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
      } : null,
      isPersistent: !!getQuotaStore() // Indicate if using persistent storage
    };
  }

  // Check if quota allows a new request
  export async function checkQuota() {
    return await getQuotaStatus();
  }