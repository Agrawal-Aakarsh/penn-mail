import { useState, useCallback } from 'react';
import { classifyEmail, classifyBatch, classifyInbox, getClassifiedEmails } from '@/lib/classifierApi';
import { EmailMessage } from '@/lib/gmail';

interface ClassifierState {
  isClassifying: boolean;
  classifiedEmails: {
    reply: EmailMessage[];
    read: EmailMessage[];
    archive: EmailMessage[];
  };
  error: string | null;
}

export function useClassifier() {
  const [state, setState] = useState<ClassifierState>({
    isClassifying: false,
    classifiedEmails: {
      reply: [],
      read: [],
      archive: []
    },
    error: null
  });

  const handleClassifyEmail = useCallback(async (emailId: string) => {
    setState(prev => ({ ...prev, isClassifying: true, error: null }));
    try {
      const result = await classifyEmail(emailId);
      // After classification, refresh the appropriate category
      await refreshClassifiedCategory(result.classification.category);
      return result.classification;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'An error occurred during classification' 
      }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isClassifying: false }));
    }
  }, []);

  const handleClassifyBatch = useCallback(async (emailIds: string[]) => {
    setState(prev => ({ ...prev, isClassifying: true, error: null }));
    try {
      const result = await classifyBatch(emailIds);
      // Refresh all categories after batch classification
      await refreshAllClassifiedCategories();
      return result.classifications;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'An error occurred during batch classification' 
      }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isClassifying: false }));
    }
  }, []);

  const handleClassifyInbox = useCallback(async (maxResults: number = 10) => {
    setState(prev => ({ ...prev, isClassifying: true, error: null }));
    try {
      const result = await classifyInbox(maxResults);
      // Refresh all categories after inbox classification
      await refreshAllClassifiedCategories();
      return result.classifications;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'An error occurred during inbox classification' 
      }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isClassifying: false }));
    }
  }, []);

  const refreshClassifiedCategory = useCallback(async (category: 'reply' | 'read' | 'archive') => {
    try {
      const emails = await getClassifiedEmails(category);
      setState(prev => ({
        ...prev,
        classifiedEmails: {
          ...prev.classifiedEmails,
          [category]: emails
        }
      }));
    } catch (error) {
      console.error(`Error refreshing ${category} category:`, error);
    }
  }, []);

  const refreshAllClassifiedCategories = useCallback(async () => {
    try {
      const [replyEmails, readEmails, archiveEmails] = await Promise.all([
        getClassifiedEmails('reply'),
        getClassifiedEmails('read'),
        getClassifiedEmails('archive')
      ]);
      
      setState(prev => ({
        ...prev,
        classifiedEmails: {
          reply: replyEmails,
          read: readEmails,
          archive: archiveEmails
        }
      }));
    } catch (error) {
      console.error('Error refreshing all categories:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to refresh classified emails' 
      }));
    }
  }, []);

  return {
    isClassifying: state.isClassifying,
    classifiedEmails: state.classifiedEmails,
    error: state.error,
    classifyEmail: handleClassifyEmail,
    classifyBatch: handleClassifyBatch,
    classifyInbox: handleClassifyInbox,
    refreshCategory: refreshClassifiedCategory,
    refreshAllCategories: refreshAllClassifiedCategories
  };
}
