import { NextResponse } from 'next/server';
import { checkQuota, recordUsage, parseRateLimitHeaders } from '../../../lib/quotaTracker';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const INTERVIEW_EMAIL_TEMPLATE = `Hi **XXX**,

I'm a data journalist at The Payments Association. I'm writing to offer you the opportunity to provide commentary for my article on {subject}.

{article_summary}

Given your expertise in this area, I'd value your perspective on the following question:

* {generated_question}

Your response (~50-100 words) would be featured in the 'Industry Voices' section of the article, alongside your name, job title and company. The article will be shared with our entire membership and promoted through our social media channels.

The deadline for responses is **XXX**

Spaces are limited, so please let me know if you are interested, as I can pass the opportunity on if this one isn't quite right. I'd be happy to provide any additional information or context you might need.

Many thanks,`;

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

    // STEP 1: Create article summary
    console.log('\n📝 CREATING ARTICLE SUMMARY...');
    const summaryPrompt = `Create a concise, engaging summary for use in a professional interview request email. The summary should follow the phrase "The article" and be written in a clear, professional tone that demonstrates the article's relevance and value.

Original synopsis:
"${articleData.synopsis}"

Requirements:
- Maximum 50 words (aim for 35-45)
- Should start naturally after "The article" (e.g., "explores...", "examines...", "analyses...", "investigates...")
- Professional yet engaging tone
- Focus on the key insight, trend, or development
- Highlight why this topic matters to the payments industry
- Use UK English spelling

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
    
    const synopsisSummary = summaryData.choices[0].message.content.trim();
    console.log(`✅ Summary created: "${synopsisSummary}"`);

    // STEP 2: Generate personalised thought leadership questions for each member
    console.log('\n🔄 GENERATING PERSONALISED THOUGHT LEADERSHIP QUESTIONS...');

    const emailPromises = selectedMembers.map(async (member, index) => {
      console.log(`\n  📧 ${index + 1}/${selectedMembers.length}: Processing ${member.company}`);

      // Generate thought leadership question based on member's area of expertise
      const questionPrompt = `You are an expert journalist seeking thought leadership commentary for a payments industry article.

Article title: "${articleData.title}"
Article synopsis: "${articleData.synopsis}"

Expert's background:
- Area of expertise: ${member.expertise?.join(', ')}
- Market focus: ${member.marketSegments?.join(', ') || 'General'}
- Geographic perspective: ${member.geographicFocus?.join(', ') || 'Global'}

Generate ONE thought-provoking question (25-40 words) that:

CRITICAL - THOUGHT LEADERSHIP FOCUS:
1. Asks about INDUSTRY-WIDE implications, not company-specific solutions
2. Encourages strategic analysis and forward-thinking perspective
3. Seeks insights on trends, challenges, or opportunities facing THE SECTOR
4. Avoids language that would prompt product/service promotion
5. Focuses on "what should the industry consider" rather than "what does your company offer"

The question should:
- Be relevant to their area of expertise (but ask about the broader industry, not their company)
- Encourage analytical, objective commentary
- Inspire a thoughtful 50-100 word response
- Use professional journalistic tone
- Focus on implications, strategic considerations, or future outlook

Examples of GOOD thought leadership questions:
- "What are the key strategic considerations the industry should prioritise as [development] unfolds?"
- "Looking ahead, what challenges might this create for [sector] over the next 12-18 months?"
- "From a regulatory perspective, what implications should stakeholders be aware of?"
- "How might this shift impact consumer behaviour and industry dynamics?"

Examples of BAD questions (too sales-focused):
- "How is your company addressing this challenge?" ❌
- "What solutions does your organisation offer for this?" ❌
- "How does your platform handle this situation?" ❌

Return ONLY the question text, no preamble or explanation.`;

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
                content: 'You are an expert journalist who creates thought-provoking questions that inspire industry-level insights, not promotional responses. Your questions focus on trends, implications, and strategic considerations for the broader payments industry.'
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
        console.log(`     ✅ Question generated: "${generatedQuestion.substring(0, 80)}..."`);

        // Build the email body with the generated question
        const emailBody = INTERVIEW_EMAIL_TEMPLATE
          .replace('{subject}', articleData.title)
          .replace('{article_summary}', `The article ${synopsisSummary}`)
          .replace('{generated_question}', generatedQuestion);

        return {
          memberId: member.id,
          member: member,
          template: {
            subject: "TPA Interview Request",
            body: emailBody
          },
          generatedQuestion: generatedQuestion,
          isEdited: false,
          isApproved: false,
          synopsisSummary: synopsisSummary
        };

      } catch (memberError) {
        console.error(`     ❌ Failed for ${member.company}:`, memberError.message);
        
        // Fallback with generic thought leadership question
        const fallbackQuestion = `What are the key strategic implications of ${articleData.title.toLowerCase()} for the payments industry over the next 12-18 months?`;
        
        const fallbackBody = INTERVIEW_EMAIL_TEMPLATE
          .replace('{subject}', articleData.title)
          .replace('{article_summary}', `The article ${synopsisSummary}`)
          .replace('{generated_question}', fallbackQuestion);
        
        return {
          memberId: member.id,
          member: member,
          template: {
            subject: "TPA Interview Request",
            body: fallbackBody
          },
          generatedQuestion: fallbackQuestion,
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