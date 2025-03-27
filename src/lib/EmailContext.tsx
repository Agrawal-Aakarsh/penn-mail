import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
  classifiedEmails: {
    reply: EmailMessage[];
    read: EmailMessage[];
    archive: EmailMessage[];
  };
  classifyCurrentEmail: () => Promise<any>;
  classifySelectedEmails: (emailIds: string[]) => Promise<any>;
  classifyInbox: (maxResults?: number) => Promise<any>;
  refreshClassifiedEmails: () => Promise<void>;
}

interface EmailProviderProps {
  children: ReactNode;
  accessToken: string; // Required OAuth access token
}

const EmailContext = createContext<EmailContextValue | undefined>(undefined);

export const EmailProvider: React.FC<EmailProviderProps> = ({ children, accessToken }) => {
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
    console.log('[DEBUG] Classified emails updated:', classifiedEmails);
    setEmails(prev => {
      const newState = {
        ...prev,
        reply: classifiedEmails.reply,
        read: classifiedEmails.read,
        archive: classifiedEmails.archive
      };
      console.log('[DEBUG] New email state:', newState);
      return newState;
    });
  }, [classifiedEmails]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Initialize with inbox emails
        await refreshEmails('inbox');
        
        // Load classified emails after inbox is loaded
        if (refreshAllCategories) {
          console.log('[DEBUG] Loading initial classified emails');
          await refreshAllCategories();
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error initializing emails:', error);
        setError('Failed to load emails. Please try again later.');
        setLoading(false);
      }
    };

    if (accessToken) {
      init();
    }
  }, [accessToken, refreshAllCategories]);

  const refreshEmails = async (label: string, options?: { pageToken?: string; search?: string }) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[DEBUG] Refreshing emails:', { label, options });
      
      const validLabel = label === 'inbox' || label === 'sent' || label === 'draft' 
        ? (label as 'inbox' | 'sent' | 'draft') 
        : 'inbox';
      
      const response = await gmailService.listEmails(validLabel, options);
      console.log('[DEBUG] Email response:', response);
      
      if (!response || !response.emails) {
        throw new Error('No emails returned from server');
      }
      
      const newEmails = response.emails;
      console.log('[DEBUG] New emails:', newEmails.length);

      // Update only the appropriate category
      setEmails(prev => {
        const updated = { ...prev };
        if (label === 'inbox') {
          updated.inbox = options?.pageToken ? [...prev.inbox, ...newEmails] : newEmails;
        } else if (label === 'sent') {
          updated.sent = options?.pageToken ? [...prev.sent, ...newEmails] : newEmails;
        } else if (label === 'draft') {
          updated.drafts = options?.pageToken ? [...prev.drafts, ...newEmails] : newEmails;
        }
        return updated;
      });
      
      return response;
    } catch (error) {
      console.error('[DEBUG] Error refreshing emails:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh emails';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Classifier specific methods
  const classifyCurrentEmail = async () => {
    if (!selectedEmail) {
      console.warn('[DEBUG] No email selected for classification');
      return null;
    }
    console.log('[DEBUG] Classifying current email:', selectedEmail.id);
    const result = await classifyEmail(selectedEmail.id);
    await refreshAllCategories();
    return result;
  };

  const classifySelectedEmails = async (emailIds: string[]) => {
    console.log('[DEBUG] Classifying selected emails:', emailIds);
    const result = await classifyBatch(emailIds);
    await refreshAllCategories();
    return result;
  };

  const classifyInbox = async (maxResults: number = 10) => {
    console.log('[DEBUG] Classifying inbox with maxResults:', maxResults);
    const result = await classifyInboxEmails(maxResults);
    await refreshAllCategories();
    return result;
  };

  const refreshClassifiedEmails = useCallback(async () => {
    if (!refreshAllCategories) {
      console.warn('[DEBUG] refreshAllCategories is not available');
      return;
    }
    console.log('[DEBUG] Refreshing classified emails');
    try {
      await refreshAllCategories();
    } catch (error) {
      console.error('Error refreshing classified emails:', error);
      throw error;
    }
  }, [refreshAllCategories]);

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
        classifiedEmails,
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
