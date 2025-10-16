import { NextResponse } from 'next/server';
import { checkQuota, recordUsage, parseRateLimitHeaders } from '../../../lib/quotaTracker';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const EMAIL_TEMPLATE = `Dear **XXX**,

I'm a data journalist at the payments association, preparing a feature for payments intelligence — our members-only intelligence platform for senior leaders across the payments ecosystem.

This piece explores {subject} — {article_summary}

I'd value your expert commentary on this topic. Your ~70-word statement would feature in the 'industry voices' section, alongside your name, title, and company, shared with executives and partners across 250+ member companies.

Read previous reports here: https://thepaymentsassociation.org/hub/payments-intelligence/

Deadline: **XXX**

Kind regards,`;

export async function POST(request) {
  const startTime = Date.now();
  console.log('\n📧 === COMMENTARY EMAIL GENERATION STARTED ===');
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
  const quotaStatus = await checkQuota();

    if (!quotaStatus.allowed) {
      console.error('\n❌ QUOTA EXCEEDED');
      console.error(`📊 Tokens used: ${quotaStatus.tokensUsed}`);
      console.error(`📊 Requests used: ${quotaStatus.requestsUsed}`);
      
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
        details: 'Request body must be valid JSON with articleData and selectedMembers fields'
      }, { status: 400 });
    }

    if (!articleData || !articleData.title || !selectedMembers || selectedMembers.length === 0) {
      console.error('\n❌ MISSING REQUIRED FIELDS');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields',
        details: 'Both articleData (with title) and selectedMembers (non-empty array) are required'
      }, { status: 400 });
    }

    console.log('\n📝 INPUT DATA:');
    console.log(`📰 Article: ${articleData.title}`);
    console.log(`📋 Original synopsis length: ${articleData.synopsis?.length || 0} characters`);
    console.log(`👥 Selected members: ${selectedMembers.length}`);

    // Create article summary with improved prompt
    console.log('\n📝 CREATING ARTICLE SUMMARY FOR EMAIL...');
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

    let summaryResponse;
    
    try {
      summaryResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: summaryPrompt
            }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.5
        })
      });
    } catch (fetchError) {
      console.error('\n❌ NETWORK ERROR connecting to Groq API (summary):', fetchError);
      throw new Error(`Network error during summary generation: ${fetchError.message}. Please check your internet connection.`);
    }

    if (!summaryResponse.ok) {
      const errorText = await summaryResponse.text();
      console.error('\n❌ GROQ API ERROR RESPONSE (summary):', errorText);
      
      if (summaryResponse.status === 401) {
        throw new Error('Invalid GROQ_API_KEY. Please check your API key configuration.');
      } else if (summaryResponse.status === 429) {
        throw new Error('Groq API rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`Groq API error during summary (${summaryResponse.status}): ${errorText}`);
      }
    }

    // Parse headers and record usage for summary
    const summaryRateLimitHeaders = parseRateLimitHeaders(summaryResponse.headers);
    const summaryData = await summaryResponse.json();
    
    if (!summaryData.choices || !summaryData.choices[0]) {
      throw new Error('Invalid response format from Groq API for summary generation');
    }
    
  await recordUsage(summaryData.usage?.total_tokens || 0, summaryRateLimitHeaders);    
    console.log(`⚡ Summary generation: ${summaryData.usage?.total_tokens || 0} tokens`);

    let synopsisSummary = summaryData.choices[0].message.content.trim();
    
    // Remove trailing full stop if present
    if (synopsisSummary.endsWith('.')) {
      synopsisSummary = synopsisSummary.slice(0, -1);
    }

    const summaryWordCount = synopsisSummary.split(/\s+/).length;

    console.log(`✅ Article summary created:`);
    console.log(`📝 Summary: "${synopsisSummary}"`);
    console.log(`📊 Word count: ${summaryWordCount} words`);

    console.log('\n🎯 SELECTED MEMBERS FOR COMMENTARY EMAIL GENERATION:');
    selectedMembers.forEach((member, index) => {
      console.log(`  ${index + 1}. ${member.company || member.name || 'Unknown'}`);
    });

    console.log('\n🔄 PROCESSING INDIVIDUAL EMAILS:');

    const emailPromises = selectedMembers.map(async (member, index) => {
      const memberStartTime = Date.now();
      console.log(`\n  📧 ${index + 1}/${selectedMembers.length}: Processing ${member.company || member.name || 'Unknown'}`);

      const templateForPrompt = EMAIL_TEMPLATE
        .replace('{subject}', articleData.title.toLowerCase())
        .replace('{article_summary}', synopsisSummary);

      const userPrompt = `You are generating a professional commentary request email. You MUST preserve all line breaks and formatting exactly as shown in the template.

CRITICAL INSTRUCTIONS:

1. Use the template EXACTLY as provided below
2. Preserve ALL line breaks (empty lines between paragraphs)
3. Keep "Dear **XXX**," exactly as written
4. Keep "Deadline: **XXX**" exactly as written
5. DO NOT add any extra text or sentences
6. DO NOT modify the structure or spacing
7. Keep all branding lowercase: "payments association", "payments intelligence"

When returning JSON, use \\n for line breaks to preserve formatting.

**TEMPLATE (use exactly, preserving all line breaks):**

${templateForPrompt}

Return this exact text as JSON with proper line break encoding:
{"subject": "payments intelligence commentary request", "body": "email with \\n for line breaks"}

REMEMBER: Use \\n in the JSON string to preserve line breaks.`;

      try {
        let emailResponse;
        
        try {
          emailResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messages: [
                {
                  role: 'system',
                  content: 'You follow templates exactly as instructed. You preserve all line breaks and formatting. You use \\n characters in JSON strings for line breaks.'
                },
                {
                  role: 'user',
                  content: userPrompt
                }
              ],
              model: 'llama-3.3-70b-versatile',
              temperature: 0.1,
              response_format: { type: 'json_object' }
            })
          });
        } catch (fetchError) {
          console.error(`     ❌ Network error for ${member.company || 'member'}:`, fetchError);
          throw new Error(`Network error: ${fetchError.message}`);
        }

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error(`     ❌ Groq API error for ${member.company || 'member'}:`, errorText);
          throw new Error(`Groq API error: ${emailResponse.status}`);
        }

        // Parse headers and record usage for each email
        const emailRateLimitHeaders = parseRateLimitHeaders(emailResponse.headers);
        const emailData = await emailResponse.json();
        
        if (!emailData.choices || !emailData.choices[0]) {
          throw new Error('Invalid response format from Groq API');
        }
        
  await recordUsage(emailData.usage?.total_tokens || 0, emailRateLimitHeaders);
        const memberProcessingTime = Date.now() - memberStartTime;
        console.log(`     ✅ Response received (${memberProcessingTime}ms)`);
        console.log(`     ⚡ Tokens used: ${emailData.usage?.total_tokens || 0}`);
        
        let emailContent;
        
        try {
          emailContent = JSON.parse(emailData.choices[0].message.content);
        } catch (jsonError) {
          console.error(`     ❌ JSON parsing error for ${member.company || 'member'}:`, jsonError);
          throw new Error('Failed to parse email response as JSON');
        }
        
        emailContent.subject = "payments intelligence commentary request";
        
        if (!emailContent.body) {
          throw new Error('Email body is missing from response');
        }
        
        if (!emailContent.body.includes('\n') && !emailContent.body.includes('\\n')) {
          console.warn('     ⚠️ No line breaks detected, using fallback template');
          throw new Error('Line breaks not preserved');
        }
        
        emailContent.body = emailContent.body.replace(/\\n/g, '\n');
        
        console.log(`     📧 Subject: ${emailContent.subject}`);
        console.log(`     📝 Body length: ${emailContent.body?.length || 0} characters`);
        console.log(`     📐 Line breaks preserved: ${emailContent.body.includes('\n') ? 'Yes' : 'No'}`);

        return {
          memberId: member.id,
          member: member,
          template: {
            subject: "payments intelligence commentary request",
            body: emailContent.body
          },
          isEdited: false,
          isApproved: false,
          generationTime: memberProcessingTime,
          synopsisSummary: synopsisSummary
        };

      } catch (memberError) {
        const memberProcessingTime = Date.now() - memberStartTime;
        console.error(`     ❌ Failed for ${member.company || member.name || 'Unknown'} (${memberProcessingTime}ms)`);
        console.error(`     📝 Error: ${memberError.message}`);
        
        const fallbackBody = EMAIL_TEMPLATE
          .replace('{subject}', articleData.title.toLowerCase())
          .replace('{article_summary}', synopsisSummary);
        
        console.log('     🔄 Using fallback template with preserved line breaks');
        
        return {
          memberId: member.id,
          member: member,
          template: {
            subject: "payments intelligence commentary request",
            body: fallbackBody
          },
          isEdited: false,
          isApproved: false,
          error: memberError.message,
          generationTime: memberProcessingTime,
          synopsisSummary: synopsisSummary
        };
      }
    });

    console.log('\n⏳ WAITING FOR ALL EMAIL GENERATIONS TO COMPLETE...');
    const generatedEmails = await Promise.all(emailPromises);

    const totalProcessingTime = Date.now() - startTime;
    
    // Get final quota status
  const finalQuota = await checkQuota();    
    console.log('\n📊 COMMENTARY EMAIL GENERATION SUMMARY:');
    console.log(`⏱️ Total processing time: ${totalProcessingTime}ms`);
    console.log(`✅ Successful generations: ${generatedEmails.filter(e => !e.error).length}`);
    console.log(`❌ Failed generations: ${generatedEmails.filter(e => e.error).length}`);
    console.log(`📊 Final quota: ${finalQuota.tokensUsed} tokens used (${finalQuota.percentageUsed}%)`);

    const emailsWithLineBreaks = generatedEmails.filter(e => 
      e.template?.body?.includes('\n')
    ).length;
    console.log(`📐 Emails with preserved line breaks: ${emailsWithLineBreaks}/${generatedEmails.length}`);

    console.log('\n🎉 COMMENTARY EMAIL GENERATION COMPLETE');
    console.log('📧 === COMMENTARY EMAIL GENERATION FINISHED ===\n');

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
    console.error('\n❌ COMMENTARY EMAIL GENERATION ERROR:');
    console.error(`⏱️ Failed after: ${totalProcessingTime}ms`);
    console.error(`🚨 Error type: ${error.constructor.name}`);
    console.error(`📝 Error message: ${error.message}`);
    console.error(`📍 Stack trace: ${error.stack}`);
    console.log('📧 === COMMENTARY EMAIL GENERATION FAILED ===\n');
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to generate commentary request emails',
      details: error.message,
      timestamp: new Date().toISOString(),
      processingTime: totalProcessingTime
    }, { status: 500 });
  }
}