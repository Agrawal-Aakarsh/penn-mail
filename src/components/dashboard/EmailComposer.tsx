import { useState, ChangeEvent, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Heading from '@tiptap/extension-heading'
import TextStyle from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEmail } from '@/lib/EmailContext'
import { EmailMessage } from '@/lib/gmail'
import { 
  Bold as BoldIcon, 
  Italic as ItalicIcon, 
  List as BulletListIcon, 
  ListOrdered as OrderedListIcon,
  Type as HeadingIcon,
  Link as LinkIcon,
  Loader2
} from 'lucide-react'
import { useDebounce } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { EmailAddress, parseEmailString } from '@/components/ui/EmailAddress'

interface EmailComposerProps {
  onClose: () => void
  onSend: (email: { to: string; subject: string; content: string }) => Promise<void>
  sending?: boolean
  existingDraft?: EmailMessage
  replyTo?: EmailMessage
  isReply?: boolean
}

const fontFamilies = {
  'Arial': 'Arial, sans-serif',
  'Times New Roman': 'Times New Roman, serif',
  'Courier New': 'Courier New, monospace',
  'Georgia': 'Georgia, serif',
  'Verdana': 'Verdana, sans-serif'
}

export function EmailComposer({ 
  onClose, 
  onSend, 
  sending = false, 
  existingDraft,
  replyTo,
  isReply = false 
}: EmailComposerProps) {
  const { gmailService, refreshEmails } = useEmail();
  const [to, setTo] = useState(() => {
    if (replyTo) {
      // Extract just the email address when replying
      const { email } = parseEmailString(replyTo.from);
      return email;
    }
    return existingDraft?.to || '';
  });
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : existingDraft?.subject || '')
  const [currentFont, setCurrentFont] = useState('Arial')
  const [savingDraft, setSavingDraft] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSavedContent, setLastSavedContent] = useState({
    to: existingDraft?.to || '',
    subject: existingDraft?.subject || '',
    content: existingDraft?.body || ''
  })
  const saveTimeoutRef = useRef<number | null>(null)
  const debouncedTo = useDebounce(to, 1000)
  const debouncedSubject = useDebounce(subject, 1000)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
      }),
      Link.configure({
        openOnClick: false,
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: 'list-disc ml-4',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'list-decimal ml-4',
        },
      }),
      ListItem,
      Bold,
      Italic,
      Heading.configure({
        levels: [1, 2, 3],
      }),
      TextStyle,
      FontFamily,
    ],
    editorProps: {
      attributes: {
        class: isReply 
          ? 'prose prose-sm max-w-none focus:outline-none min-h-[100px] p-4'
          : 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
    content: replyTo 
      ? `<p></p><p></p><p>On ${new Date(replyTo.date).toLocaleString()}, ${replyTo.from} wrote:</p><blockquote>${replyTo.body}</blockquote>`
      : existingDraft?.body || '<p>Type your message here...</p>',
  })

  // Update editor content when existingDraft changes
  useEffect(() => {
    if (existingDraft?.body && editor) {
      editor.commands.setContent(existingDraft.body)
    }
  }, [existingDraft, editor])

  useEffect(() => {
    const saveDraft = async () => {
      // Don't auto-save if there's no content to save
      if (!debouncedTo && !debouncedSubject && !editor?.getText().trim()) return;
      
      const currentContent = editor?.getHTML() || '';
      
      // Only save if content has actually changed
      if (
        debouncedTo === lastSavedContent.to && 
        debouncedSubject === lastSavedContent.subject && 
        currentContent === lastSavedContent.content
      ) {
        return;
      }

      try {
        setSavingDraft(true);
        setError(null);

        // Validate email addresses
        if (debouncedTo) {
          const emails = debouncedTo.split(',').map((email: string) => email.trim());
          for (const email of emails) {
            if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
              throw new Error(`Invalid email address: ${email}`);
            }
          }
        }

        if (existingDraft?.id) {
          await gmailService.updateDraft(existingDraft.id, debouncedTo, debouncedSubject, currentContent);
        } else {
          await gmailService.saveDraft(debouncedTo, debouncedSubject, currentContent);
        }
        
        // Update last saved content
        setLastSavedContent({
          to: debouncedTo,
          subject: debouncedSubject,
          content: currentContent
        });

        // Refresh drafts list without closing composer
        await refreshEmails('draft');
      } catch (err) {
        console.error('Error saving draft:', err);
        setError(err instanceof Error ? err.message : 'Failed to save draft');
      } finally {
        // Clear saving state after a short delay to prevent UI flicker
        setTimeout(() => setSavingDraft(false), 500);
      }
    };

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for saving
    saveTimeoutRef.current = window.setTimeout(saveDraft, 2000);

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [debouncedTo, debouncedSubject, editor, existingDraft?.id, gmailService, refreshEmails]);

  const handleSend = async () => {
    try {
      setError(null);
      
      // Validate required fields
      if (!to) throw new Error('Please specify at least one recipient');
      if (!subject) throw new Error('Please specify a subject');
      if (!editor?.getHTML() || editor.getHTML() === '<p>Type your message here...</p>') {
        throw new Error('Please add some content to your email');
      }

      // Validate email addresses
      const emails = to.split(',').map(email => {
        const { email: parsedEmail } = parseEmailString(email.trim());
        if (!parsedEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          throw new Error(`Invalid email address: ${email}`);
        }
        return parsedEmail;
      });

      await onSend({
        to: emails.join(', '),
        subject,
        content: editor.getHTML(),
      });
      onClose();
    } catch (err) {
      console.error('Error sending email:', err);
      setError(err instanceof Error ? err.message : 'Failed to send email');
    }
  }

  const handleClose = () => {
    // If we have content, save before closing
    if ((to || subject || (editor?.getText().trim() && editor?.getHTML() !== '<p>Type your message here...</p>'))) {
      const content = editor?.getHTML() || '';
      if (existingDraft?.id) {
        gmailService.updateDraft(existingDraft.id, to, subject, content)
          .then(() => refreshEmails('draft'))
          .catch(console.error)
          .finally(() => onClose());
      } else {
        gmailService.saveDraft(to, subject, content)
          .then(() => refreshEmails('draft'))
          .catch(console.error)
          .finally(() => onClose());
      }
    } else {
      onClose();
    }
  }

  const handleToChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTo(e.target.value)
    setError(null) // Clear error when user types
  }
  
  const handleSubjectChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSubject(e.target.value)
    setError(null) // Clear error when user types
  }

  const handleFontChange = (font: string) => {
    setCurrentFont(font)
    const fontFamily = fontFamilies[font as keyof typeof fontFamilies]
    editor?.chain().focus().setFontFamily(fontFamily).run()
  }

  const ToolbarButton = ({ 
    onClick, 
    active = false, 
    children 
  }: { 
    onClick: () => void
    active?: boolean
    children: React.ReactNode 
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 px-2",
        active ? "bg-gray-100 dark:bg-gray-100" : "",
        "text-gray-900 hover:text-gray-900 dark:text-gray-900 dark:hover:text-gray-900"
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  )

  return (
    <div className={cn(
      "flex flex-col bg-white dark:bg-white",
      isReply ? "border rounded-lg mx-4 mb-4" : "h-full"
    )}>
      <div className={cn(
        "border-b p-4",
        isReply && "rounded-t-lg"
      )}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isReply ? 'Reply' : existingDraft ? 'Edit Draft' : 'New Message'}
          </h2>
          {savingDraft && (
            <span className="text-xs text-gray-600">
              Saving...
            </span>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium w-12 text-gray-900">To:</span>
            <Input
              type="text"
              placeholder="name@example.com"
              value={to}
              onChange={handleToChange}
              className={cn(
                "flex-1 bg-white dark:bg-white text-gray-900 dark:placeholder-gray-500",
                error && to ? 'border-red-500' : ''
              )}
              disabled={isReply}
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium w-12 text-gray-900">Subject:</span>
            <Input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={handleSubjectChange}
              className="flex-1 bg-white dark:bg-white text-gray-900 dark:placeholder-gray-500"
              disabled={isReply}
            />
          </div>
          {error && (
            <div className="text-sm text-red-500 ml-14">
              {error}
            </div>
          )}
        </div>
      </div>
      
      <div className="border-b p-2 flex items-center gap-1 bg-gray-50 dark:bg-gray-50">
        <select 
          className="h-8 px-2 rounded-md border bg-white dark:bg-white text-gray-900"
          onChange={e => handleFontChange(e.target.value)}
          value={currentFont}
          disabled={sending || savingDraft}
        >
          {Object.keys(fontFamilies).map(font => (
            <option key={font} value={font}>{font}</option>
          ))}
        </select>

        <select 
          className="h-8 px-2 rounded-md border bg-white dark:bg-white text-gray-900"
          onChange={e => {
            const level = parseInt(e.target.value) as 1 | 2 | 3 | 0
            level 
              ? editor?.chain().focus().setHeading({ level }).run()
              : editor?.chain().focus().setParagraph().run()
          }}
          value={editor?.isActive('heading') ? editor.getAttributes('heading').level : '0'}
          disabled={sending || savingDraft}
        >
          <option value="0">Normal</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>

        <ToolbarButton 
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive('bold')}
        >
          <BoldIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton 
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive('italic')}
        >
          <ItalicIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton 
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive('bulletList')}
        >
          <BulletListIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton 
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive('orderedList')}
        >
          <OrderedListIcon className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div className={cn(
        "flex-1 overflow-y-auto min-h-0 bg-white dark:bg-white",
        isReply ? "max-h-[300px]" : ""
      )}>
        <EditorContent 
          editor={editor} 
          className="h-full [&_.ProseMirror]:h-full [&_.ProseMirror]:min-h-[100px] [&_.ProseMirror]:p-4 [&_.ProseMirror]:focus:outline-none [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-4 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-gray-300 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:text-gray-600 [&_.ProseMirror]:text-gray-900 dark:[&_.ProseMirror]:text-gray-900 [&_.ProseMirror_blockquote]:bg-gray-50 dark:[&_.ProseMirror_blockquote]:bg-gray-50" 
        />
      </div>

      <div className={cn(
        "flex-none p-4 flex justify-end space-x-2 bg-gray-50 dark:bg-gray-50 border-t",
        isReply && "rounded-b-lg sticky bottom-0"
      )}>
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleSend} disabled={sending}>
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Send'
          )}
        </Button>
      </div>
    </div>
  )
}