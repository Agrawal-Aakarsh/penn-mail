// src/services/preprocessingService.ts
interface EmailData {
    id: string;
    subject: string;
    from: string;
    snippet: string;
    body: string;
    date: string;
  }
  
  export function prepareEmailForClassification(email: any): EmailData {
    // Extract relevant data from email for classification
    const emailData: EmailData = {
      id: email.id || '',
      subject: email.subject || '(no subject)',
      from: email.from || '',
      snippet: email.snippet || '',
      body: email.body || '',
      date: email.date || '',
    };
    
    // Clean HTML tags from body
    emailData.body = emailData.body
      .replace(/<[^>]*>/g, ' ') // Replace HTML tags with spaces
      .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
      .trim();                  // Trim whitespace
    
    return emailData;
  }
  
  export function formatSingleEmailForLLM(email: EmailData): string {
    // Format email for LLM analysis with context
    return (
      `From: ${email.from}\n` +
      `Subject: ${email.subject}\n` +
      `Date: ${email.date}\n` +
      `Content: ${email.body.substring(0, 2000)}` // Limit content length for token constraints
    );
  }
  
  export default {
    prepareEmailForClassification,
    formatSingleEmailForLLM
  };
  