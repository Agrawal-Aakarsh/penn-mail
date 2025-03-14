import { EmailMessage } from "@/lib/gmail"
import DOMPurify from 'dompurify'
import { useEffect, useRef, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Reply } from "lucide-react"
import { EmailComposer } from "./EmailComposer"
import { EmailAddress } from "@/components/ui/EmailAddress"

interface EmailViewProps {
  email?: EmailMessage
  onSend: (email: { to: string; subject: string; content: string }) => Promise<void>
  onCompose?: (to: string) => void
}

export function EmailView({ email, onSend, onCompose }: EmailViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => {
    if (contentRef.current) {
      // Fix relative URLs in images
      const images = contentRef.current.getElementsByTagName('img');
      for (const img of Array.from(images)) {
        if (img.src.startsWith('cid:')) {
          // Handle inline images (future enhancement)
          img.style.display = 'none';
        }
      }

      // Fix links to open in new tab
      const links = contentRef.current.getElementsByTagName('a');
      for (const link of Array.from(links)) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    }
  }, [email?.body]);

  if (!email) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Select an email to view
      </div>
    )
  }

  // Sanitize and prepare HTML content
  const sanitizedHtml = DOMPurify.sanitize(email.body || email.snippet, {
    ADD_TAGS: ['style'],
    ADD_ATTR: ['target', 'rel'],
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    FORCE_BODY: false,
    ALLOW_DATA_ATTR: true
  });

  const handleReply = () => {
    setIsReplying(true);
  };

  const handleCloseReply = () => {
    setIsReplying(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none p-8 border-b bg-white">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-900">{email.subject}</h1>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleReply}
            className="ml-4"
          >
            <Reply className="h-4 w-4 mr-2" />
            Reply
          </Button>
        </div>
        <div className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-600">
          <div className="flex items-center gap-2">
            <span className="font-medium w-12">From:</span>
            <EmailAddress emailString={email.from} onComposeClick={onCompose} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium w-12">To:</span>
            <div className="flex flex-wrap gap-1">
              {email.to.split(',').map((recipient, index) => (
                <EmailAddress 
                  key={index} 
                  emailString={recipient.trim()} 
                  onComposeClick={onCompose}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium w-12">Date:</span>
            <span>{new Date(email.date).toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-3xl mx-auto p-8">
          <div 
            ref={contentRef}
            className="prose prose-sm max-w-none text-gray-900 dark:text-gray-900 [&_a]:text-blue-600 [&_a]:underline [&_img]:max-w-full [&_img]:h-auto [&_*]:max-w-full"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        </div>
      </div>
      {isReplying && (
        <div className="border-t pt-8 pb-8">
          <EmailComposer
            onClose={handleCloseReply}
            onSend={onSend}
            replyTo={email}
            isReply={true}
          />
        </div>
      )}
    </div>
  )
} 