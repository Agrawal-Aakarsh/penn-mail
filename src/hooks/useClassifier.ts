import { useState, useCallback, useEffect } from 'react';
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
  lastRefreshTime: number;
}

export function useClassifier() {
  const [state, setState] = useState<ClassifierState>({
    isClassifying: false,
    classifiedEmails: {
      reply: [],
      read: [],
      archive: []
    },
    error: null,
    lastRefreshTime: 0
  });

  const refreshAllCategories = useCallback(async () => {
    // Don't refresh if we've refreshed in the last 5 seconds
    if (Date.now() - state.lastRefreshTime < 5000) {
      console.log('[DEBUG] Skipping refresh - too soon');
      return;
    }

    console.log('[DEBUG] Refreshing all categories');
    try {
      const [replyEmails, readEmails, archiveEmails] = await Promise.all([
        getClassifiedEmails('reply'),
        getClassifiedEmails('read'),
        getClassifiedEmails('archive')
      ]);
      
      console.log('[DEBUG] Got classified emails:', {
        reply: replyEmails.length,
        read: readEmails.length,
        archive: archiveEmails.length
      });

      setState(prev => ({
        ...prev,
        classifiedEmails: {
          reply: replyEmails || [],
          read: readEmails || [],
          archive: archiveEmails || []
        },
        lastRefreshTime: Date.now()
      }));
    } catch (error) {
      console.error('Error refreshing categories:', error);
      throw error;
    }
  }, [state.lastRefreshTime]);

  const refreshClassifiedCategory = useCallback(async (category: 'reply' | 'read' | 'archive') => {
    console.log(`[DEBUG] Refreshing category: ${category}`);
    try {
      const emails = await getClassifiedEmails(category);
      console.log(`[DEBUG] Got ${emails.length} emails for ${category}`);
      setState(prev => ({
        ...prev,
        classifiedEmails: {
          ...prev.classifiedEmails,
          [category]: emails || []
        }
      }));
    } catch (error) {
      console.error(`Error refreshing ${category} category:`, error);
      throw error;
    }
  }, []);

  const handleClassifyEmail = useCallback(async (emailId: string) => {
    console.log('[DEBUG] Classifying email:', emailId);
    setState(prev => ({ ...prev, isClassifying: true, error: null }));
    try {
      const result = await classifyEmail(emailId);
      console.log('[DEBUG] Classification result:', result);
      await refreshAllCategories();
      return result.classification;
    } catch (error) {
      console.error('Error classifying email:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'An error occurred during classification' 
      }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isClassifying: false }));
    }
  }, [refreshAllCategories]);

  const handleClassifyBatch = useCallback(async (emailIds: string[]) => {
    console.log('[DEBUG] Classifying batch:', emailIds);
    setState(prev => ({ ...prev, isClassifying: true, error: null }));
    try {
      const result = await classifyBatch(emailIds);
      console.log('[DEBUG] Batch classification result:', result);
      await refreshAllCategories();
      return result.classifications;
    } catch (error) {
      console.error('Error classifying batch:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'An error occurred during batch classification' 
      }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isClassifying: false }));
    }
  }, [refreshAllCategories]);

  const handleClassifyInbox = useCallback(async (maxResults: number = 10) => {
    console.log('[DEBUG] Classifying inbox:', maxResults);
    setState(prev => ({ ...prev, isClassifying: true, error: null }));
    try {
      const result = await classifyInbox(maxResults);
      console.log('[DEBUG] Inbox classification result:', result);
      await refreshAllCategories();
      return result.classifications;
    } catch (error) {
      console.error('Error classifying inbox:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'An error occurred during inbox classification' 
      }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isClassifying: false }));
    }
  }, [refreshAllCategories]);

  return {
    isClassifying: state.isClassifying,
    classifiedEmails: state.classifiedEmails,
    error: state.error,
    classifyEmail: handleClassifyEmail,
    classifyBatch: handleClassifyBatch,
    classifyInbox: handleClassifyInbox,
    refreshCategory: refreshClassifiedCategory,
    refreshAllCategories
  };
}
