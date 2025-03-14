import React, { createContext, useContext, useState, useEffect } from 'react';
import GmailService, { EmailMessage, EmailResponse } from './gmail';

interface EmailContextType {
  emails: {
    inbox: EmailMessage[];
    sent: EmailMessage[];
    drafts: EmailMessage[];
  };
  loading: boolean;
  error: string | null;
  refreshEmails: (
    label?: 'inbox' | 'sent' | 'draft',
    options?: { pageToken?: string; search?: string }
  ) => Promise<EmailResponse | void>;
  selectedEmail: EmailMessage | null;
  setSelectedEmail: (email: EmailMessage | null) => void;
  gmailService: GmailService;
}

const EmailContext = createContext<EmailContextType | undefined>(undefined);

export const useEmail = () => {
  const context = useContext(EmailContext);
  if (!context) {
    throw new Error('useEmail must be used within an EmailProvider');
  }
  return context;
};

interface EmailProviderProps {
  children: React.ReactNode;
  accessToken: string;
}

export const EmailProvider: React.FC<EmailProviderProps> = ({ children, accessToken }) => {
  const [emails, setEmails] = useState<EmailContextType['emails']>({
    inbox: [],
    sent: [],
    drafts: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [gmailService] = useState(() => new GmailService(accessToken));

  const refreshEmails = async (
    label?: 'inbox' | 'sent' | 'draft',
    options?: { pageToken?: string; search?: string }
  ): Promise<EmailResponse | void> => {
    try {
      if (!label && !options?.pageToken) {
        setLoading(true);
      }
      setError(null);

      if (label) {
        // Refresh only specific label
        console.log('[DEBUG] Fetching emails for specific label:', label);
        const response = await gmailService.listEmails(label, options);
        console.log('[DEBUG] Fetched emails response:', response);
        
        setEmails(prev => {
          const labelKey = label === 'draft' ? 'drafts' : 
                          label === 'sent' ? 'sent' : 
                          'inbox';
          // Handle both array and object responses
          const emails = Array.isArray(response) ? response : response.emails;
          const newEmails = options?.pageToken 
            ? [...prev[labelKey], ...emails]
            : emails;
          
          return {
            ...prev,
            [labelKey]: newEmails
          };
        });

        // If response is an array, convert it to EmailResponse format
        if (Array.isArray(response)) {
          return {
            emails: response,
            nextPageToken: undefined,
            resultSizeEstimate: response.length
          };
        }
        return response;
      } else {
        // Initial fetch - get inbox emails first
        console.log('[DEBUG] Initial fetch - getting inbox emails');
        try {
          const inboxResponse = await gmailService.listEmails('inbox');
          console.log('[DEBUG] Fetched inbox emails:', inboxResponse);
          
          // Then fetch sent emails
          console.log('[DEBUG] Fetching sent emails');
          const sentResponse = await gmailService.listEmails('sent');
          console.log('[DEBUG] Fetched sent emails:', sentResponse);
          
          // Finally fetch drafts
          console.log('[DEBUG] Fetching draft emails');
          const draftResponse = await gmailService.listEmails('draft');
          console.log('[DEBUG] Fetched draft emails:', draftResponse);

          setEmails({
            inbox: inboxResponse.emails,
            sent: sentResponse.emails,
            drafts: draftResponse.emails
          });
        } catch (error) {
          console.error('[DEBUG] Error during initial fetch:', error);
          // Set empty arrays for failed fetches but don't throw
          setEmails({
            inbox: [],
            sent: [],
            drafts: []
          });
          throw error; // Re-throw to be caught by outer catch block
        }
      }
    } catch (err) {
      console.error('[DEBUG] Error in refreshEmails:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch emails';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch of emails
  useEffect(() => {
    console.log('[DEBUG] Initial email fetch');
    refreshEmails();
  }, [accessToken]);

  const value = {
    emails,
    loading,
    error,
    refreshEmails,
    selectedEmail,
    setSelectedEmail,
    gmailService,
  };

  return <EmailContext.Provider value={value}>{children}</EmailContext.Provider>;
}; 