import { NextResponse } from 'next/server';
import { checkQuota, recordUsage, parseRateLimitHeaders } from '../../../lib/quotaTracker';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const INTERVIEW_EMAIL_TEMPLATE = `Dear **XXX**,

I'm a data journalist at the payments association, preparing a feature for payments intelligence — our members-only intelligence platform for senior leaders across the payments ecosystem.

This piece explores {subject} — {article_summary}

Given your experience in {member_expertise}, I'd value your view on the following question:

{generated_question}

Your 50–100-word response would feature as a pull-out quote, with your name, title, and company, shared with executives, policymakers, and partners across 250+ member companies of the payments association.

Read previous reports here: payments intelligence

Deadline: **XXX**

Kind regards,`;

export async function POST(request) {
  const startTime = Date.now();
  console.log('\n📧 === INTERVIEW EMAIL GENERATION STARTED ===');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);

  try {
    // VALIDATE API KEY
    if (!GROQ_API_KEY) {
      console.error('\n❌ GROQ_API_KEY MISSING');
      return NextResponse.json({ 
        success: false, 
        error: 'API configuration error',
        details: 'GROQ_API_KEY environment variable is not configured.',
        configRequired: true
      }, { status: 500 });
    }

    // CHECK QUOTA
  const quotaStatus = await checkQuota();    if (!quotaStatus.allowed) {
      console.error('\n❌ QUOTA EXCEEDED');
      return NextResponse.json({ 
        success: false, 
        error: 'Daily quota exceeded.',
        quotaExceeded: true,
        quotaStatus: {
          tokensUsed: quotaStatus.tokensUsed,
          requestsUsed: quotaStatus.requestsUsed,
          resetDate: quotaStatus.resetDate,
        }
      }, { status: 429 });
    }

    // VALIDATE REQUEST DATA
    let articleData, selectedMembers;
    try {
      const body = await request.json();
      articleData = body.articleData;
      selectedMembers = body.selectedMembers;
    } catch (parseError) {
      console.error('\n❌ REQUEST PARSING ERROR:', parseError);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid request format',
      }, { status: 400 });
    }

    if (!articleData || !articleData.title || !selectedMembers || selectedMembers.length === 0) {
      console.error('\n❌ MISSING REQUIRED FIELDS');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields',
      }, { status: 400 });
    }

    console.log('\n📝 INPUT DATA:');
    console.log(`📰 Article: ${articleData.title}`);
    console.log(`📋 Synopsis: ${articleData.synopsis?.length || 0} characters`);
    console.log(`📄 Full article: ${articleData.fullArticle?.length || 0} characters`);
    console.log(`👥 Selected members: ${selectedMembers.length}`);

    // STEP 1: Create IMPROVED article summary
    console.log('\n📝 CREATING ARTICLE SUMMARY...');
    const summaryPrompt = `You are creating a flowing sentence completion for an email. The sentence starts with:
"This piece explores ${articleData.title.toLowerCase()} — "

Your task is to complete this sentence with a summary that:
1. Does NOT repeat the title or use words from the title
2. Flows naturally after the dash
3. Uses different verbs than "exploring" or "examining"
4. Creates a smooth, professional sentence

Original synopsis to summarise:
"${articleData.synopsis}"

Requirements:
- 15-25 words after the dash
- Use verbs like: revealing, uncovering, assessing, highlighting, demonstrating, analysing, tracking, mapping
- Focus on the OUTCOME or INSIGHT, not the process
- UK English spelling
- No full stop at the end
- Make it flow as ONE natural sentence with the title

GOOD examples (notice how they flow):
- Title: "Digital Payment Trends 2025" → "revealing how embedded finance and instant payments are reshaping consumer expectations across Europe"
- Title: "Merchant Regulatory Roadmap Q4" → "highlighting critical compliance deadlines that will determine market winners and losers through 2027"
- Title: "Open Banking Evolution" → "tracking the shift from compliance-driven APIs to commercial premium services generating new revenue"

BAD examples (avoid these patterns):
- "examining regulatory convergence" (too generic, uses 'examining')
- "exploring how regulations impact merchants" (repeats 'exploring')
- "looking at compliance challenges" (weak verb)

Return ONLY the text that comes after the dash. Do not include the title or the dash itself.`;

    let summaryResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: summaryPrompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7  // Slightly higher for more creative summaries
      })
    });

    if (!summaryResponse.ok) {
      throw new Error(`Groq API error during summary: ${summaryResponse.status}`);
    }

    const summaryRateLimitHeaders = parseRateLimitHeaders(summaryResponse.headers);
    const summaryData = await summaryResponse.json();
  await recordUsage(summaryData.usage?.total_tokens || 0, summaryRateLimitHeaders);    
    let synopsisSummary = summaryData.choices[0].message.content.trim();
    
    // Remove trailing full stop if present
    if (synopsisSummary.endsWith('.')) {
      synopsisSummary = synopsisSummary.slice(0, -1);
    }
    
    // Ensure it doesn't start with examining/exploring
    if (synopsisSummary.toLowerCase().startsWith('examining') || 
        synopsisSummary.toLowerCase().startsWith('exploring')) {
      synopsisSummary = synopsisSummary.replace(/^(examining|exploring)/i, 'revealing');
    }
    
    console.log(`✅ Summary created: "${synopsisSummary}"`);
    console.log(`📊 Full sentence: "This piece explores ${articleData.title.toLowerCase()} — ${synopsisSummary}"`);
    console.log(`📊 Word count: ${synopsisSummary.split(/\s+/).length} words`);

    // STEP 2: Prepare article content for question generation
    const articleContent = articleData.fullArticle || articleData.synopsis;
    const truncatedContent = articleContent.length > 12000
      ? articleContent.substring(0, 12000) + '\n\n[Article continues...]'
      : articleContent;

    console.log(`\n📄 ARTICLE CONTENT FOR QUESTIONS:`);
    console.log(`   Using: ${articleData.fullArticle ? 'Full article' : 'Synopsis only'}`);
    console.log(`   Length: ${truncatedContent.length} characters (~${Math.round(truncatedContent.length / 4)} words)`);
    console.log(`   Truncated: ${articleContent.length > 12000 ? 'Yes' : 'No'}`);

    // STEP 3: Generate personalised thought leadership questions
    console.log('\n🔄 GENERATING PERSONALISED THOUGHT LEADERSHIP QUESTIONS...');

    const emailPromises = selectedMembers.map(async (member, index) => {
      console.log(`\n  📧 ${index + 1}/${selectedMembers.length}: Processing ${member.company}`);

      // Extract member expertise
      let memberExpertise = 'this area';
      if (member.expertise && Array.isArray(member.expertise) && member.expertise.length > 0) {
        memberExpertise = member.expertise.join(', ').toLowerCase();
      } else if (member.marketSegments && Array.isArray(member.marketSegments) && member.marketSegments.length > 0) {
        memberExpertise = member.marketSegments.join(', ').toLowerCase();
      }
      console.log(`     👤 Expertise: ${memberExpertise}`);

      // ANTI-HALLUCINATION PROMPT
      const questionPrompt = `You are an expert journalist seeking thought leadership commentary for a payments industry intelligence report.

⚠️ CRITICAL INSTRUCTION: You MUST ONLY use information explicitly stated in the article below. DO NOT add any external knowledge, statistics, dates, or regulations not mentioned in the provided text. If you cannot find specific details in the article, DO NOT make them up.

**ARTICLE CONTENT (ONLY use information from this text):**

Title: "${articleData.title}"

Synopsis: "${articleData.synopsis}"

Full Article:
"""
${truncatedContent}
"""

**EXPERT'S BACKGROUND:**
- Company: ${member.company}
- Expertise: ${member.expertise?.join(', ') || 'General payments'}

**YOUR TASK:**
Generate ONE strategic question (20-35 words) following these STRICT rules:

MANDATORY REQUIREMENTS:
1. ✅ ONLY reference facts, dates, statistics, or regulations EXPLICITLY mentioned in the article above
2. ❌ DO NOT add any information not in the provided text
3. ❌ DO NOT mention specific percentages unless they appear in the article
4. ❌ DO NOT mention specific dates/years unless they appear in the article  
5. ❌ DO NOT name regulations (PSD3, ISO 20022, etc.) unless explicitly named in the article

QUESTION CONSTRUCTION:
- If the article mentions "regulatory convergence" → use that phrase
- If the article mentions "2027" → you can use 2027
- If the article does NOT mention "€2.3bn" → do NOT use that figure
- If the article does NOT mention "ISO 20022" → do NOT reference it

GOOD PATTERNS (using only article content):
- "Given [concept from article], what [strategic implication] for [stakeholder group]?"
- "How might [trend mentioned in article] reshape [market dynamic]?"
- "Where does [challenge from article] create [opportunity/risk]?"

BAD PATTERNS (avoid these):
- Making up statistics: "With costs at £2bn..." (unless article states this)
- Adding timelines: "By Q3 2026..." (unless article states this)
- Naming unnamed items: "PSD3 and FIDA..." (unless article names these)

VALIDATION CHECK: Before returning your question, verify that EVERY specific claim in your question appears in the article text above.

Return ONLY the question text. Maximum 35 words.`;

      try {
        let questionResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: 'You create strategic questions using ONLY information explicitly provided in the article text. You NEVER add external knowledge or make up statistics, dates, or regulation names not in the source material.'
              },
              {
                role: 'user',
                content: questionPrompt
              }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.6,
            max_tokens: 200,
          })
        });

        if (!questionResponse.ok) {
          throw new Error(`Question generation failed: ${questionResponse.status}`);
        }

        const questionRateLimitHeaders = parseRateLimitHeaders(questionResponse.headers);
        const questionData = await questionResponse.json();
  await recordUsage(questionData.usage?.total_tokens || 0, questionRateLimitHeaders);
        let generatedQuestion = questionData.choices[0].message.content.trim();
        const questionWordCount = generatedQuestion.split(/\s+/).length;
        
        // ENHANCED VALIDATION to catch potential hallucinations
        const suspiciousPatterns = [
          /€[\d,]+bn?/,  // Specific euro amounts
          /£[\d,]+bn?/,  // Specific pound amounts
          /\$[\d,]+bn?/, // Specific dollar amounts
          /\d{1,2}%/,    // Specific percentages
          /Q[1-4]\s*\d{4}/, // Specific quarters
          /[A-Z]{3,}\d?(?:\s|$)/, // Acronyms that might be made up
        ];
        
        // Check if question contains suspicious specific data
        let mightBeHallucinated = false;
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(generatedQuestion)) {
            // Check if this specific data appears in the article
            const match = generatedQuestion.match(pattern)[0];
            if (!truncatedContent.includes(match)) {
              console.log(`     ⚠️ Potential hallucination detected: "${match}" not found in article`);
              mightBeHallucinated = true;
              break;
            }
          }
        }
        
        console.log(`     ✅ Question generated (${questionWordCount} words)`);
        console.log(`     📝 "${generatedQuestion}"`);
        console.log(`     ⚡ Tokens used: ${questionData.usage?.total_tokens || 0}`);

        // SAFER FALLBACK if hallucination detected or question is generic
        if (mightBeHallucinated || generatedQuestion.toLowerCase().includes('how will')) {
          console.log(`     ⚠️ Using safer, article-agnostic fallback`);
          
          // Create safe fallbacks that don't require specific article details
          const safeFallbacks = [
            "Given the regulatory changes outlined, which business models face the greatest transformation pressure?",
            "What strategic opportunities emerge from the convergence of compliance requirements described?",
            "Where do you see the most significant operational challenges in the developments outlined?",
            "Which market segments will see the greatest competitive shifts from these changes?",
            "How might smaller players differentiate themselves as these requirements converge?"
          ];
          
          // Pick a fallback based on member expertise
          if (member.expertise?.some(e => e.toLowerCase().includes('regulation'))) {
            generatedQuestion = safeFallbacks[0];
          } else if (member.expertise?.some(e => e.toLowerCase().includes('strateg'))) {
            generatedQuestion = safeFallbacks[1];
          } else {
            generatedQuestion = safeFallbacks[Math.floor(Math.random() * safeFallbacks.length)];
          }
          
          console.log(`     🔄 Applied safe fallback question`);
        }

        // Build the email body
        const emailBody = INTERVIEW_EMAIL_TEMPLATE
          .replace('{subject}', articleData.title.toLowerCase())
          .replace('{article_summary}', synopsisSummary)
          .replace('{member_expertise}', memberExpertise)
          .replace('{generated_question}', generatedQuestion);

        return {
          memberId: member.id,
          member: member,
          template: {
            subject: "payments intelligence feature request",
            body: emailBody
          },
          generatedQuestion: generatedQuestion,
          memberExpertise: memberExpertise,
          isEdited: false,
          isApproved: false,
          synopsisSummary: synopsisSummary,
          questionQuality: {
            wordCount: questionWordCount,
            mightBeHallucinated: mightBeHallucinated
          }
        };

      } catch (memberError) {
        console.error(`     ❌ Failed for ${member.company}:`, memberError.message);
        
        // Safe, generic fallback
        const fallbackQuestion = "What strategic implications do you see from the regulatory convergence outlined in this analysis?";
        
        console.log(`     🔄 Using safe fallback: "${fallbackQuestion}"`);
        
        const fallbackBody = INTERVIEW_EMAIL_TEMPLATE
          .replace('{subject}', articleData.title.toLowerCase())
          .replace('{article_summary}', synopsisSummary)
          .replace('{member_expertise}', memberExpertise)
          .replace('{generated_question}', fallbackQuestion);
        
        return {
          memberId: member.id,
          member: member,
          template: {
            subject: "payments intelligence feature request",
            body: fallbackBody
          },
          generatedQuestion: fallbackQuestion,
          memberExpertise: memberExpertise,
          isEdited: false,
          isApproved: false,
          error: memberError.message,
          synopsisSummary: synopsisSummary,
          isFallback: true
        };
      }
    });

    const generatedEmails = await Promise.all(emailPromises);
    const totalProcessingTime = Date.now() - startTime;
  const finalQuota = await checkQuota();    
    // Calculate quality metrics
    const possibleHallucinations = generatedEmails.filter(e => 
      e.questionQuality?.mightBeHallucinated
    ).length;
    
    const fallbackQuestions = generatedEmails.filter(e => e.isFallback).length;
    
    console.log('\n📊 INTERVIEW EMAIL GENERATION SUMMARY:');
    console.log(`⏱️ Total time: ${totalProcessingTime}ms`);
    console.log(`✅ Successful: ${generatedEmails.filter(e => !e.error).length}`);
    console.log(`❌ Failed: ${generatedEmails.filter(e => e.error).length}`);
    console.log(`⚠️ Possible hallucinations caught: ${possibleHallucinations}`);
    console.log(`🔄 Fallback questions used: ${fallbackQuestions}`);
    console.log(`📊 Total tokens used: ${finalQuota.tokensUsed}`);
    console.log(`📊 Quota remaining: ${finalQuota.tokensRemaining} tokens (${finalQuota.requestsRemaining} requests)`);

    // Log sample questions for quality check
    console.log('\n📋 SAMPLE GENERATED QUESTIONS (first 3):');
    generatedEmails.slice(0, 3).forEach((email, idx) => {
      console.log(`\n   ${idx + 1}. ${email.member.company}:`);
      console.log(`      "${email.generatedQuestion}"`);
      if (email.questionQuality) {
        console.log(`      Quality: ${email.questionQuality.mightBeHallucinated ? '⚠️ May contain hallucination' : '✅ Clean'}`);
      }
    });

    return NextResponse.json({ 
      success: true, 
      emails: generatedEmails,
      synopsisSummary: synopsisSummary,
      quotaStatus: {
        percentageUsed: finalQuota.percentageUsed,
        tokensRemaining: finalQuota.tokensRemaining,
        requestsRemaining: finalQuota.requestsRemaining
      },
      meta: {
        totalProcessingTime: totalProcessingTime,
        successfulGenerations: generatedEmails.filter(e => !e.error).length,
        failedGenerations: generatedEmails.filter(e => e.error).length,
        articleContentUsed: articleData.fullArticle ? 'full' : 'synopsis',
        articleContentLength: truncatedContent.length,
        possibleHallucinations: possibleHallucinations,
        fallbackQuestions: fallbackQuestions
      }
    });

  } catch (error) {
    const totalProcessingTime = Date.now() - startTime;
    console.error('\n❌ INTERVIEW EMAIL GENERATION ERROR:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to generate interview emails',
      details: error.message,
      timestamp: new Date().toISOString(),
      processingTime: totalProcessingTime
    }, { status: 500 });
  }
}