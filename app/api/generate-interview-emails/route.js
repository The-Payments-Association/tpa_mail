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
    const quotaStatus = checkQuota();
    if (!quotaStatus.allowed) {
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

    // STEP 1: Create article summary (concise, 15-25 words)
    console.log('\n📝 CREATING ARTICLE SUMMARY...');
    const summaryPrompt = `Create a concise summary for a professional intelligence report email. This summary will appear after the article title and a dash (—) in this format: "This piece explores [article title] — [your summary here]"

Original synopsis:
"${articleData.synopsis}"

Requirements:
- 15-25 words maximum (aim for clarity and brevity)
- Should work as a standalone statement after the article title and dash
- Professional, analytical tone suited for senior executives
- Focus on what the article analyses/reveals/examines
- Use UK English spelling
- Use action words like: analysing, exploring, examining, revealing
- No full stop at the end
- Be specific but concise

Examples of good summaries:
- "analysing how emerging regulations are reshaping compliance priorities for UK fintechs"
- "examining cross-border payment challenges through new market data and regulatory insights"
- "exploring how AI adoption is transforming fraud prevention strategies across European banks"

Return only the summary text, no additional formatting or quotes.`;

    let summaryResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: summaryPrompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5
      })
    });

    if (!summaryResponse.ok) {
      throw new Error(`Groq API error during summary: ${summaryResponse.status}`);
    }

    const summaryRateLimitHeaders = parseRateLimitHeaders(summaryResponse.headers);
    const summaryData = await summaryResponse.json();
    recordUsage(summaryData.usage?.total_tokens || 0, summaryRateLimitHeaders);
    
    let synopsisSummary = summaryData.choices[0].message.content.trim();
    
    // Remove trailing full stop if present
    if (synopsisSummary.endsWith('.')) {
      synopsisSummary = synopsisSummary.slice(0, -1);
    }
    
    console.log(`✅ Summary created: "${synopsisSummary}"`);
    console.log(`📊 Word count: ${synopsisSummary.split(/\s+/).length} words`);

    // STEP 2: Prepare article content for question generation
    // Use full article if available, otherwise use synopsis
    // Limit to ~6000 characters (~1500 words) to avoid token limits
    const articleContent = articleData.fullArticle || articleData.synopsis;
    const truncatedContent = articleContent.length > 6000 
      ? articleContent.substring(0, 6000) + '\n\n[Article continues...]'
      : articleContent;

    console.log(`\n📄 ARTICLE CONTENT FOR QUESTIONS:`);
    console.log(`   Using: ${articleData.fullArticle ? 'Full article' : 'Synopsis only'}`);
    console.log(`   Length: ${truncatedContent.length} characters (~${Math.round(truncatedContent.length / 4)} words)`);
    console.log(`   Truncated: ${articleContent.length > 6000 ? 'Yes' : 'No'}`);

    // STEP 3: Generate personalised thought leadership questions for each member
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

      // Generate thought leadership question with FULL article context
      const questionPrompt = `You are an expert journalist seeking thought leadership commentary for a payments industry intelligence report aimed at senior executives.

**ARTICLE CONTEXT:**

Title: "${articleData.title}"

Synopsis: "${articleData.synopsis}"

Full Article Content:
"""
${truncatedContent}
"""

**EXPERT'S BACKGROUND:**
- Company: ${member.company}
- Area of expertise: ${member.expertise?.join(', ') || 'General payments'}
- Market focus: ${member.marketSegments?.join(', ') || 'General'}
- Geographic perspective: ${member.geographicFocus?.join(', ') || 'Global'}
${member.bio ? `- Background: ${member.bio.substring(0, 200)}` : ''}

**YOUR TASK:**
Based on the FULL article content above and this expert's specific background, generate ONE precise, strategic question (15-25 words maximum) that:

CRITICAL REQUIREMENTS:
1. **Reference SPECIFIC content** from the article - cite actual data points, statistics, arguments, or themes mentioned
2. **Connect to expert's domain** - align the question with their specific expertise area
3. **Industry-wide strategic focus** - ask about sector implications, not company-specific solutions
4. **Executive-level language** - use precise, strategic terminology appropriate for C-suite
5. **Actionable insight** - the question should inspire a thoughtful strategic response
6. **Concise** - maximum 25 words, be direct and clear

Examples of EXCELLENT questions (note the specificity):
- "Given the article's data showing 40% of SMEs lack digital payment access, what policy interventions would accelerate UK financial inclusion?"
- "The article highlights €2.3bn in PSD3 compliance costs - how should mid-tier PSPs prioritise regulatory investment versus innovation?"
- "With cross-border payment costs cited at 6.5% for remittances, what technical standards would drive industry-wide cost reduction?"

Examples of BAD questions (too generic):
- "What are your thoughts on the future of payments?" ❌ (no article reference)
- "How is your company addressing this challenge?" ❌ (company-specific)
- "What do you think about the trends mentioned in the article?" ❌ (vague)

The question MUST reference specific content from the article - data, statistics, arguments, or key themes.

Return ONLY the question text, no preamble or explanation. Maximum 25 words.`;

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
                content: 'You are an expert journalist who creates precise, data-driven strategic questions for senior executives in the payments sector. Your questions always reference specific article content and inspire industry-level insights. You write concisely - maximum 25 words per question.'
              },
              {
                role: 'user',
                content: questionPrompt
              }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7, // Slightly lower for more focused questions
            max_tokens: 150, // Limit to ensure concise questions
          })
        });

        if (!questionResponse.ok) {
          throw new Error(`Question generation failed: ${questionResponse.status}`);
        }

        const questionRateLimitHeaders = parseRateLimitHeaders(questionResponse.headers);
        const questionData = await questionResponse.json();
        recordUsage(questionData.usage?.total_tokens || 0, questionRateLimitHeaders);

        const generatedQuestion = questionData.choices[0].message.content.trim();
        const questionWordCount = generatedQuestion.split(/\s+/).length;
        
        console.log(`     ✅ Question generated (${questionWordCount} words)`);
        console.log(`     📝 "${generatedQuestion}"`);
        console.log(`     ⚡ Tokens used: ${questionData.usage?.total_tokens || 0}`);

        // Build the email body with the generated question and member expertise
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
          synopsisSummary: synopsisSummary
        };

      } catch (memberError) {
        console.error(`     ❌ Failed for ${member.company}:`, memberError.message);
        
        // Fallback with article-aware generic question
        const fallbackQuestion = `What strategic implications does ${articleData.title.toLowerCase()} have for the UK payments industry?`;
        
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
          synopsisSummary: synopsisSummary
        };
      }
    });

    const generatedEmails = await Promise.all(emailPromises);
    const totalProcessingTime = Date.now() - startTime;
    const finalQuota = checkQuota();
    
    console.log('\n📊 INTERVIEW EMAIL GENERATION SUMMARY:');
    console.log(`⏱️ Total time: ${totalProcessingTime}ms`);
    console.log(`✅ Successful: ${generatedEmails.filter(e => !e.error).length}`);
    console.log(`❌ Failed: ${generatedEmails.filter(e => e.error).length}`);
    console.log(`📊 Total tokens used: ${finalQuota.tokensUsed}`);
    console.log(`📊 Quota remaining: ${finalQuota.tokensRemaining} tokens (${finalQuota.requestsRemaining} requests)`);

    // Log sample questions for quality check
    console.log('\n📋 SAMPLE GENERATED QUESTIONS (first 3):');
    generatedEmails.slice(0, 3).forEach((email, idx) => {
      console.log(`\n   ${idx + 1}. ${email.member.company}:`);
      console.log(`      "${email.generatedQuestion}"`);
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
        articleContentLength: truncatedContent.length
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