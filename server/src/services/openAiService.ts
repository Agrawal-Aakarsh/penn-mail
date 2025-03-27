import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

interface ClassificationResult {
  emailId: string;
  category: 'reply' | 'read' | 'archive';
  confidence: number;
  reasoning?: string;
}

class OpenAIService {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  async classifyEmail(emailContent: string): Promise<ClassificationResult> {
    try {
      const prompt = `
Please analyze the following email and classify it into one of these categories:
- "reply": Email requires a response or contains the word reply anywhere in the email
- "read": Email should be read but doesn't need immediate response
- "archive": Email can be archived without reading in detail

Email content:
${emailContent}

Respond with a JSON object containing:
{
  "category": "reply" or "read" or "archive",
 
}
      `;
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an AI assistant helping with email classification.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      });
      
      const result = response.choices[0]?.message?.content;
      
      if (!result) {
        throw new Error('No response from OpenAI');
      }
      
      try {
        const parsedResult = JSON.parse(result);
        return {
          emailId: '', // Will be set by the calling function
          category: parsedResult.category,
          confidence: parsedResult.confidence,
          reasoning: parsedResult.reasoning
        };
      } catch (error) {
        console.error('Failed to parse OpenAI response as JSON:', result);
        
        // Fallback: extract category from text response
        if (result.includes('reply')) {
          return { emailId: '', category: 'reply', confidence: 0.7 };
        } else if (result.includes('read')) {
          return { emailId: '', category: 'read', confidence: 0.7 };
        } else {
          return { emailId: '', category: 'archive', confidence: 0.7 };
        }
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      // Default to "read" on errors
      return { emailId: '', category: 'read', confidence: 0.5 };
    }
  }
  
  async batchClassifyEmails(emailsData: { id: string, content: string }[]): Promise<ClassificationResult[]> {
    // Process emails in parallel with rate limiting
    const results: ClassificationResult[] = [];
    const batchSize = 3; // Process 3 emails at a time to avoid rate limits
    
    for (let i = 0; i < emailsData.length; i += batchSize) {
      const batch = emailsData.slice(i, i + batchSize);
      const batchPromises = batch.map(async (email) => {
        const result = await this.classifyEmail(email.content);
        result.emailId = email.id;
        return result;
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }
}

export default new OpenAIService();
