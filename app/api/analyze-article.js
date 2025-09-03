import OpenAI from 'openai';
import { membersDatabase } from '../../lib/membersDatabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { title, synopsis, fullArticle } = req.body;

    const membersContext = membersDatabase.map(member => ({
      id: member.id,
      name: member.name,
      role: member.role,
      company: member.company,
      expertise: member.expertise.join(', '),
      bio: member.bio,
      recentWork: member.recentWork,
      interests: member.interests.join(', ')
    }));

    const systemPrompt = `You are an expert in the payments and fintech industry. Analyze articles and identify relevant industry contacts for commentary requests.

Your task:
1. Analyze article content for key themes and technologies
2. Match against member database
3. Return 10 most relevant members with scores and reasoning

Focus on thought leadership potential, not sales targets.`;

    const userPrompt = `Analyze this article for industry commentary opportunities:

**Title:** ${title}
**Synopsis:** ${synopsis}
**Content:** ${fullArticle || 'Not provided'}

**Members:** ${JSON.stringify(membersContext, null, 2)}

Return JSON: {"recommendations": [{"id": 1, "relevanceScore": 85, "reasoning": "Expert in relevant area..."}]}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-nano", // Updated to cheapest model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const recommendations = JSON.parse(completion.choices[0].message.content);
    
    const enrichedRecommendations = recommendations.recommendations.map(rec => {
      const member = membersDatabase.find(m => m.id === rec.id);
      return {
        ...member,
        relevanceScore: rec.relevanceScore,
        reasoning: rec.reasoning
      };
    });

    res.status(200).json({ 
      success: true, 
      members: enrichedRecommendations 
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to analyze article and find relevant members' 
    });
  }
}