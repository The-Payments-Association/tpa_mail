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

    // STEP 2: Generate personalised thought leadership questions for each member
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

      // Generate thought leadership question based on member's area of expertise
      const questionPrompt = `You are an expert journalist seeking thought leadership commentary for a payments industry intelligence report aimed at senior executives.

Article title: "${articleData.title}"
Article synopsis: "${articleData.synopsis}"

Expert's background:
- Area of expertise: ${member.expertise?.join(', ') || 'General payments'}
- Market focus: ${member.marketSegments?.join(', ') || 'General'}
- Geographic perspective: ${member.geographicFocus?.join(', ') || 'Global'}

Generate ONE precise, senior-level, strategic question (15-25 words maximum) that:

CRITICAL - CONCISE THOUGHT LEADERSHIP:
1. Asks about INDUSTRY-WIDE strategic implications, not company-specific solutions
2. Must be 15-25 words (brevity is essential for busy executives)
3. Seeks insights on trends, challenges, or opportunities facing THE SECTOR
4. Avoids language that would prompt product/service promotion
5. Uses precise, strategic language appropriate for senior leaders
6. Focuses on "what should the industry consider" rather than "what does your company offer"

The question should:
- Be relevant to their area of expertise (but ask about the broader industry, not their company)
- Encourage analytical, objective commentary from a senior strategic perspective
- Inspire a thoughtful 50-100 word response
- Use professional, executive-level tone
- Be direct and concise - no unnecessary words

Examples of GOOD concise thought leadership questions:
- "What strategic investments are needed for the uk to close the A2A adoption gap with europe?" (17 words)
- "How should senior executives balance innovation speed with regulatory compliance in cross-border payments?" (14 words)
- "What policy shifts would accelerate open banking adoption among uk SMEs?" (12 words)

Examples of BAD questions:
- Too long: "What are the key strategic considerations that financial institutions across the UK should prioritise as this regulation continues to evolve?" ❌
- Sales-focused: "How is your company addressing this challenge?" ❌
- Too vague: "What do you think about this trend?" ❌

Return ONLY the question text, no preamble or explanation. Keep it under 25 words.`;

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
                content: 'You are an expert journalist who creates precise, concise strategic questions for senior executives. Your questions are always 15-25 words and inspire industry-level insights. You write for C-suite audiences in the payments sector.'
              },
              {
                role: 'user',
                content: questionPrompt
              }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.8,
          })
        });

        if (!questionResponse.ok) {
          throw new Error(`Question generation failed: ${questionResponse.status}`);
        }

        const questionRateLimitHeaders = parseRateLimitHeaders(questionResponse.headers);
        const questionData = await questionResponse.json();
        recordUsage(questionData.usage?.total_tokens || 0, questionRateLimitHeaders);

        const generatedQuestion = questionData.choices[0].message.content.trim();
        console.log(`     ✅ Question generated: "${generatedQuestion}"`);

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
        
        // Fallback with generic thought leadership question
        const fallbackQuestion = `What are the key strategic implications of ${articleData.title.toLowerCase()} for the uk payments industry?`;
        
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
        failedGenerations: generatedEmails.filter(e => e.error).length
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