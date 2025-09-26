import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const EMAIL_TEMPLATE = `Hi {name},

I hope you're well

I'm a data journalist at The Payments Association - I'm writing to introduce myself and offer you the opportunity to provide commentary for my article on {subject}.

The article {article_summary}

For context: Article commentary is ~70 word statement which is included in the 'Industry Voices' section of our articles - along with the person's name, job title, and company - which are shared with our entire membership and through our social media channels.

The deadline for commentary is **XXX**

Let me know if you would like any more information

Many thanks,

[Your Name]
The Payments Association`;

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

    // First, create a concise summary of the synopsis
    console.log('\n📝 CREATING SYNOPSIS SUMMARY...');
    const summaryPrompt = `Create a concise 30-40 word summary of this article synopsis for use in a professional email:

"${articleData.synopsis}"

Return only the summary, no additional text. Focus on the key topic and main points.`;

    console.log(`📏 Summary prompt length: ${summaryPrompt.length} characters`);

    const summaryResponse = await genAI.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: summaryPrompt,
      config: {
        temperature: 0.3
      }
    });

    const synopsisSummary = summaryResponse.text.trim();
    const summaryWordCount = synopsisSummary.split(' ').length;

    console.log(`✅ Synopsis summary created:`);
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
- Why their expertise is relevant to the article topic
- Professional, journalistic tone
- Requesting thought leadership, not sales
- Keep date as "**XXX**" for manual entry
- Use the provided article summary (not the original synopsis)`;

    console.log('\n🔄 PROCESSING INDIVIDUAL EMAILS:');

    const emailPromises = selectedMembers.map(async (member, index) => {
      const memberStartTime = Date.now();
      console.log(`\n  📧 ${index + 1}/${selectedMembers.length}: Processing ${member.name} (${member.company})`);

      const userPrompt = `${systemPrompt}

Create commentary request for:

**Member:** ${member.name}, ${member.role} at ${member.company}
**Expertise:** ${member.expertise.join(', ')}
**Article:** ${articleData.title}
**Article Summary (use this in email):** ${synopsisSummary}

**Template to customize:** ${EMAIL_TEMPLATE}

Personalise the email based on their expertise and explain why their specific background makes them ideal for commenting on this article topic. 

Replace {name} with the member's name, {subject} with the article topic, and {article_summary} with the provided summary.

Return JSON format:
{"subject": "Commentary opportunity - [Article Title]", "body": "Complete personalised email"}`;

      console.log(`     📏 Prompt length: ${userPrompt.length} characters`);
      console.log(`     🎯 Key expertise areas: ${member.expertise?.slice(0, 3).join(', ')}`);
      console.log(`     📝 Using summary: "${synopsisSummary.substring(0, 50)}..."`);

      try {
        const response = await genAI.models.generateContent({
          model: 'gemini-2.0-flash-exp',
          contents: userPrompt,
          config: {
            temperature: 0.6,
            responseMimeType: "application/json"
          }
        });

        const memberProcessingTime = Date.now() - memberStartTime;
        console.log(`     ✅ Response received (${memberProcessingTime}ms)`);
        console.log(`     📏 Response length: ${response.text?.length || 0} characters`);

        const emailContent = JSON.parse(response.text);
        
        console.log(`     📧 Subject generated: ${emailContent.subject?.substring(0, 50)}...`);
        console.log(`     📝 Body length: ${emailContent.body?.length || 0} characters`);
        
        // Log key personalization elements
        const bodyLower = emailContent.body?.toLowerCase() || '';
        const mentionsExpertise = member.expertise?.some(exp => 
          bodyLower.includes(exp.toLowerCase())
        );
        const mentionsCompany = bodyLower.includes(member.company.toLowerCase());
        const includesSummary = bodyLower.includes(synopsisSummary.toLowerCase().substring(0, 20));
        
        console.log(`     🎯 Personalization check:`);
        console.log(`       • Mentions expertise: ${mentionsExpertise ? '✅' : '❌'}`);
        console.log(`       • Mentions company: ${mentionsCompany ? '✅' : '❌'}`);
        console.log(`       • Includes member name: ${bodyLower.includes(member.name.toLowerCase()) ? '✅' : '❌'}`);
        console.log(`       • Uses summary: ${includesSummary ? '✅' : '❌'}`);

        // Log snippet of the generated email for quality check
        const emailPreview = emailContent.body?.substring(0, 200) || '';
        console.log(`     📖 Email preview: "${emailPreview}..."`);

        return {
          memberId: member.id,
          member: member,
          template: {
            subject: emailContent.subject,
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
        
        // Return a fallback template with the summarized synopsis
        return {
          memberId: member.id,
          member: member,
          template: {
            subject: `Commentary opportunity - ${articleData.title}`,
            body: EMAIL_TEMPLATE
              .replace('{name}', member.name)
              .replace('{subject}', articleData.title)
              .replace('{article_summary}', synopsisSummary)
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

    const summaryUsageCount = generatedEmails.filter(email => {
      const body = email.template.body?.toLowerCase() || '';
      return body.includes(synopsisSummary.toLowerCase().substring(0, 20));
    }).length;

    console.log(`🎯 Personalization success rate: ${Math.round((personalizedEmails.length / generatedEmails.length) * 100)}%`);
    console.log(`📝 Synopsis summary usage: ${summaryUsageCount}/${generatedEmails.length} emails`);

    if (generatedEmails.some(e => e.error)) {
      console.log('\n⚠️ GENERATION ERRORS:');
      generatedEmails.filter(e => e.error).forEach(email => {
        console.log(`  • ${email.member.name}: ${email.error}`);
      });
    }

    console.log('\n💡 SYNOPSIS SUMMARY USED IN EMAILS:');
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