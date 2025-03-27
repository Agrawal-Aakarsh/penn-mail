import { EmailMessage } from "./gmail";

interface ClassificationResult {
  emailId: string;
  category: 'reply' | 'read' | 'archive';
  confidence: number;
  reasoning?: string;
}

interface BatchClassificationResponse {
  success: boolean;
  classifications: ClassificationResult[];
}

interface SingleClassificationResponse {
  success: boolean;
  classification: ClassificationResult;
}

export async function classifyEmail(emailId: string): Promise<SingleClassificationResponse> {
  try {
    const accessToken = localStorage.getItem('gmailAccessToken');
    if (!accessToken) {
      throw new Error('No access token found');
    }

    const response = await fetch(`/api/classify/email/${emailId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to classify email');
    }

    return await response.json();
  } catch (error) {
    console.error('Error classifying email:', error);
    throw error;
  }
}

export async function classifyBatch(emailIds: string[]): Promise<BatchClassificationResponse> {
  try {
    const accessToken = localStorage.getItem('gmailAccessToken');
    if (!accessToken) {
      throw new Error('No access token found');
    }

    const response = await fetch('/api/classify/batch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emailIds }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to classify batch emails');
    }

    return await response.json();
  } catch (error) {
    console.error('Error classifying batch emails:', error);
    throw error;
  }
}

export async function classifyInbox(maxResults: number = 10): Promise<BatchClassificationResponse> {
  try {
    const accessToken = localStorage.getItem('gmailAccessToken');
    if (!accessToken) {
      throw new Error('No access token found');
    }

    const response = await fetch('/api/classify/inbox', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ maxResults }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to classify inbox emails');
    }

    return await response.json();
  } catch (error) {
    console.error('Error classifying inbox emails:', error);
    throw error;
  }
}

export async function getClassifiedEmails(category: 'reply' | 'read' | 'archive'): Promise<EmailMessage[]> {
  try {
    const accessToken = localStorage.getItem('gmailAccessToken');
    if (!accessToken) {
      throw new Error('No access token found');
    }

    // Map category to label name
    const labelMap = {
      'reply': 'NEEDS_REPLY',
      'read': 'TO_READ',
      'archive': 'ARCHIVED_BY_AI'
    };

    const response = await fetch(`/api/emails?label=${labelMap[category]}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to get ${category} emails`);
    }

    const data = await response.json();
    return data.emails || [];
  } catch (error) {
    console.error(`Error fetching ${category} emails:`, error);
    throw error;
  }
}

export default {
  classifyEmail,
  classifyBatch,
  classifyInbox,
  getClassifiedEmails
};
