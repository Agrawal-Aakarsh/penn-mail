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
  
  async classifyBatch(accessToken: string, emailIds: string[]): Promise<ClassificationResult[]> {
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
      
      // 3. Apply classifications
      await Promise.all(classifications.map(classification => 
        this.applyClassification(accessToken, classification)
      ));
      
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
    const gmail = this.getGmailClient(accessToken);
    
    switch (classification.category) {
      case 'reply':
        // Add custom label "NEEDS_REPLY"
        await this.ensureLabelExists(gmail, 'NEEDS_REPLY', 'Needs Reply');
        await this.addLabel(gmail, classification.emailId, 'NEEDS_REPLY');
        break;
        
      case 'read':
        // Add custom label "TO_READ"
        await this.ensureLabelExists(gmail, 'TO_READ', 'To Read');
        await this.addLabel(gmail, classification.emailId, 'TO_READ');
        break;
        
      case 'archive':
        // Remove from inbox (archive)
        await this.removeLabel(gmail, classification.emailId, 'INBOX');
        // Add custom label "ARCHIVED_BY_AI"
        await this.ensureLabelExists(gmail, 'ARCHIVED_BY_AI', 'Archived by AI');
        await this.addLabel(gmail, classification.emailId, 'ARCHIVED_BY_AI');
        break;
    }
  }
  
  private async ensureLabelExists(gmail: any, labelId: string, labelName: string): Promise<string> {
    try {
      // Check if label already exists
      const response = await gmail.users.labels.list({ userId: 'me' });
      const existingLabel = response.data.labels.find((label: any) => 
        label.name === labelName || label.id === labelId
      );
      
      if (existingLabel) {
        return existingLabel.id;
      }
      
      // Create label if it doesn't exist
      const createResponse = await gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: labelName,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show'
        }
      });
      
      return createResponse.data.id;
    } catch (error) {
      console.error(`Error ensuring label ${labelName} exists:`, error);
      throw error;
    }
  }
  
  private async addLabel(gmail: any, emailId: string, labelId: string): Promise<void> {
    try {
      await gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: {
          addLabelIds: [labelId]
        }
      });
    } catch (error) {
      console.error(`Error adding label ${labelId} to email ${emailId}:`, error);
      throw error;
    }
  }
  
  private async removeLabel(gmail: any, emailId: string, labelId: string): Promise<void> {
    try {
      await gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: {
          removeLabelIds: [labelId]
        }
      });
    } catch (error) {
      console.error(`Error removing label ${labelId} from email ${emailId}:`, error);
      throw error;
    }
  }
}

export default new ClassificationService();
