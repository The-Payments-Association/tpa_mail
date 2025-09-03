import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { articleData, selectedMembers } = req.body;

    const systemPrompt = `You are a data journalist at The Payments Association requesting industry commentary.

Create personalized commentary requests using the template. Focus on:
- Why their expertise is relevant
- Professional, journalistic tone
- Requesting thought leadership, not sales
- Keep date as "**XXX**" for manual entry`;

    const emailPromises = selectedMembers.map(async (member) => {
      const userPrompt = `Create commentary request for:

**Member:** ${member.name}, ${member.role} at ${member.company}
**Expertise:** ${member.expertise.join(', ')}
**Article:** ${articleData.title}
**Synopsis:** ${articleData.synopsis}

**Template:** ${EMAIL_TEMPLATE}

Personalize based on their expertise. Return JSON:
{"subject": "Commentary opportunity - [Article Title]", "body": "Complete email"}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-5-nano", // Updated to cheapest model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.6,
        response_format: { type: "json_object" }
      });

      const emailContent = JSON.parse(completion.choices[0].message.content);
      
      return {
        memberId: member.id,
        member: member,
        template: {
          subject: emailContent.subject,
          body: emailContent.body
        },
        isEdited: false,
        isApproved: false
      };
    });

    const generatedEmails = await Promise.all(emailPromises);

    res.status(200).json({ 
      success: true, 
      emails: generatedEmails 
    });

  } catch (error) {
    console.error('Email generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate commentary request emails' 
    });
  }
}