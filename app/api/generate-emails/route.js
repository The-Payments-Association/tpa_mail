import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const EMAIL_TEMPLATE = `Hi **XXX**,

I'm a data journalist at The Payments Association. I'm writing to offer you the opportunity to provide commentary for my article on {subject}.

{article_summary}

For context: Article commentary is a ~70-word statement included in the 'Industry Voices' section of our articles - along with the person's name, job title, and company - which are shared with our entire membership and through our social media channels.

The deadline for commentary is **XXX**

Let me know if you would like any more information.

Many thanks,`;

export async function POST(request) {
  const startTime = Date.now();
  console.log('\n📧 === EMAIL GENERATION STARTED ===');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);

  try {
    const { articleData, selectedMembers } = await request.json();

    console.log('\n📝 INPUT DATA:');
    console.log(`📰 Article: ${articleData.title}`);
    console.log(`📋 Original synopsis length: ${articleData.synopsis?.length || 0} characters`);
    console.log(`👥 Selected members: ${selectedMembers.length}`);

    // Create a concise max 50-word summary that follows "The article..."
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

    console.log(`📏 Summary prompt length: ${summaryPrompt.length} characters`);

    const summaryResponse = await genAI.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: summaryPrompt,
      config: {
        temperature: 0.4
      }
    });

    let synopsisSummary = '';
    if (typeof summaryResponse.text === 'function') {
      synopsisSummary = await summaryResponse.text();
    } else if (summaryResponse.text) {
      synopsisSummary = summaryResponse.text;
    } else if (summaryResponse.candidates && summaryResponse.candidates[0]) {
      synopsisSummary = summaryResponse.candidates[0].content.parts[0].text;
    }
    
    synopsisSummary = synopsisSummary.trim();
    const summaryWordCount = synopsisSummary.split(/\s+/).length;

    console.log(`✅ Article summary created:`);
    console.log(`📝 Summary: "${synopsisSummary}"`);
    console.log(`📊 Word count: ${summaryWordCount} words`);
    console.log(`📉 Compression: ${articleData.synopsis?.length || 0} → ${synopsisSummary.length} characters`);

    console.log('\n🎯 SELECTED MEMBERS FOR EMAIL GENERATION:');
    selectedMembers.forEach((member, index) => {
      console.log(`  ${index + 1}. ${member.name} (${member.company})`);
      console.log(`     🏷️ Role: ${member.role}`);
      console.log(`     🎯 Expertise: ${member.expertise?.join(', ')}`);
    });

    const systemPrompt = `You are a data journalist at The Payments Association requesting industry commentary.

Create personalised commentary requests using the template. Focus on:
- Direct, professional tone - be concise and to the point
- Clearly explain why their specific expertise is relevant
- Keep the greeting as "Hi **XXX**," (exactly as shown)
- Use the provided article summary after "The article"
- No unnecessary pleasantries or filler content
- Get straight to the purpose`;

    console.log('\n🔄 PROCESSING INDIVIDUAL EMAILS:');

    const emailPromises = selectedMembers.map(async (member, index) => {
      const memberStartTime = Date.now();
      console.log(`\n  📧 ${index + 1}/${selectedMembers.length}: Processing ${member.name} (${member.company})`);

      const userPrompt = `${systemPrompt}

Create commentary request for:

**Company:** ${member.company}
**Expertise:** ${member.expertise.join(', ')}
**Article Title:** ${articleData.title}
**Article Summary (use exactly as provided after "The article"):** ${synopsisSummary}

**Template to customise:** ${EMAIL_TEMPLATE}

Instructions:
1. Keep subject as "TPA Request"
2. Keep greeting as "Hi **XXX**," exactly
3. Replace {subject} with the article title
4. Replace {article_summary} with the provided summary (it already follows "The article")
5. Write one clear, direct sentence explaining why their expertise is valuable for this specific article topic
6. Keep the tone professional but direct - no unnecessary words

Return JSON format:
{"subject": "TPA Request", "body": "Complete personalised email with Hi **XXX**, greeting"}`;

      console.log(`     📏 Prompt length: ${userPrompt.length} characters`);
      console.log(`     🎯 Key expertise areas: ${member.expertise?.slice(0, 3).join(', ')}`);
      console.log(`     📝 Using summary: "${synopsisSummary.substring(0, 50)}..."`);

      try {
        const response = await genAI.models.generateContent({
          model: 'gemini-2.0-flash-exp',
          contents: userPrompt,
          config: {
            temperature: 0.5,
            responseMimeType: "application/json"
          }
        });

        const memberProcessingTime = Date.now() - memberStartTime;
        console.log(`     ✅ Response received (${memberProcessingTime}ms)`);
        
        // Properly extract text from Gemini response
        let responseText = '';
        if (typeof response.text === 'function') {
          responseText = await response.text();
        } else if (response.text) {
          responseText = response.text;
        } else if (response.candidates && response.candidates[0]) {
          responseText = response.candidates[0].content.parts[0].text;
        }
        
        console.log(`     📏 Response length: ${responseText?.length || 0} characters`);
        console.log(`     📋 Raw response preview: ${responseText?.substring(0, 200)}...`);

        // Parse JSON with error handling
        let emailContent;
        try {
          emailContent = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`     ❌ JSON parse error: ${parseError.message}`);
          console.error(`     📋 Raw text: ${responseText}`);
          throw new Error('Failed to parse JSON response from Gemini');
        }
        
        // Ensure subject is always "TPA Request"
        emailContent.subject = "TPA Request";
        
        // Validate that we have body
        if (!emailContent.body) {
          console.error(`     ❌ Missing body in response:`, emailContent);
          throw new Error('Response missing body field');
        }
        
        console.log(`     📧 Subject: ${emailContent.subject}`);
        console.log(`     📝 Body length: ${emailContent.body?.length || 0} characters`);
        
        // Log key personalization elements
        const bodyLower = emailContent.body?.toLowerCase() || '';
        const mentionsExpertise = member.expertise?.some(exp => 
          bodyLower.includes(exp.toLowerCase())
        );
        const mentionsCompany = bodyLower.includes(member.company.toLowerCase());
        const hasXXXGreeting = emailContent.body.includes('Hi **XXX**');
        
        console.log(`     🎯 Personalization check:`);
        console.log(`       • Has "Hi **XXX**" greeting: ${hasXXXGreeting ? '✅' : '❌'}`);
        console.log(`       • Mentions expertise: ${mentionsExpertise ? '✅' : '❌'}`);
        console.log(`       • Mentions company: ${mentionsCompany ? '✅' : '❌'}`);

        // Log snippet of the generated email for quality check
        const emailPreview = emailContent.body?.substring(0, 200) || '';
        console.log(`     📖 Email preview: "${emailPreview}..."`);

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
        console.error(`     ❌ Failed for ${member.name} (${memberProcessingTime}ms):`);
        console.error(`     📝 Error: ${memberError.message}`);
        
        // Return a fallback template
        return {
          memberId: member.id,
          member: member,
          template: {
            subject: "TPA Request",
            body: EMAIL_TEMPLATE
              .replace('{subject}', articleData.title)
              .replace('{article_summary}', synopsisSummary)
              .replace('{company}', member.company)
              .replace('{expertise}', member.expertise.slice(0, 2).join(' and '))
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
    
    console.log('\n📊 EMAIL GENERATION SUMMARY:');
    console.log(`⏱️ Total processing time: ${totalProcessingTime}ms`);
    console.log(`✅ Successful generations: ${generatedEmails.filter(e => !e.error).length}`);
    console.log(`❌ Failed generations: ${generatedEmails.filter(e => e.error).length}`);
    console.log(`📧 Average time per email: ${Math.round(totalProcessingTime / selectedMembers.length)}ms`);

    // Log personalization insights
    const personalizedEmails = generatedEmails.filter(email => {
      const body = email.template.body?.toLowerCase() || '';
      return email.member.expertise?.some(exp => body.includes(exp.toLowerCase()));
    });

    const xxxGreetingCount = generatedEmails.filter(email => {
      return email.template.body.includes('Hi **XXX**');
    }).length;

    console.log(`🎯 Personalization success rate: ${Math.round((personalizedEmails.length / generatedEmails.length) * 100)}%`);
    console.log(`👋 "Hi **XXX**" greeting usage: ${xxxGreetingCount}/${generatedEmails.length} emails`);

    if (generatedEmails.some(e => e.error)) {
      console.log('\n⚠️ GENERATION ERRORS:');
      generatedEmails.filter(e => e.error).forEach(email => {
        console.log(`  • ${email.member.name}: ${email.error}`);
      });
    }

    console.log('\n💡 ARTICLE SUMMARY USED IN EMAILS:');
    console.log(`"${synopsisSummary}"`);
    console.log(`(${summaryWordCount} words, ${synopsisSummary.length} characters)`);

    console.log('\n🎉 EMAIL GENERATION COMPLETE');
    console.log('📧 === EMAIL GENERATION FINISHED ===\n');

    return NextResponse.json({ 
      success: true, 
      emails: generatedEmails,
      synopsisSummary: synopsisSummary
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
      error: 'Failed to generate commentary request emails using Gemini' 
    }, { status: 500 });
  }
}