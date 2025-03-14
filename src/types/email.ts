export interface Email {
  id: string
  threadId: string
  subject: string
  from: string
  to: string
  body?: string
  date: string
  snippet: string
  unread?: boolean
  needsAction?: boolean
  archived?: boolean
}

export type ViewState = "reading" | "composing" 