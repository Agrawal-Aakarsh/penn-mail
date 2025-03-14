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

interface DraftResponse {
  success: boolean;
  draftId: string;
}

export default class GmailService {
  private accessToken: string;
  private baseUrl = 'http://localhost:3001';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    console.log('Making request to:', `${this.baseUrl}/api${endpoint}`);
    const response = await fetch(`${this.baseUrl}/api${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
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

    if (label === 'draft') {
      return this.request<EmailResponse>(`/emails/drafts?${queryParams}`);
    }
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
      await this.request('/emails/send', {
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

  async saveDraft(to: string, subject: string, content: string): Promise<string> {
    const response = await this.request('/emails/draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, content }),
    }) as DraftResponse;
    return response.draftId;
  }

  async updateDraft(draftId: string, to: string, subject: string, content: string): Promise<string> {
    console.log('Updating draft:', { draftId, to, subject, contentLength: content.length });
    const cleanDraftId = draftId.replace(/^s:/, '');
    const response = await this.request(`/emails/draft/${cleanDraftId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, content }),
    }) as DraftResponse;
    return response.draftId;
  }
} 