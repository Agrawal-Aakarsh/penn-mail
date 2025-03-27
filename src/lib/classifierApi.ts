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

const BASE_URL = 'http://localhost:3001';

export async function classifyEmail(emailId: string): Promise<SingleClassificationResponse> {
  try {
    const accessToken = localStorage.getItem('gmail_access_token');
    if (!accessToken) {
      throw new Error('No access token found');
    }

    const response = await fetch(`${BASE_URL}/api/classify/email/${emailId}`, {
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
    const accessToken = localStorage.getItem('gmail_access_token');
    if (!accessToken) {
      throw new Error('No access token found');
    }

    const response = await fetch(`${BASE_URL}/api/classify/batch`, {
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
    const accessToken = localStorage.getItem('gmail_access_token');
    if (!accessToken) {
      throw new Error('No access token found');
    }

    const response = await fetch(`${BASE_URL}/api/classify/inbox`, {
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
    const accessToken = localStorage.getItem('gmail_access_token');
    if (!accessToken) {
      throw new Error('No access token found');
    }

    // Get all inbox emails
    const response = await fetch(`${BASE_URL}/api/emails?label=inbox`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to get inbox emails`);
    }

    const data = await response.json();
    const inboxEmails: EmailMessage[] = data.emails || [];

    // Get classifications for all emails without applying labels
    const response2 = await fetch(`${BASE_URL}/api/classify/batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        emailIds: inboxEmails.map(email => email.id),
        applyLabels: false // Add this flag to indicate we don't want to apply labels
      }),
    });

    if (!response2.ok) {
      const errorData = await response2.json();
      throw new Error(errorData.error || 'Failed to get classifications');
    }

    const classifications = await response2.json();

    // Filter emails based on the requested category
    return inboxEmails.filter((email: EmailMessage) => {
      const classification = classifications.classifications.find((c: ClassificationResult) => c.emailId === email.id);
      return classification?.category === category;
    });
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
