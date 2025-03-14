import { useState, ChangeEvent } from 'react'
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
import { 
  Bold as BoldIcon, 
  Italic as ItalicIcon, 
  List as BulletListIcon, 
  ListOrdered as OrderedListIcon,
  Type as HeadingIcon,
  Link as LinkIcon,
  Loader2
} from 'lucide-react'

interface EmailComposerProps {
  onClose: () => void
  onSend: (email: { to: string; subject: string; content: string }) => Promise<void>
  sending?: boolean
}

const fontFamilies = {
  'Arial': 'Arial, sans-serif',
  'Times New Roman': 'Times New Roman, serif',
  'Courier New': 'Courier New, monospace',
  'Georgia': 'Georgia, serif',
  'Verdana': 'Verdana, sans-serif'
}

export function EmailComposer({ onClose, onSend, sending = false }: EmailComposerProps) {
  const { gmailService } = useEmail();
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [currentFont, setCurrentFont] = useState('Arial')
  const [savingDraft, setSavingDraft] = useState(false)

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
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
    content: '<p>Type your message here...</p>',
  })

  const handleSend = async () => {
    if (!editor?.getText() || sending) return
    await onSend({
      to,
      subject,
      content: editor.getHTML(),
    })
  }

  const handleSaveDraft = async () => {
    if (!editor?.getText() || savingDraft) return
    try {
      setSavingDraft(true)
      const success = await gmailService.saveDraft(to, subject, editor.getHTML())
      if (success) {
        onClose()
      }
    } catch (error) {
      console.error('Error saving draft:', error)
    } finally {
      setSavingDraft(false)
    }
  }

  const handleToChange = (e: ChangeEvent<HTMLInputElement>) => setTo(e.target.value)
  const handleSubjectChange = (e: ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)

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
      className={`h-8 px-2 ${active ? 'bg-muted' : ''}`}
      onClick={onClick}
    >
      {children}
    </Button>
  )

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold mb-4">New Message</h2>
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="To"
            value={to}
            onChange={handleToChange}
            disabled={sending || savingDraft}
          />
          <Input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={handleSubjectChange}
            disabled={sending || savingDraft}
          />
        </div>
      </div>
      
      <div className="border-b p-2 flex items-center gap-1">
        <select 
          className="h-8 px-2 rounded-md border bg-background"
          onChange={e => handleFontChange(e.target.value)}
          value={currentFont}
          disabled={sending || savingDraft}
        >
          {Object.keys(fontFamilies).map(font => (
            <option key={font} value={font}>{font}</option>
          ))}
        </select>

        <select 
          className="h-8 px-2 rounded-md border bg-background"
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

      <div className="flex-1 border-b overflow-auto">
        <EditorContent 
          editor={editor} 
          className="[&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:p-4 [&_.ProseMirror]:focus:outline-none [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-4" 
        />
      </div>

      <div className="p-4 flex justify-end space-x-2 bg-muted/5">
        <Button variant="outline" onClick={onClose} disabled={sending || savingDraft}>
          Cancel
        </Button>
        <Button variant="outline" onClick={handleSaveDraft} disabled={sending || savingDraft}>
          {savingDraft ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Draft'
          )}
        </Button>
        <Button onClick={handleSend} disabled={sending || savingDraft}>
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