// src/services/classificationService.ts
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import preprocessingService from './preprocessingService';
import openAiService from './openAiService';

interface ClassificationResult {
  emailId: string;
  category: 'reply' | 'read' | 'archive';
  confidence: number;
  reasoning?: string;
}

class ClassificationService {
  private getGmailClient(accessToken: string) {
    const auth = new OAuth2Client();
    auth.setCredentials({ access_token: accessToken });
    return google.gmail({ version: 'v1', auth });
  }

  async classifyEmail(accessToken: string, emailId: string): Promise<ClassificationResult> {
    try {
      // 1. Get the email from Gmail API
      const gmail = this.getGmailClient(accessToken);
      const emailData = await gmail.users.messages.get({
        userId: 'me',
        id: emailId,
        format: 'full',
      });
      
      // 2. Process the email data for LLM
      const message = emailData.data;
      const headers = message.payload?.headers || [];
      
      const email = {
        id: message.id || '',
        subject: headers.find(h => h.name === 'Subject')?.value || '(no subject)',
        from: headers.find(h => h.name === 'From')?.value || '',
        date: headers.find(h => h.name === 'Date')?.value || '',
        snippet: message.snippet || '',
        body: this.extractBody(message) || ''
      };
      
      // 3. Prepare data for OpenAI
      const processedEmail = preprocessingService.prepareEmailForClassification(email);
      const formattedContent = preprocessingService.formatSingleEmailForLLM(processedEmail);
      
      // 4. Get classification from OpenAI
      const classification = await openAiService.classifyEmail(formattedContent);
      classification.emailId = emailId;
      
      // 5. Apply the classification
      await this.applyClassification(accessToken, classification);
      
      return classification;
    } catch (error) {
      console.error('Error classifying email:', error);
      throw error;
    }
  }
  
  async classifyBatch(accessToken: string, emailIds: string[], applyLabels: boolean = true): Promise<ClassificationResult[]> {
    try {
      const gmail = this.getGmailClient(accessToken);
      
      // 1. Fetch emails in batch
      const emailsData = await Promise.all(emailIds.map(async id => {
        try {
          const response = await gmail.users.messages.get({
            userId: 'me',
            id: id,
            format: 'full',
          });
          
          const message = response.data;
          const headers = message.payload?.headers || [];
          
          const email = {
            id: message.id || '',
            subject: headers.find(h => h.name === 'Subject')?.value || '(no subject)',
            from: headers.find(h => h.name === 'From')?.value || '',
            date: headers.find(h => h.name === 'Date')?.value || '',
            snippet: message.snippet || '',
            body: this.extractBody(message) || ''
          };
          
          const processedEmail = preprocessingService.prepareEmailForClassification(email);
          return {
            id,
            content: preprocessingService.formatSingleEmailForLLM(processedEmail)
          };
        } catch (error) {
          console.error(`Error fetching email ${id}:`, error);
          return { id, content: '' };
        }
      }));
      
      // 2. Classify emails with valid content
      const validEmailsData = emailsData.filter(email => email.content);
      const classifications = await openAiService.batchClassifyEmails(validEmailsData);
      
      // 3. Apply classifications if requested
      if (applyLabels) {
        await Promise.all(classifications.map(classification => 
          this.applyClassification(accessToken, classification)
        ));
      }
      
      return classifications;
    } catch (error) {
      console.error('Error in batch classification:', error);
      throw error;
    }
  }
  
  private extractBody(message: any): string {
    // Extract body text from message
    if (!message.payload) return '';
    
    const extractTextFromPart = (part: any): string => {
      if (part.body?.data) {
        const bodyData = part.body.data
          .replace(/-/g, '+')
          .replace(/_/g, '/');
        return Buffer.from(bodyData, 'base64').toString('utf-8');
      }
      
      if (part.parts) {
        return part.parts.map((p: any) => extractTextFromPart(p)).join('\n');
      }
      
      return '';
    };
    
    return extractTextFromPart(message.payload);
  }
  
  private async applyClassification(accessToken: string, classification: ClassificationResult): Promise<void> {
    // No longer modifying Gmail labels, just returning the classification
    return;
  }
}

export default new ClassificationService();
