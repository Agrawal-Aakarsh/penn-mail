import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import GmailService, { EmailMessage } from './gmail';
import { useClassifier } from '@/hooks/useClassifier';

interface EmailContextValue {
  emails: {
    inbox: EmailMessage[];
    sent: EmailMessage[];
    drafts: EmailMessage[];
    reply: EmailMessage[];
    read: EmailMessage[];
    archive: EmailMessage[];
  };
  loading: boolean;
  error: string | null;
  selectedEmail: EmailMessage | null;
  setSelectedEmail: (email: EmailMessage | null) => void;
  refreshEmails: (label: string, options?: { pageToken?: string; search?: string }) => Promise<any>;
  gmailService: GmailService;
  // Classifier specific methods
  isClassifying: boolean;
  classifyCurrentEmail: () => Promise<any>;
  classifySelectedEmails: (emailIds: string[]) => Promise<any>;
  classifyInbox: (maxResults?: number) => Promise<any>;
  refreshClassifiedEmails: () => Promise<void>;
}

interface EmailProviderProps {
  children: ReactNode;
  accessToken?: string; // OAuth access token for GmailService
}

const EmailContext = createContext<EmailContextValue | undefined>(undefined);

export const EmailProvider: React.FC<EmailProviderProps> = ({ children, accessToken = '' }) => {
  const [emails, setEmails] = useState<{
    inbox: EmailMessage[];
    sent: EmailMessage[];
    drafts: EmailMessage[];
    reply: EmailMessage[];
    read: EmailMessage[];
    archive: EmailMessage[];
  }>({
    inbox: [],
    sent: [],
    drafts: [],
    reply: [],
    read: [],
    archive: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [gmailService] = useState(() => new GmailService(accessToken));
  
  // Initialize classifier hook
  const { 
    isClassifying, 
    classifiedEmails, 
    classifyEmail, 
    classifyBatch, 
    classifyInbox: classifyInboxEmails,
    refreshAllCategories
  } = useClassifier();

  useEffect(() => {
    // Update emails state when classified emails change
    setEmails(prev => ({
      ...prev,
      reply: classifiedEmails.reply,
      read: classifiedEmails.read,
      archive: classifiedEmails.archive
    }));
  }, [classifiedEmails]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        
        // Initialize with inbox emails
        await refreshEmails('inbox');
        
        // Also load classified emails
        await refreshAllCategories();
        
        setLoading(false);
      } catch (error) {
        console.error('Error initializing emails:', error);
        setError('Failed to load emails. Please try again later.');
        setLoading(false);
      }
    };

    init();
  }, []);

  const refreshEmails = async (label: string, options?: { pageToken?: string; search?: string }) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fix: Use the correct method (listEmails) from GmailService
      const validLabel = label === 'inbox' || label === 'sent' || label === 'draft' 
        ? (label as 'inbox' | 'sent' | 'draft') 
        : 'inbox';
      
      const response = await gmailService.listEmails(validLabel, options);
      
      const newEmails = response.emails || [];

      // Update only the appropriate category
      setEmails(prev => {
        if (label === 'inbox') {
          return { ...prev, inbox: options?.pageToken ? [...prev.inbox, ...newEmails] : newEmails };
        } else if (label === 'sent') {
          return { ...prev, sent: options?.pageToken ? [...prev.sent, ...newEmails] : newEmails };
        } else if (label === 'draft') {
          return { ...prev, drafts: options?.pageToken ? [...prev.drafts, ...newEmails] : newEmails };
        }
        return prev;
      });
      
      return response;
    } catch (error) {
      console.error('Error refreshing emails:', error);
      setError('Failed to refresh emails');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Classifier specific methods
  const classifyCurrentEmail = async () => {
    if (!selectedEmail) {
      return null;
    }
    return await classifyEmail(selectedEmail.id);
  };

  const classifySelectedEmails = async (emailIds: string[]) => {
    return await classifyBatch(emailIds);
  };

  const classifyInbox = async (maxResults: number = 10) => {
    return await classifyInboxEmails(maxResults);
  };

  const refreshClassifiedEmails = async () => {
    await refreshAllCategories();
  };

  return (
    <EmailContext.Provider
      value={{
        emails,
        loading,
        error,
        selectedEmail,
        setSelectedEmail,
        refreshEmails,
        gmailService,
        // Classifier methods
        isClassifying,
        classifyCurrentEmail,
        classifySelectedEmails,
        classifyInbox,
        refreshClassifiedEmails
      }}
    >
      {children}
    </EmailContext.Provider>
  );
};

export const useEmail = (): EmailContextValue => {
  const context = useContext(EmailContext);
  if (context === undefined) {
    throw new Error('useEmail must be used within an EmailProvider');
  }
  return context;
};
