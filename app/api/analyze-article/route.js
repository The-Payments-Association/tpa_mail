import { membersDatabase } from "@/lib/membersDatabase.fixed.backup.js";
import { NextResponse } from 'next/server';
import { checkQuota, recordUsage, parseRateLimitHeaders } from '../../../lib/quotaTracker';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

function preFilterMembers(article, members, maxMembers = 25) {
  console.log('\n🔍 STAGE 1: CONTEXT-AWARE PRE-FILTERING');
  console.log('═══════════════════════════════════════════════════════════');
  
  // STEP 1: Extract context from title + synopsis (WHAT is this about?)
  const titleText = article.title.toLowerCase();
  const synopsisText = article.synopsis.toLowerCase();
  const fullArticleText = article.fullArticle ? article.fullArticle.toLowerCase() : '';
  
  console.log('\n📰 ARTICLE CONTEXT EXTRACTION:');
  console.log(`  Title: "${article.title}"`);
  console.log(`  Synopsis length: ${article.synopsis.length} chars`);
  console.log(`  Full article length: ${fullArticleText.length} chars`);
  
  // Generic stop words (meaningless anywhere)
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'will',
    'what', 'when', 'where', 'how', 'can', 'are', 'was', 'were', 'been',
    'has', 'had', 'but', 'not', 'you', 'all', 'some', 'her', 'his', 'their',
    'our', 'into', 'than', 'them', 'these', 'those', 'then', 'there', 'which',
    'would', 'could', 'should', 'about', 'also', 'more', 'most', 'other',
    'such', 'only', 'over', 'very', 'through', 'being', 'during', 'before',
    'after', 'above', 'below', 'between', 'under', 'while', 'your',
    'make', 'made', 'making', 'take', 'taken', 'taking', 'well', 'many',
    'need', 'needs', 'needed', 'must', 'should', 'may', 'might', 'likely',
    'possible', 'potentially', 'ensure', 'ensuring',
    
    // Time references
    'year', 'years', 'month', 'months', 'week', 'weeks', 'day', 'days',
    'today', 'tomorrow', 'yesterday', 'january', 'february', 'march', 
    'april', 'june', 'july', 'august', 'september', 'october', 'november', 
    'december', 'quarter'
  ]);
  
  // Ultra-generic terms (appear in EVERY financial services company)
  const ultraGenericTerms = new Set([
    'company', 'companies', 'business', 'businesses', 'customer', 'customers',
    'client', 'clients', 'industry', 'industries', 'solution', 'solutions',
    'platform', 'platforms', 'leading', 'innovative', 'advanced', 'global',
    'international', 'offer', 'offers', 'offering', 'provide', 'provides',
    'providing', 'enable', 'enables', 'enabling', 'support', 'supports',
    'supporting', 'help', 'helps', 'helping'
  ]);
  
  // TIER 1: CONTEXT KEYWORDS (from title + synopsis)
  const extractContextKeywords = (text) => {
    return text
      .split(/\W+/)
      .filter(word => 
        word.length > 3 && 
        !stopWords.has(word) && 
        !ultraGenericTerms.has(word) &&
        !/^\d+$/.test(word) && 
        !/^(19|20)\d{2}$/.test(word)
      );
  };
  
  const titleKeywords = new Set(extractContextKeywords(titleText));
  const synopsisKeywords = new Set(extractContextKeywords(synopsisText));
  const contextKeywords = new Set([...titleKeywords, ...synopsisKeywords]);
  
  console.log('\n🎯 TIER 1: CONTEXT KEYWORDS (from title + synopsis):');
  console.log(`  From title (${titleKeywords.size}): ${Array.from(titleKeywords).slice(0, 10).join(', ')}`);
  console.log(`  From synopsis (${synopsisKeywords.size}): ${Array.from(synopsisKeywords).slice(0, 10).join(', ')}`);
  console.log(`  Combined unique (${contextKeywords.size}): ${Array.from(contextKeywords).slice(0, 15).join(', ')}`);
  
  // TIER 2: SUPPORTING KEYWORDS (from full article)
  const fullArticleWords = fullArticleText ? extractContextKeywords(fullArticleText) : [];
  const wordFrequency = {};
  
  fullArticleWords.forEach(word => {
    if (!contextKeywords.has(word)) {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    }
  });
  
  // Calculate IDF for supporting keywords
  console.log('\n📊 TIER 2: CALCULATING IDF FOR SUPPORTING KEYWORDS...');
  
  const keywordIDF = {};
  
  // First, add context keywords with BOOSTED scores
  contextKeywords.forEach(keyword => {
    let membersWithKeyword = 0;
    
    members.forEach(member => {
      const memberText = `
        ${member.company}
        ${member.expertise?.join(' ') || ''} 
        ${member.interests?.join(' ') || ''} 
        ${member.marketSegments?.join(' ') || ''} 
        ${member.bio || ''}
        ${member.solutionTypes?.join(' ') || ''}
        ${member.regulatoryExpertise?.join(' ') || ''}
        ${member.recentInitiatives?.join(' ') || ''}
      `.toLowerCase();
      
      if (memberText.includes(keyword)) {
        membersWithKeyword++;
      }
    });
    
    const idf = Math.log((members.length + 1) / (membersWithKeyword + 1));
    const isInTitle = titleKeywords.has(keyword);
    
    keywordIDF[keyword] = {
      idf: idf,
      frequency: isInTitle ? 100 : 50, // HARDCODED: Artificial boost for context
      appearsInMembers: membersWithKeyword,
      percentageOfMembers: Math.round((membersWithKeyword / members.length) * 100),
      tier: isInTitle ? 'title' : 'synopsis',
      boost: isInTitle ? 3.0 : 2.0 // HARDCODED: 3x boost for title, 2x for synopsis
    };
  });
  
  // Then add supporting keywords from article
  Object.keys(wordFrequency).forEach(keyword => {
    let membersWithKeyword = 0;
    
    members.forEach(member => {
      const memberText = `
        ${member.company}
        ${member.expertise?.join(' ') || ''} 
        ${member.interests?.join(' ') || ''} 
        ${member.marketSegments?.join(' ') || ''} 
        ${member.bio || ''}
        ${member.solutionTypes?.join(' ') || ''}
        ${member.regulatoryExpertise?.join(' ') || ''}
        ${member.recentInitiatives?.join(' ') || ''}
      `.toLowerCase();
      
      if (memberText.includes(keyword)) {
        membersWithKeyword++;
      }
    });
    
    const idf = Math.log((members.length + 1) / (membersWithKeyword + 1));
    const percentageOfMembers = Math.round((membersWithKeyword / members.length) * 100);
    
    // Only keep supporting keywords that are discriminating (< 40% of members)
    if (percentageOfMembers < 40) {
      keywordIDF[keyword] = {
        idf: idf,
        frequency: wordFrequency[keyword],
        appearsInMembers: membersWithKeyword,
        percentageOfMembers: percentageOfMembers,
        tier: 'article',
        boost: 1.0 // HARDCODED: No boost for article keywords
      };
    }
  });
  
  // Create combined keyword list with TF-IDF scores
  const keywords = Object.entries(keywordIDF)
    .map(([word, data]) => {
      const tf = Math.log(data.frequency + 1);
      const tfidf = tf * data.idf * data.boost; // Apply tier boost here
      
      return {
        word,
        freq: data.frequency,
        tf,
        idf: data.idf,
        tfidf,
        tier: data.tier,
        boost: data.boost,
        appearsInMembers: data.appearsInMembers,
        percentageOfMembers: data.percentageOfMembers
      };
    })
    .sort((a, b) => b.tfidf - a.tfidf)
    .slice(0, 60); // HARDCODED: More keywords to ensure context coverage
  
  console.log(`  Total keywords: ${keywords.length}`);
  console.log(`  Title keywords: ${keywords.filter(k => k.tier === 'title').length}`);
  console.log(`  Synopsis keywords: ${keywords.filter(k => k.tier === 'synopsis').length}`);
  console.log(`  Article keywords: ${keywords.filter(k => k.tier === 'article').length}`);
  
  console.log('\n📝 TOP 25 KEYWORDS (by weighted TF-IDF):');
  console.log('  Rank | Tier     | Keyword           | TF-IDF | Boost | % Members');
  console.log('  ─────┼──────────┼───────────────────┼────────┼───────┼──────────');
  keywords.slice(0, 25).forEach((k, i) => {
    const tierSymbol = k.tier === 'title' ? '🏆' : k.tier === 'synopsis' ? '⭐' : '○';
    const keyword = k.word.padEnd(17);
    const tfidf = k.tfidf.toFixed(2).padStart(6);
    const boost = `${k.boost}x`.padStart(5);
    const pct = `${k.percentageOfMembers}%`.padStart(7);
    console.log(`  ${String(i + 1).padStart(4)} │ ${tierSymbol} ${k.tier.padEnd(6)} │ ${keyword} │ ${tfidf} │ ${boost} │ ${pct}`);
  });
  
  // DYNAMIC FIELD WEIGHTS - adapt to article content
  console.log('\n📊 CALCULATING DYNAMIC FIELD WEIGHTS...');
  
  // Analyse which fields contain the most context keywords
  const fieldKeywordCounts = {
    company: 0,
    expertise: 0,
    interests: 0,
    marketSegments: 0,
    bio: 0,
    geographicFocus: 0,
    solutionTypes: 0,
    regulatoryExpertise: 0,
    recentInitiatives: 0
  };
  
  // For each context keyword, check which fields it appears in most
  contextKeywords.forEach(keyword => {
    const fieldAppearances = {
      company: 0,
      expertise: 0,
      interests: 0,
      marketSegments: 0,
      bio: 0,
      geographicFocus: 0,
      solutionTypes: 0,
      regulatoryExpertise: 0,
      recentInitiatives: 0
    };
    
    members.forEach(member => {
      Object.keys(fieldAppearances).forEach(field => {
        const fieldValue = member[field];
        if (!fieldValue) return;
        
        const fieldText = Array.isArray(fieldValue)
          ? fieldValue.join(' ').toLowerCase()
          : String(fieldValue).toLowerCase();
        
        if (fieldText.includes(keyword)) {
          fieldAppearances[field]++;
        }
      });
    });
    
    // Add to field counts (weighted by how discriminating the keyword is)
    const keywordData = keywords.find(k => k.word === keyword);
    const discriminationScore = keywordData ? (1 - keywordData.percentageOfMembers / 100) : 0.5;
    
    Object.keys(fieldAppearances).forEach(field => {
      if (fieldAppearances[field] > 0) {
        fieldKeywordCounts[field] += discriminationScore;
      }
    });
  });
  
  // Calculate field weights dynamically based on keyword relevance
  // Base weight: 3.0
  // Max weight: 5.5
  // Fields with more relevant keywords get higher weights
  const maxCount = Math.max(...Object.values(fieldKeywordCounts), 1);
  const fieldWeights = {};
  
  Object.keys(fieldKeywordCounts).forEach(field => {
    const normalizedCount = fieldKeywordCounts[field] / maxCount;
    // Weight formula: 3.0 + (normalized count × 2.5)
    // No keywords → 3.0, max keywords → 5.5
    fieldWeights[field] = Math.max(2.0, 3.0 + (normalizedCount * 2.5));
  });
  
  console.log(`⚖️  DYNAMIC FIELD WEIGHTS (based on article keywords):`);
  Object.entries(fieldWeights)
    .sort((a, b) => b[1] - a[1])
    .forEach(([field, weight]) => {
      const keywordScore = fieldKeywordCounts[field].toFixed(2);
      const isTop = weight >= 5.0 ? ' 🔥' : '';
      console.log(`  ${field.padEnd(20)}: ${weight.toFixed(2)} (keyword relevance: ${keywordScore})${isTop}`);
    });
  
  // Fuzzy matching with HARDCODED scores
  const fuzzyMatch = (text, keyword) => {
    text = text.toLowerCase();
    keyword = keyword.toLowerCase();
    
    if (text.includes(keyword)) {
      return { score: 1.0, type: 'exact' }; // HARDCODED
    }
    
    const wordBoundary = new RegExp(`\\b${keyword}\\w*\\b`);
    if (wordBoundary.test(text)) {
      const match = text.match(wordBoundary);
      return { score: 0.85, type: 'boundary', matched: match[0] }; // HARDCODED
    }
    
    if (keyword.length >= 5) {
      const partial = keyword.substring(0, Math.floor(keyword.length * 0.75));
      if (text.includes(partial)) {
        return { score: 0.6, type: 'partial', matched: partial }; // HARDCODED
      }
    }
    
    return { score: 0, type: 'none' };
  };
  
  // Score each member
  const scoredMembers = members.map((member) => {
    let totalScore = 0;
    let matchedKeywords = new Set();
    let fieldScores = {};
    let detailedMatches = [];
    let tierMatches = { title: 0, synopsis: 0, article: 0 };
    
    Object.entries(fieldWeights).forEach(([field, weight]) => {
      let fieldValue = member[field];
      if (!fieldValue) return;
      
      const fieldText = Array.isArray(fieldValue)
        ? fieldValue.join(' ').toLowerCase()
        : String(fieldValue).toLowerCase();
      
      let fieldScore = 0;
      let fieldMatches = [];
      
      keywords.forEach(({ word, freq, tf, idf, tfidf, tier, boost, appearsInMembers, percentageOfMembers }) => {
        const matchResult = fuzzyMatch(fieldText, word);
        
        if (matchResult.score > 0) {
          const score = weight * tfidf * matchResult.score;
          fieldScore += score;
          matchedKeywords.add(word);
          tierMatches[tier]++;
          
          fieldMatches.push({
            keyword: word,
            tier,
            boost,
            matchType: matchResult.type,
            matchedText: matchResult.matched || word,
            appearsInMembers,
            percentageOfMembers,
            fieldWeight: weight,
            matchQuality: matchResult.score,
            tfidf: tfidf.toFixed(2),
            contributedScore: score.toFixed(2)
          });
        }
      });
      
      if (fieldMatches.length > 0) {
        fieldScores[field] = fieldScore;
        totalScore += fieldScore;
        detailedMatches.push({
          field,
          fieldWeight: weight,
          matches: fieldMatches,
          totalFieldScore: fieldScore.toFixed(2)
        });
      }
    });
    
    // HARDCODED: Bonus for matching context keywords (title + synopsis)
    const contextCoverage = (tierMatches.title + tierMatches.synopsis) / contextKeywords.size;
    const contextBonus = contextCoverage * 25; // HARDCODED: 25x multiplier
    totalScore += contextBonus;
    
    const maxPossibleScore = keywords.reduce((sum, k) => sum + k.tfidf, 0) * 5.5;
    const normalizedScore = Math.min(Math.round((totalScore / maxPossibleScore) * 100), 100);
    
    return {
      ...member,
      preFilterScore: normalizedScore,
      matchedKeywords: Array.from(matchedKeywords),
      keywordMatches: matchedKeywords.size,
      tierMatches,
      fieldScores: fieldScores,
      rawScore: totalScore,
      contextBonus: contextBonus.toFixed(2),
      contextCoverage: Math.round(contextCoverage * 100),
      detailedMatches: detailedMatches
    };
  });
  
  const filtered = scoredMembers
    .filter(m => m.keywordMatches > 0)
    .sort((a, b) => b.rawScore - a.rawScore)
    .slice(0, maxMembers);
  
  console.log(`\n✅ PRE-FILTERING RESULTS:`);
  console.log(`  Filtered from ${members.length} to ${filtered.length} members`);
  if (filtered.length > 0) {
    console.log(`  Score range: ${filtered[0].preFilterScore} to ${filtered[filtered.length - 1].preFilterScore}`);
  }
  
  console.log(`\n📊 TOP 5 DETAILED MATCH ANALYSIS:`);
  console.log('═══════════════════════════════════════════════════════════');
  
  filtered.slice(0, 5).forEach((member, index) => {
    console.log(`\n${index + 1}. ${member.company.toUpperCase()}`);
    console.log(`   📈 Normalized Score: ${member.preFilterScore}/100`);
    console.log(`   📈 Raw Score: ${member.rawScore.toFixed(2)}`);
    console.log(`   🎯 Context Coverage: ${member.contextCoverage}% (bonus: ${member.contextBonus})`);
    console.log(`   🔑 Keywords Matched: ${member.keywordMatches}/${keywords.length}`);
    console.log(`   📊 By tier: 🏆 ${member.tierMatches.title} title, ⭐ ${member.tierMatches.synopsis} synopsis, ○ ${member.tierMatches.article} article`);
    console.log(`   📋 Top Keywords: ${member.matchedKeywords.slice(0, 10).join(', ')}`);
    
    console.log(`\n   🔍 TOP FIELD CONTRIBUTIONS:`);
    member.detailedMatches
      .sort((a, b) => parseFloat(b.totalFieldScore) - parseFloat(a.totalFieldScore))
      .slice(0, 3)
      .forEach(fieldMatch => {
        console.log(`\n      📁 ${fieldMatch.field.toUpperCase()} (weight: ${fieldMatch.fieldWeight.toFixed(2)}, score: ${fieldMatch.totalFieldScore})`);
        
        fieldMatch.matches
          .sort((a, b) => parseFloat(b.contributedScore) - parseFloat(a.contributedScore))
          .slice(0, 4)
          .forEach(match => {
            const tierSymbol = match.tier === 'title' ? '🏆' : match.tier === 'synopsis' ? '⭐' : '○';
            const matchSymbol = match.matchType === 'exact' ? '✓' : match.matchType === 'boundary' ? '≈' : '~';
            console.log(`         ${tierSymbol} ${matchSymbol} "${match.keyword}" (${match.tier}, ${match.boost}x boost)`);
            console.log(`            TF-IDF: ${match.tfidf}, in ${match.appearsInMembers}/${members.length} (${match.percentageOfMembers}%), score: +${match.contributedScore}`);
          });
      });
    
    console.log(`   ─────────────────────────────────────────────────────────`);
  });
  
  console.log(`\n📈 OVERALL STATISTICS:`);
  if (filtered.length > 0) {
    console.log(`  Average keywords matched: ${(filtered.reduce((sum, m) => sum + m.keywordMatches, 0) / filtered.length).toFixed(1)}`);
    console.log(`  Average score: ${(filtered.reduce((sum, m) => sum + m.preFilterScore, 0) / filtered.length).toFixed(1)}`);
    console.log(`  Average context coverage: ${(filtered.reduce((sum, m) => sum + m.contextCoverage, 0) / filtered.length).toFixed(1)}%`);
    console.log(`  Members with >50% context coverage: ${filtered.filter(m => m.contextCoverage > 50).length}`);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('END OF PRE-FILTERING ANALYSIS\n');
  
  return filtered;
}

