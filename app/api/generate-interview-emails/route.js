import { NextResponse } from 'next/server';
import { checkQuota, recordUsage, parseRateLimitHeaders } from '../../../lib/quotaTracker';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const INTERVIEW_EMAIL_TEMPLATE = `Dear **XXX**,

I’m a data journalist at The Payments Association, preparing a feature for Payments Intelligence — our members-only intelligence platform for senior leaders across the payments ecosystem.

This piece explores {subject}, examining {article_summary} It will combine our proprietary data with expert commentary from key industry figures.

Given your experience in {member_expertise}, I'd value your perspective on the following question:

{generated_question}

Your response (around 50–100 words) would appear as a pullout quote in the article, alongside your name, title, and company, and will be shared with senior executives, policymakers, and partners across The Payments Association's 250+ member companies, including banks, PSPs, acquirers, fintechs, and law firms.

You can view previous reports and articles here: https://thepaymentsassociation.org/hub/payments-intelligence/

The deadline for responses is **XXX**

If this topic isn't quite right, I'd be happy to keep you in mind for future opportunities — we regularly feature perspectives on market trends, regulation, and innovation.

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

    // STEP 1: Create article summary (1-2 lines that work after "examining")
    console.log('\n📝 CREATING ARTICLE SUMMARY...');
    const summaryPrompt = `Create a concise 1-2 line summary for a professional intelligence report email. This summary will appear after the phrase "This piece explores [article title], examining" — so it should flow naturally from that.

Original synopsis:
"${articleData.synopsis}"

Requirements:
- 1-2 lines maximum (aim for 20-35 words)
- Should work grammatically after "examining" (e.g., "the regulatory impact on...", "how emerging trends are...", "key data insights revealing...")
- Professional, analytical tone suited for senior executives
- Focus on what the article examines/analyses/reveals
- Use UK English spelling
- No full stop at the end (the template adds "It will combine..." after this)

Return only the summary text that follows "examining", no additional formatting or quotes.`;

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
    
    // Remove trailing full stop if present (template will add "It will combine..." after)
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
        memberExpertise = member.expertise.join(', ');
      } else if (member.marketSegments && Array.isArray(member.marketSegments) && member.marketSegments.length > 0) {
        memberExpertise = member.marketSegments.join(', ');
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

Generate ONE precise, senior-level, strategic question (25-40 words) that:

CRITICAL - THOUGHT LEADERSHIP FOCUS:
1. Asks about INDUSTRY-WIDE strategic implications, not company-specific solutions
2. Encourages high-level analysis suitable for C-suite executives
3. Seeks insights on trends, challenges, or opportunities facing THE SECTOR
4. Avoids language that would prompt product/service promotion
5. Uses precise, strategic language appropriate for senior leaders
6. Focuses on "what should the industry consider" rather than "what does your company offer"

The question should:
- Be relevant to their area of expertise (but ask about the broader industry, not their company)
- Encourage analytical, objective commentary from a senior strategic perspective
- Inspire a thoughtful 50-100 word response
- Use professional, executive-level tone
- Focus on strategic implications, policy considerations, or market evolution

Examples of GOOD thought leadership questions for senior audiences:
- "What are the key strategic considerations financial institutions should prioritise as this regulation evolves?"
- "From a market dynamics perspective, how might this shift reshape competitive positioning over the next 18-24 months?"
- "What policy implications should industry leaders be considering in response to these developments?"
- "How should senior executives be thinking about the risk-opportunity balance in this emerging trend?"

Examples of BAD questions (too tactical or sales-focused):
- "How is your company addressing this challenge?" ❌
- "What solutions does your organisation offer for this?" ❌
- "What features should providers implement?" ❌

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
                content: 'You are an expert journalist who creates precise, strategic questions for senior executives. Your questions inspire industry-level insights and strategic analysis, not promotional responses. You write for C-suite audiences in the payments sector.'
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

        // Build the email body with the generated question and member expertise
        const emailBody = INTERVIEW_EMAIL_TEMPLATE
          .replace('{subject}', articleData.title)
          .replace('{article_summary}', synopsisSummary)
          .replace('{member_expertise}', memberExpertise)
          .replace('{generated_question}', generatedQuestion);

        return {
          memberId: member.id,
          member: member,
          template: {
            subject: "Payments Intelligence feature request",
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
        const fallbackQuestion = `What are the key strategic implications of ${articleData.title.toLowerCase()} for senior leaders in the payments industry over the next 18-24 months?`;
        
        const fallbackBody = INTERVIEW_EMAIL_TEMPLATE
          .replace('{subject}', articleData.title)
          .replace('{article_summary}', synopsisSummary)
          .replace('{member_expertise}', memberExpertise)
          .replace('{generated_question}', fallbackQuestion);
        
        return {
          memberId: member.id,
          member: member,
          template: {
            subject: "Payments Intelligence feature request",
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