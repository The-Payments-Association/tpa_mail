import { GoogleGenAI } from '@google/genai';
import { membersDatabase } from '../../lib/membersDatabase';

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
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

    const model = genAI.models.getGenerativeModel({
      model: 'gemini-2.5-flash',
      config: {
        temperature: 0.3,
        response_format: { type: "json_object" }
      }
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

    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }]
    });

    const response = result.response;
    const recommendations = JSON.parse(response.text());
    
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
    console.error('Gemini API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to analyze article and find relevant members' 
    });
  }
}