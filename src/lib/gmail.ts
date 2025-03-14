export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body?: string;
}

class GmailService {
  private baseUrl = 'http://localhost:3001/api';
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async listEmails(maxResults: number = 20): Promise<EmailMessage[]> {
    try {
      return await this.fetchWithAuth('/emails');
    } catch (error) {
      console.error('Error listing emails:', error);
      return [];
    }
  }

  async getEmail(messageId: string): Promise<EmailMessage | null> {
    try {
      return await this.fetchWithAuth(`/emails/${messageId}`);
    } catch (error) {
      console.error('Error fetching email:', error);
      return null;
    }
  }

  async sendEmail(to: string, subject: string, content: string): Promise<boolean> {
    try {
      await this.fetchWithAuth('/emails/send', {
        method: 'POST',
        body: JSON.stringify({ to, subject, content }),
      });
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }
}

export default GmailService; 