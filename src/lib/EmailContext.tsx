import React, { createContext, useContext, useState, useEffect } from 'react';
import GmailService, { EmailMessage } from './gmail';

interface EmailContextType {
  emails: EmailMessage[];
  loading: boolean;
  error: string | null;
  refreshEmails: () => Promise<void>;
  selectedEmail: EmailMessage | null;
  setSelectedEmail: (email: EmailMessage | null) => void;
  gmailService: GmailService;
}

const EmailContext = createContext<EmailContextType | null>(null);

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
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [gmailService] = useState(() => new GmailService(accessToken));

  const refreshEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedEmails = await gmailService.listEmails();
      setEmails(fetchedEmails);
    } catch (err) {
      setError('Failed to fetch emails. Please try again later.');
      console.error('Error fetching emails:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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