import { membersDatabase } from '../../../lib/membersDatabase';
import { NextResponse } from 'next/server';
import { checkQuota, recordUsage, parseRateLimitHeaders } from '../../../lib/quotaTracker';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// STAGE 1: Pre-filter members using keyword matching (NO API CALL)
function preFilterMembers(article, members, maxMembers = 25) {
  console.log('\n🔍 STAGE 1: PRE-FILTERING MEMBERS');
  
  const articleText = `${article.title} ${article.synopsis} ${article.fullArticle}`.toLowerCase();
  
  const commonWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'will', 'what', 'when', 'where', 'how', 'can', 'are', 'was', 'were', 'been', 'has', 'had', 'but', 'not', 'you', 'all', 'some', 'her', 'his', 'their', 'our']);
  
  const keywords = articleText
    .split(/\W+/)
    .filter(word => word.length > 3 && !commonWords.has(word))
    .slice(0, 100);
  
  console.log(`  📝 Extracted ${keywords.length} keywords from article`);
  console.log(`  🔑 Sample keywords: ${keywords.slice(0, 10).join(', ')}...`);
  
  const scoredMembers = members.map(member => {
    const memberText = `
      ${member.company}
      ${member.expertise.join(' ')} 
      ${member.interests.join(' ')} 
      ${member.marketSegments?.join(' ') || ''} 
      ${member.bio}
      ${member.geographicFocus?.join(' ') || ''}
    `.toLowerCase();
    
    let matches = 0;
    keywords.forEach(keyword => {
      if (memberText.includes(keyword)) {
        matches++;
      }
    });
    
    const relevanceScore = Math.min(Math.round((matches / keywords.length) * 100), 100);
    
    return { 
      ...member, 
      keywordMatches: matches,
      preFilterScore: relevanceScore 
    };
  });
  
  const filtered = scoredMembers
    .filter(m => m.keywordMatches > 0)
    .sort((a, b) => b.keywordMatches - a.keywordMatches)
    .slice(0, maxMembers);
  
  console.log(`  ✅ Pre-filtered from ${members.length} to ${filtered.length} members`);
  console.log(`  📊 Top 5 pre-filtered members:`);
  filtered.slice(0, 5).forEach((m, i) => {
    console.log(`    ${i + 1}. ${m.company} (${m.keywordMatches} keyword matches)`);
  });
  
  return filtered;
}

export async function POST(request) {
  const startTime = Date.now();
  console.log('\n🔍 === ARTICLE ANALYSIS STARTED ===');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);

  try {
    // CHECK QUOTA FIRST
    const quotaStatus = await checkQuota();
    
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

    const { title, synopsis, fullArticle } = await request.json();
    
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
        message: 'No relevant members found for this article'
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
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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

    if (!groqResponse.ok) {
      const error = await groqResponse.text();
      throw new Error(`Groq API error: ${groqResponse.status} - ${error}`);
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
    console.log(`📊 Groq reports: ${rateLimitHeaders.requestsRemaining} requests remaining, ${rateLimitHeaders.tokensRemaining} tokens remaining`);

    const recommendations = JSON.parse(responseContent);
    
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

    const enrichedRecommendations = recommendations.recommendations.map(rec => {
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
    console.error('\n❌ GROQ API ERROR:');
    console.error(`⏱️ Failed after: ${processingTime}ms`);
    console.error(`🚨 Error type: ${error.constructor.name}`);
    console.error(`📝 Error message: ${error.message}`);
    console.error(`📍 Stack trace: ${error.stack}`);
    console.log('🔍 === ARTICLE ANALYSIS FAILED ===\n');
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to analyse article and find relevant members',
      details: error.message 
    }, { status: 500 });
  }
}