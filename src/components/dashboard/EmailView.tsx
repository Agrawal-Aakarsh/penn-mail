import { EmailMessage } from "@/lib/gmail"
import DOMPurify from 'dompurify'
import { useEffect, useRef } from 'react'

interface EmailViewProps {
  email?: EmailMessage
}

export function EmailView({ email }: EmailViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none p-8 border-b bg-white">
        <h1 className="text-2xl font-bold text-foreground mb-4">{email.subject}</h1>
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-medium">From:</span>
            <span>{email.from}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">To:</span>
            <span>{email.to}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Date:</span>
            <span>{new Date(email.date).toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-3xl mx-auto p-8">
          <div 
            ref={contentRef}
            className="prose prose-sm max-w-none [&_a]:text-blue-600 [&_a]:underline [&_img]:max-w-full [&_img]:h-auto [&_*]:max-w-full"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        </div>
      </div>
    </div>
  )
} 