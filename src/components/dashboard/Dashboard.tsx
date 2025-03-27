import { useState, useCallback, useEffect } from "react"
import { ViewState } from "@/types/email"
import { Tab } from "@/types/tab"
import { Sidebar } from "./Sidebar"
import { TabBar } from "./TabBar"
import { EmailList } from "./EmailList"
import { EmailView } from "./EmailView"
import { EmailComposer } from "./EmailComposer"
import { useEmail } from "@/lib/EmailContext"
import { useDebounce } from "@/lib/hooks"
import { EmailMessage } from "@/lib/gmail"

export type EmailView = 'inbox' | 'sent' | 'drafts';

export function Dashboard() {
  const { 
    emails, 
    loading, 
    error, 
    selectedEmail, 
    setSelectedEmail, 
    refreshEmails, 
    gmailService,
    refreshClassifiedEmails 
  } = useEmail();
  
  const [activeTab, setActiveTab] = useState<Tab>("reply")
  const [viewState, setViewState] = useState<ViewState>("reading")
  const [currentView, setCurrentView] = useState<EmailView>("inbox")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [pageToken, setPageToken] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [draftToEdit, setDraftToEdit] = useState<EmailMessage | null>(null)
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])

  const debouncedSearch = useDebounce(searchQuery, 300)

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    setPageToken(undefined) // Reset pagination when search changes
    const label = currentView === 'drafts' ? 'draft' : currentView
    refreshEmails(label, { search: query })
  }, [currentView, refreshEmails])

  useEffect(() => {
    if (debouncedSearch !== searchQuery) {
      const label = currentView === 'drafts' ? 'draft' : currentView
      refreshEmails(label, { search: debouncedSearch })
    }
  }, [debouncedSearch, currentView, refreshEmails, searchQuery])

  // Effect to handle tab changes
  useEffect(() => {
    // When active tab changes, we need to update the classification view
    if (activeTab === 'reply' || activeTab === 'read' || activeTab === 'archive') {
      refreshClassifiedEmails();
    }
  }, [activeTab, refreshClassifiedEmails]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)
    try {
      const label = currentView === 'drafts' ? 'draft' : currentView
      const result = await refreshEmails(label, {
        pageToken,
        search: debouncedSearch
      })
      
      if (result?.nextPageToken) {
        setPageToken(result.nextPageToken)
        setHasMore(true)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error loading more emails:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleCompose = () => {
    setSelectedEmail(null)
    setViewState("composing")
  }

  const handleEmailSelect = (email: EmailMessage) => {
    // If we're in composing state, save any current draft before switching
    if (viewState === "composing") {
      handleCloseCompose();
    }

    setSelectedEmail(email);
    
    // If in drafts view, open the draft for editing
    if (currentView === 'drafts') {
      setDraftToEdit(email);
      setViewState("composing");
    } else {
      // For regular emails, switch to reading view
      setViewState("reading");
      setDraftToEdit(null);
    }
  }

  const handleCloseCompose = () => {
    // Save any changes before closing
    if (draftToEdit) {
      setSelectedEmail(draftToEdit);
    }
    setViewState("reading");
    setDraftToEdit(null);
  }

  const handleSendEmail = async (email: { to: string; subject: string; content: string }) => {
    try {
      setSendingEmail(true)
      const success = await gmailService.sendEmail(email.to, email.subject, email.content)
      if (success) {
        setViewState("reading")
        // Refresh both inbox and sent folders after sending
        await Promise.all([
          refreshEmails('inbox'),
          refreshEmails('sent')
        ])
      } else {
        // TODO: Show error message to user
        console.error("Failed to send email")
      }
    } catch (error) {
      console.error("Error sending email:", error)
    } finally {
      setSendingEmail(false)
    }
  }

  const handleViewChange = async (view: EmailView) => {
    setCurrentView(view)
    setSelectedEmail(null)
    setSearchQuery("")
    setPageToken(undefined)
    setHasMore(true)
    // Convert view type to label type
    const label = view === 'drafts' ? 'draft' : view
    await refreshEmails(label)
  }

  // Get emails for current view
  const getCurrentEmails = () => {
    // If in inbox view but with one of the classification tabs active
    if (currentView === 'inbox' && (activeTab === 'reply' || activeTab === 'read' || activeTab === 'archive')) {
      return emails[activeTab];
    }
    
    // Otherwise use the standard views
    switch (currentView) {
      case 'sent':
        return emails.sent;
      case 'drafts':
        return emails.drafts;
      case 'inbox':
      default:
        return emails.inbox;
    }
  }

  const currentEmails = getCurrentEmails()

  const handleComposeToEmail = (email: string) => {
    setSelectedEmail(null);
    setViewState("composing");
    setDraftToEdit({
      id: '',
      threadId: '',
      subject: '',
      from: '',
      to: email,
      date: new Date().toISOString(),
      snippet: '',
      body: '',
      label: 'draft'
    });
  };

  const handleEmailSelection = (emailId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedEmails(prev => [...prev, emailId]);
    } else {
      setSelectedEmails(prev => prev.filter(id => id !== emailId));
    }
  };

  if (loading && !loadingMore) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-lg">Loading emails...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-lg text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        onCompose={handleCompose} 
        currentView={currentView}
        onViewChange={handleViewChange}
      />
      <div className="flex-1 flex flex-col bg-white dark:bg-stone-900">
        {/* Show TabBar for inbox view and classified views */}
        <TabBar 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          searchQuery={searchQuery}
          onSearch={handleSearch}
        />
        <div className="flex-1 flex overflow-hidden">
          <EmailList 
            emails={currentEmails}
            selectedEmail={selectedEmail}
            onEmailSelect={handleEmailSelect}
            loading={loadingMore}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            searchQuery={searchQuery}
            enableMultiSelect={currentView === 'inbox'}
            onSelectEmail={handleEmailSelection}
            selectedEmailIds={selectedEmails}
          />
          <div className="flex-1">
            {viewState === "reading" ? (
              selectedEmail && <EmailView 
                email={selectedEmail} 
                onSend={handleSendEmail}
                onCompose={handleComposeToEmail}
              />
            ) : (
              <EmailComposer 
                onClose={handleCloseCompose}
                onSend={handleSendEmail}
                sending={sendingEmail}
                existingDraft={draftToEdit || undefined}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
