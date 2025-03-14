import { cn } from "@/lib/utils"
import { Email } from "@/types/email"

interface EmailListProps {
  emails: Email[]
  selectedEmail: Email | null
  onEmailSelect: (email: Email) => void
}

export function EmailList({ emails, selectedEmail, onEmailSelect }: EmailListProps) {
  return (
    <div className="w-[400px] overflow-auto border-r">
      {emails.map((email) => (
        <button
          key={email.id}
          onClick={() => onEmailSelect(email)}
          className={cn(
            "w-full p-4 text-left border-b hover:bg-muted/50",
            selectedEmail?.id === email.id && "bg-muted",
            email.unread && "font-semibold"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold">{email.from}</span>
            <span className="text-sm text-muted-foreground">
              {new Date(email.date).toLocaleDateString()}
            </span>
          </div>
          <div className="text-sm font-medium mt-1">{email.subject}</div>
          <div className="text-sm text-muted-foreground mt-1 truncate">
            {email.snippet}
          </div>
        </button>
      ))}
    </div>
  )
} 