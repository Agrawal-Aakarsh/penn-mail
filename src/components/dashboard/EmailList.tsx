import { cn } from "@/lib/utils"
import { EmailMessage } from "@/lib/gmail"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface EmailListProps {
  emails: EmailMessage[]
  selectedEmail: EmailMessage | null
  onEmailSelect: (email: EmailMessage) => void
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  searchQuery?: string
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
  searchQuery = ""
}: EmailListProps) {
  return (
    <div className="w-[400px] overflow-auto border-r flex flex-col bg-white dark:bg-stone-800">
      <div className="flex-1">
        {emails.map((email) => (
          <button
            key={email.id}
            onClick={() => onEmailSelect(email)}
            className={cn(
              "w-full p-4 text-left border-b hover:bg-muted/50 dark:hover:bg-neutral-700/50",
              selectedEmail?.id === email.id && "bg-muted dark:bg-neutral-700",
              email.unread && "font-semibold"
            )}
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