export async function POST(request) {
  const startTime = Date.now();
  console.log('\n🔍 === ARTICLE ANALYSIS STARTED ===');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);

  try {
    // VALIDATE API KEY FIRST
    if (!GROQ_API_KEY) {
      console.error('\n❌ GROQ_API_KEY MISSING');
      console.error('📝 Please configure GROQ_API_KEY in Netlify environment variables');
      
      return NextResponse.json({ 
        success: false, 
        error: 'API configuration error',
        details: 'GROQ_API_KEY environment variable is not configured. Please add it in Netlify site settings > Environment variables.',
        configRequired: true
      }, { status: 500 });
    }

    // CHECK QUOTA SECOND
    const quotaStatus = checkQuota();
    
    if (!quotaStatus.allowed) {
      console.error('\n❌ QUOTA EXCEEDED');
      console.error(`📊 Tokens used: ${quotaStatus.tokensUsed}/${quotaStatus.tokensUsed + quotaStatus.tokensRemaining}`);
      console.error(`📊 Requests used: ${quotaStatus.requestsUsed}/${quotaStatus.requestsUsed + quotaStatus.requestsRemaining}`);
      console.error(`📅 Quota resets: ${quotaStatus.resetDate}`);
      
      return NextResponse.json({ 
        success: false, 
        error: 'Daily quota exceeded. The team has used all free tokens for today.',
        quotaExceeded: true,
        quotaStatus: {
          tokensUsed: quotaStatus.tokensUsed,
          requestsUsed: quotaStatus.requestsUsed,
          resetDate: quotaStatus.resetDate,
          message: 'Quota will reset tomorrow. Please try again then.'
        }
      }, { status: 429 });
    }

    console.log(`\n📊 QUOTA STATUS:`);
    console.log(`  Tokens: ${quotaStatus.tokensUsed}/${quotaStatus.tokensUsed + quotaStatus.tokensRemaining} (${quotaStatus.percentageUsed}% used)`);
    console.log(`  Requests: ${quotaStatus.requestsUsed}/${quotaStatus.requestsUsed + quotaStatus.requestsRemaining}`);

    // VALIDATE REQUEST DATA
    let title, synopsis, fullArticle;
    
    try {
      const body = await request.json();
      title = body.title;
      synopsis = body.synopsis;
      fullArticle = body.fullArticle;
    } catch (parseError) {
      console.error('\n❌ REQUEST PARSING ERROR:', parseError);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid request format',
        details: 'Request body must be valid JSON with title, synopsis, and fullArticle fields'
      }, { status: 400 });
    }

    if (!title || !synopsis) {
      console.error('\n❌ MISSING REQUIRED FIELDS');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields',
        details: 'Both title and synopsis are required'
      }, { status: 400 });
    }
    
    console.log('\n📝 INPUT DATA:');
    console.log(`📰 Title: ${title}`);
    console.log(`📋 Synopsis length: ${synopsis?.length || 0} characters`);
    console.log(`📄 Full article length: ${fullArticle?.length || 0} characters`);
    console.log(`👥 Total members in database: ${membersDatabase.length}`);

    // STAGE 1: Pre-filter using keywords
    const preFilteredMembers = preFilterMembers(
      { title, synopsis, fullArticle },
      membersDatabase,
      25
    );

    if (preFilteredMembers.length === 0) {
      console.log('⚠️ No relevant members found in pre-filtering');
      return NextResponse.json({ 
        success: true, 
        members: [],
        message: 'No relevant members found for this article',
        meta: {
          totalMembersInDatabase: membersDatabase.length,
          preFilteredTo: 0,
          finalRecommendations: 0,
          tokensUsed: 0,
          processingTime: Date.now() - startTime
        }
      });
    }

    // STAGE 2: AI analysis
    console.log('\n🤖 STAGE 2: AI ANALYSIS ON FILTERED SUBSET');
    
    const membersContext = preFilteredMembers.map(member => ({
      id: member.id,
      company: member.company,
      expertise: member.expertise.join(', '),
      interests: member.interests.join(', '),
      bio: member.bio.substring(0, 150)
    }));

    const prompt = `You are an expert in the payments and fintech industry. These companies have been pre-filtered for relevance. Analyse them carefully and rank the TOP 10 most relevant for providing expert commentary on this article.

**Article Title:** ${title}

**Article Synopsis:** ${synopsis}

**Pre-filtered Companies (already relevant, rank the best):**
${JSON.stringify(membersContext, null, 2)}

**Your Task:**
Rank the TOP 10 most relevant companies based on:
1. Direct expertise alignment with article topics
2. Thought leadership potential
3. Specific insights they could provide

**Return format (JSON only):**
{
  "recommendations": [
    {
      "id": 1,
      "relevanceScore": 95,
      "reasoning": "Specific reason why this company is relevant..."
    }
  ]
}`;

    console.log(`📏 Prompt length: ${prompt.length} characters (~${Math.round(prompt.length / 4)} tokens)`);
    console.log(`🎯 Model: llama-3.3-70b-versatile`);
    console.log(`👥 Members in AI analysis: ${membersContext.length}`);

    // Call Groq API using fetch to access headers
    let groqResponse;
    
    try {
      groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are an expert analyst in the payments and fintech industry. Return only valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.3,
          max_tokens: 3000,
          response_format: { type: 'json_object' }
        })
      });
    } catch (fetchError) {
      console.error('\n❌ NETWORK ERROR connecting to Groq API:', fetchError);
      throw new Error(`Network error: ${fetchError.message}. Please check your internet connection.`);
    }

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('\n❌ GROQ API ERROR RESPONSE:', errorText);
      
      if (groqResponse.status === 401) {
        throw new Error('Invalid GROQ_API_KEY. Please check your API key configuration.');
      } else if (groqResponse.status === 429) {
        throw new Error('Groq API rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`Groq API error (${groqResponse.status}): ${errorText}`);
      }
    }

    // Parse rate limit headers from response
    const rateLimitHeaders = parseRateLimitHeaders(groqResponse.headers);
    console.log('\n📊 Rate limit headers:', rateLimitHeaders);

    const responseData = await groqResponse.json();

    // RECORD USAGE WITH HEADERS
    const tokensUsed = responseData.usage?.total_tokens || 0;
    const updatedQuota = recordUsage(tokensUsed, rateLimitHeaders);

    console.log('\n✅ GROQ RESPONSE RECEIVED:');
    const responseContent = responseData.choices[0].message.content;
    console.log(`📏 Response length: ${responseContent.length} characters`);
    console.log(`⚡ Tokens used this request: ${tokensUsed}`);
    console.log(`📊 Updated quota: ${updatedQuota.tokensUsed}/${updatedQuota.tokensUsed + updatedQuota.tokensRemaining} tokens (${updatedQuota.percentageUsed}% used)`);
    
    // Show what Groq reports if headers available
    if (rateLimitHeaders) {
      console.log(`📊 Groq reports: ${rateLimitHeaders.requestsRemaining} requests remaining, ${rateLimitHeaders.tokensRemaining} tokens remaining`);
    }

    let recommendations;
    
    try {
      recommendations = JSON.parse(responseContent);
    } catch (jsonError) {
      console.error('\n❌ JSON PARSING ERROR:', jsonError);
      console.error('Response content:', responseContent);
      throw new Error('Failed to parse AI response as JSON. The AI may have returned invalid format.');
    }
    
    console.log('\n🏆 PARSED RECOMMENDATIONS:');
    console.log(`📊 Number of recommendations: ${recommendations.recommendations?.length || 0}`);
    
    if (recommendations.recommendations) {
      recommendations.recommendations.forEach((rec, index) => {
        const member = membersDatabase.find(m => m.id === rec.id);
        console.log(`\n  ${index + 1}. ${member?.company || 'Unknown'} (ID: ${rec.id})`);
        console.log(`     📈 Score: ${rec.relevanceScore}%`);
        console.log(`     💭 Reasoning: ${rec.reasoning?.substring(0, 100)}...`);
      });
    }

    const enrichedRecommendations = (recommendations.recommendations || []).map(rec => {
      const member = membersDatabase.find(m => m.id === rec.id);
      return {
        ...member,
        relevanceScore: rec.relevanceScore,
        reasoning: rec.reasoning
      };
    });

    const processingTime = Date.now() - startTime;
    console.log('\n🎉 ANALYSIS COMPLETE:');
    console.log(`⏱️ Total processing time: ${processingTime}ms`);
    console.log(`📊 Queried ${membersDatabase.length} members`);
    console.log(`🔍 Pre-filtered to ${preFilteredMembers.length} members`);
    console.log(`📤 Returning ${enrichedRecommendations.length} final recommendations`);
    console.log('🔍 === ARTICLE ANALYSIS FINISHED ===\n');

    return NextResponse.json({ 
      success: true, 
      members: enrichedRecommendations,
      meta: {
        totalMembersInDatabase: membersDatabase.length,
        preFilteredTo: preFilteredMembers.length,
        finalRecommendations: enrichedRecommendations.length,
        tokensUsed: tokensUsed,
        processingTime: processingTime,
        quotaStatus: {
          tokensRemaining: updatedQuota.tokensRemaining,
          percentageUsed: updatedQuota.percentageUsed,
          requestsRemaining: updatedQuota.requestsRemaining,
          resetDate: updatedQuota.resetDate
        }
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('\n❌ ARTICLE ANALYSIS ERROR:');
    console.error(`⏱️ Failed after: ${processingTime}ms`);
    console.error(`🚨 Error type: ${error.constructor.name}`);
    console.error(`📝 Error message: ${error.message}`);
    console.error(`📍 Stack trace: ${error.stack}`);
    console.log('🔍 === ARTICLE ANALYSIS FAILED ===\n');
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to analyse article and find relevant members',
      details: error.message,
      timestamp: new Date().toISOString(),
      processingTime: processingTime
    }, { status: 500 });
  }
}