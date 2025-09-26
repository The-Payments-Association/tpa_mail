import { GoogleGenAI } from '@google/genai';
import { membersDatabase } from '../../../lib/membersDatabase';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(request) {
  const startTime = Date.now();
  console.log('\n🔍 === ARTICLE ANALYSIS STARTED ===');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);

  try {
    const { title, synopsis, fullArticle } = await request.json();
    
    // Log input data
    console.log('\n📝 INPUT DATA:');
    console.log(`📰 Title: ${title}`);
    console.log(`📋 Synopsis length: ${synopsis?.length || 0} characters`);
    console.log(`📄 Full article length: ${fullArticle?.length || 0} characters`);
    console.log(`👥 Database size: ${membersDatabase.length} members`);

  const membersContext = membersDatabase.map(member => ({
  id: member.id,
  company: member.company,
  expertise: member.expertise.join(', '),
  bio: member.bio,
  marketSegments: member.marketSegments?.join(', '),
  geographicFocus: member.geographicFocus?.join(', '),
  interests: member.interests.join(', ')
}));

    console.log('\n🏢 MEMBER COMPANIES BEING ANALYZED:');
    membersDatabase.forEach(member => {
      console.log(`  • ${member.company} (${member.expertise.join(', ')})`);
    });

    const prompt = `You are an expert in the payments and fintech industry. Analyze articles and identify relevant industry contacts for commentary requests.

Your task:
1. Analyze article content for key themes and technologies
2. Match against member database
3. Return 10 most relevant members with scores and reasoning

Focus on thought leadership potential, not sales targets.

Analyze this article for industry commentary opportunities:

**Title:** ${title}
**Synopsis:** ${synopsis}
**Content:** ${fullArticle || 'Not provided'}

**Members:** ${JSON.stringify(membersContext, null, 2)}

Return JSON: {"recommendations": [{"id": 1, "relevanceScore": 85, "reasoning": "Expert in relevant area..."}]}`;

    console.log('\n🤖 SENDING TO GEMINI:');
    console.log(`📏 Prompt length: ${prompt.length} characters`);
    console.log(`🎯 Model: gemini-2.0-flash-exp`);
    console.log(`🌡️ Temperature: 0.3`);

    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json"
      }
    });

    console.log('\n✅ GEMINI RESPONSE RECEIVED:');
    console.log(`📏 Response length: ${response.text?.length || 0} characters`);
    console.log(`📋 Raw response preview: ${response.text?.substring(0, 200)}...`);

    const recommendations = JSON.parse(response.text);
    
    console.log('\n🏆 PARSED RECOMMENDATIONS:');
    console.log(`📊 Number of recommendations: ${recommendations.recommendations?.length || 0}`);
    
    if (recommendations.recommendations) {
      recommendations.recommendations.forEach((rec, index) => {
        const member = membersDatabase.find(m => m.id === rec.id);
        console.log(`\n  ${index + 1}. ${member?.company || 'Unknown'} (ID: ${rec.id})`);
        console.log(`     📈 Score: ${rec.relevanceScore}%`);
        console.log(`     💭 Reasoning: ${rec.reasoning?.substring(0, 100)}...`);
        console.log(`     ✅ Member found: ${member ? 'Yes' : 'No'}`);
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
    console.log(`⏱️ Processing time: ${processingTime}ms`);
    console.log(`📤 Returning ${enrichedRecommendations.length} enriched recommendations`);
    console.log('🔍 === ARTICLE ANALYSIS FINISHED ===\n');

    return NextResponse.json({ 
      success: true, 
      members: enrichedRecommendations 
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('\n❌ GEMINI API ERROR:');
    console.error(`⏱️ Failed after: ${processingTime}ms`);
    console.error(`🚨 Error type: ${error.constructor.name}`);
    console.error(`📝 Error message: ${error.message}`);
    console.error(`📍 Stack trace: ${error.stack}`);
    console.log('🔍 === ARTICLE ANALYSIS FAILED ===\n');
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to analyze article and find relevant members' 
    }, { status: 500 });
  }
}