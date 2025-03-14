export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  label: string;
  unread?: boolean;
}

export interface EmailResponse {
  emails: EmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export default class GmailService {
  private accessToken: string;
  private baseUrl = 'http://localhost:3001/api';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async listEmails(
    label: 'inbox' | 'sent' | 'draft',
    options?: { pageToken?: string; search?: string }
  ): Promise<EmailResponse> {
    const queryParams = new URLSearchParams({
      label,
      ...(options?.pageToken && { pageToken: options.pageToken }),
      ...(options?.search && { search: options.search })
    });

    return this.request<EmailResponse>(`/emails?${queryParams}`);
  }

  async getEmail(messageId: string): Promise<EmailMessage | null> {
    try {
      return await this.request<EmailMessage>(`/emails/${messageId}`);
    } catch (error) {
      console.error('Error fetching email:', error);
      return null;
    }
  }

  async sendEmail(to: string, subject: string, content: string): Promise<boolean> {
    try {
      await this.request('/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, subject, content }),
      });
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async saveDraft(to: string, subject: string, content: string): Promise<boolean> {
    try {
      await this.request('/emails/draft', {
        method: 'POST',
        body: JSON.stringify({ to, subject, content }),
      });
      return true;
    } catch (error) {
      console.error('Error saving draft:', error);
      return false;
    }
  }
} 