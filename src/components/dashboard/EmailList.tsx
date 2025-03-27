import { cn } from "@/lib/utils"
import { EmailMessage } from "@/lib/gmail"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle } from "lucide-react"
import { useEmail } from "@/lib/EmailContext"
import { useState } from "react"
import { ClassifierButton } from "./ClassifierButton"

interface EmailListProps {
  emails: EmailMessage[]
  selectedEmail: EmailMessage | null
  onEmailSelect: (email: EmailMessage) => void
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  searchQuery?: string
  enableMultiSelect?: boolean
  onSelectEmail?: (emailId: string, selected: boolean) => void
  selectedEmailIds?: string[]
}

// Helper function to highlight search terms
const highlightText = (text: string, searchQuery: string) => {
  if (!searchQuery) return text;
  
  const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === searchQuery.toLowerCase() ? 
      <span key={i} className="bg-yellow-200 dark:bg-yellow-900">{part}</span> : 
      part
  );
};

export function EmailList({ 
  emails, 
  selectedEmail, 
  onEmailSelect,
  loading,
  hasMore,
  onLoadMore,
  searchQuery = "",
  enableMultiSelect = false,
  onSelectEmail,
  selectedEmailIds = []
}: EmailListProps) {
  const { classifySelectedEmails } = useEmail();
  const [isSelectMode, setIsSelectMode] = useState(false);
  
  const handleClassifySelected = async () => {
    if (selectedEmailIds.length === 0) return;
    
    try {
      await classifySelectedEmails(selectedEmailIds);
      // Clear selection after classification
      if (onSelectEmail) {
        selectedEmailIds.forEach(id => onSelectEmail(id, false));
      }
      setIsSelectMode(false);
    } catch (error) {
      console.error('Error classifying selected emails:', error);
    }
  };
  
  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    if (isSelectMode && onSelectEmail) {
      // Clear all selections when exiting select mode
      selectedEmailIds.forEach(id => onSelectEmail(id, false));
    }
  };
  
  const toggleSelectEmail = (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    if (onSelectEmail) {
      onSelectEmail(emailId, !selectedEmailIds.includes(emailId));
    }
  };

  return (
    <div className="w-[400px] overflow-auto border-r flex flex-col bg-white dark:bg-stone-800">
      {enableMultiSelect && (
        <div className="p-2 border-b flex justify-between">
          <Button
            variant={isSelectMode ? "default" : "outline"}
            size="sm"
            onClick={toggleSelectMode}
          >
            {isSelectMode ? "Cancel Selection" : "Select Emails"}
          </Button>
          
          {isSelectMode && selectedEmailIds.length > 0 && (
            <ClassifierButton
              onClassify={handleClassifySelected}
              label={`Classify ${selectedEmailIds.length} Email${selectedEmailIds.length > 1 ? 's' : ''}`}
              size="sm"
              variant="secondary"
            />
          )}
        </div>
      )}
      
      <div className="flex-1">
        {emails.map((email) => (
          <div
            key={email.id}
            className={cn(
              "w-full p-4 text-left border-b hover:bg-muted/50 dark:hover:bg-neutral-700/50 relative",
              selectedEmail?.id === email.id && "bg-muted dark:bg-neutral-700",
              email.unread && "font-semibold"
            )}
          >
            {isSelectMode && (
              <div 
                className="absolute top-4 right-4 z-10 cursor-pointer"
                onClick={(e) => toggleSelectEmail(e, email.id)}
              >
                <CheckCircle 
                  className={cn(
                    "h-5 w-5",
                    selectedEmailIds.includes(email.id) 
                      ? "text-blue-500 fill-blue-500" 
                      : "text-gray-300"
                  )} 
                />
              </div>
            )}
            
            <button
              onClick={() => onEmailSelect(email)}
              className="w-full text-left"
              disabled={isSelectMode}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold dark:text-neutral-100">{highlightText(email.from, searchQuery)}</span>
                <span className="text-sm text-muted-foreground dark:text-neutral-400">
                  {new Date(email.date).toLocaleDateString()}
                </span>
              </div>
              <div className="text-sm font-medium mt-1 dark:text-neutral-200">{highlightText(email.subject, searchQuery)}</div>
              <div className="text-sm text-muted-foreground dark:text-neutral-400 mt-1 truncate">
                {highlightText(email.snippet, searchQuery)}
              </div>
            </button>
          </div>
        ))}
      </div>
      
      {(hasMore || loading) && (
        <div className="p-4 flex justify-center border-t">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={loading}
            className="w-full dark:bg-neutral-700 dark:hover:bg-neutral-600"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
