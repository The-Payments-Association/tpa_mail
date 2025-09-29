import { NextResponse } from 'next/server';
import { checkQuota, recordUsage, parseRateLimitHeaders } from '../../../lib/quotaTracker';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const EMAIL_TEMPLATE = `Hi **XXX**,

I'm a data journalist at The Payments Association. I'm writing to offer you the opportunity to provide commentary for my article on {subject}.

{article_summary}

Article commentary is a ~70-word statement included in the 'Industry Voices' section of our articles - along with the commenter's name, job title, and company. These articles are shared with our entire membership and through our social media channels.

The deadline for commentary is **XXX**

Let me know if you would like any more information.

Many thanks,`;

export async function POST(request) {
  const startTime = Date.now();
  console.log('\n📧 === EMAIL GENERATION STARTED ===');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);

  try {
    // CHECK QUOTA FIRST
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

    const { articleData, selectedMembers } = await request.json();

    console.log('\n📝 INPUT DATA:');
    console.log(`📰 Article: ${articleData.title}`);
    console.log(`📋 Original synopsis length: ${articleData.synopsis?.length || 0} characters`);
    console.log(`👥 Selected members: ${selectedMembers.length}`);

    // Create article summary
    console.log('\n📝 CREATING ARTICLE SUMMARY FOR EMAIL...');
    const summaryPrompt = `Create a concise, direct summary for use in a professional email outreach. The summary should follow the phrase "The article" and be written in a clear, to-the-point tone.

Original synopsis:
"${articleData.synopsis}"

Requirements:
- Maximum 50 words (shorter is better if it captures the key points)
- Should start naturally after "The article" (e.g., "explores...", "examines...", "analyses...")
- Direct, professional tone - no fluff
- Focus on the core insight or value proposition
- Use UK English spelling

Return only the summary text, no additional formatting or quotes.`;

    const summaryResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
        temperature: 0.4
      })
    });

    if (!summaryResponse.ok) {
      const error = await summaryResponse.text();
      throw new Error(`Groq API error: ${summaryResponse.status} - ${error}`);
    }

    // Parse headers and record usage for summary
    const summaryRateLimitHeaders = parseRateLimitHeaders(summaryResponse.headers);
    const summaryData = await summaryResponse.json();
    recordUsage(summaryData.usage?.total_tokens || 0, summaryRateLimitHeaders);
    
    console.log(`⚡ Summary generation: ${summaryData.usage?.total_tokens || 0} tokens`);

    const synopsisSummary = summaryData.choices[0].message.content.trim();
    const summaryWordCount = synopsisSummary.split(/\s+/).length;

    console.log(`✅ Article summary created:`);
    console.log(`📝 Summary: "${synopsisSummary}"`);
    console.log(`📊 Word count: ${summaryWordCount} words`);

    console.log('\n🎯 SELECTED MEMBERS FOR EMAIL GENERATION:');
    selectedMembers.forEach((member, index) => {
      console.log(`  ${index + 1}. ${member.company}`);
    });

    console.log('\n🔄 PROCESSING INDIVIDUAL EMAILS:');

    const emailPromises = selectedMembers.map(async (member, index) => {
      const memberStartTime = Date.now();
      console.log(`\n  📧 ${index + 1}/${selectedMembers.length}: Processing ${member.company}`);

      const templateForPrompt = EMAIL_TEMPLATE
        .replace('{subject}', articleData.title)
        .replace('{article_summary}', synopsisSummary);

      const userPrompt = `You are generating a professional email. You MUST preserve all line breaks and formatting exactly as shown in the template.

CRITICAL INSTRUCTIONS:

1. Use the template EXACTLY as provided below
2. Preserve ALL line breaks (empty lines between paragraphs)
3. Keep "Hi **XXX**," exactly as written
4. Keep "The deadline for commentary is **XXX**" exactly as written
5. DO NOT add any extra text or sentences
6. DO NOT modify the structure or spacing

When returning JSON, use \\n for line breaks to preserve formatting.

**TEMPLATE (use exactly, preserving all line breaks):**

${templateForPrompt}

Return this exact text as JSON with proper line break encoding:
{"subject": "TPA Request", "body": "email with \\n for line breaks"}

REMEMBER: Use \\n in the JSON string to preserve line breaks.`;

      try {
        const emailResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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

        if (!emailResponse.ok) {
          throw new Error(`Groq API error: ${emailResponse.status}`);
        }

        // Parse headers and record usage for each email
        const emailRateLimitHeaders = parseRateLimitHeaders(emailResponse.headers);
        const emailData = await emailResponse.json();
        recordUsage(emailData.usage?.total_tokens || 0, emailRateLimitHeaders);

        const memberProcessingTime = Date.now() - memberStartTime;
        console.log(`     ✅ Response received (${memberProcessingTime}ms)`);
        console.log(`     ⚡ Tokens used: ${emailData.usage?.total_tokens || 0}`);
        
        let emailContent = JSON.parse(emailData.choices[0].message.content);
        
        emailContent.subject = "TPA Request";
        
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
            subject: "TPA Request",
            body: emailContent.body
          },
          isEdited: false,
          isApproved: false,
          generationTime: memberProcessingTime,
          synopsisSummary: synopsisSummary
        };

      } catch (memberError) {
        const memberProcessingTime = Date.now() - memberStartTime;
        console.error(`     ❌ Failed for ${member.company} (${memberProcessingTime}ms)`);
        console.error(`     📝 Error: ${memberError.message}`);
        
        const fallbackBody = EMAIL_TEMPLATE
          .replace('{subject}', articleData.title)
          .replace('{article_summary}', synopsisSummary);
        
        console.log('     🔄 Using fallback template with preserved line breaks');
        
        return {
          memberId: member.id,
          member: member,
          template: {
            subject: "TPA Request",
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
    const finalQuota = checkQuota();
    
    console.log('\n📊 EMAIL GENERATION SUMMARY:');
    console.log(`⏱️ Total processing time: ${totalProcessingTime}ms`);
    console.log(`✅ Successful generations: ${generatedEmails.filter(e => !e.error).length}`);
    console.log(`❌ Failed generations: ${generatedEmails.filter(e => e.error).length}`);
    console.log(`📊 Final quota: ${finalQuota.tokensUsed} tokens used (${finalQuota.percentageUsed}%)`);

    const emailsWithLineBreaks = generatedEmails.filter(e => 
      e.template?.body?.includes('\n')
    ).length;
    console.log(`📐 Emails with preserved line breaks: ${emailsWithLineBreaks}/${generatedEmails.length}`);

    console.log('\n🎉 EMAIL GENERATION COMPLETE');
    console.log('📧 === EMAIL GENERATION FINISHED ===\n');

    return NextResponse.json({ 
      success: true, 
      emails: generatedEmails,
      synopsisSummary: synopsisSummary,
      quotaStatus: {
        percentageUsed: finalQuota.percentageUsed,
        tokensRemaining: finalQuota.tokensRemaining
      }
    });

  } catch (error) {
    const totalProcessingTime = Date.now() - startTime;
    console.error('\n❌ EMAIL GENERATION ERROR:');
    console.error(`⏱️ Failed after: ${totalProcessingTime}ms`);
    console.error(`🚨 Error type: ${error.constructor.name}`);
    console.error(`📝 Error message: ${error.message}`);
    console.error(`📍 Stack trace: ${error.stack}`);
    console.log('📧 === EMAIL GENERATION FAILED ===\n');
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to generate commentary request emails' 
    }, { status: 500 });
  }
}