import { useState } from "react"
import { ViewState } from "@/types/email"
import { Tab } from "../../types/tab"
import { Sidebar } from "./Sidebar"
import { TabBar } from "./TabBar"
import { EmailList } from "./EmailList"
import { EmailView } from "./EmailView"
import { EmailComposer } from "./EmailComposer"
import { useEmail } from "@/lib/EmailContext"

export function Dashboard() {
  const { emails, loading, error, selectedEmail, setSelectedEmail, refreshEmails, gmailService } = useEmail()
  const [activeTab, setActiveTab] = useState<Tab>("reply")
  const [viewState, setViewState] = useState<ViewState>("reading")
  const [sendingEmail, setSendingEmail] = useState(false)

  const handleCompose = () => {
    setSelectedEmail(null)
    setViewState("composing")
  }

  const handleCloseCompose = () => {
    setViewState("reading")
  }

  const handleSendEmail = async (email: { to: string; subject: string; content: string }) => {
    try {
      setSendingEmail(true)
      const success = await gmailService.sendEmail(email.to, email.subject, email.content)
      if (success) {
        setViewState("reading")
        await refreshEmails()
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

  // For now, we'll show all emails in the inbox and implement proper filtering later
  const filteredEmails = emails.filter(email => {
    switch (activeTab) {
      case "reply":
        return true // Show all emails in reply tab for now
      case "read":
        return true // Show all emails in read tab for now
      case "archive":
        return false // Archive view is empty for now until we implement archiving
      default:
        return true
    }
  })

  if (loading) {
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
      <Sidebar onCompose={handleCompose} />
      <div className="flex-1 flex flex-col">
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 flex overflow-hidden">
          <EmailList 
            emails={filteredEmails}
            selectedEmail={selectedEmail}
            onEmailSelect={setSelectedEmail}
          />
          <div className="flex-1">
            {viewState === "reading" ? (
              selectedEmail && <EmailView email={selectedEmail} />
            ) : (
              <EmailComposer 
                onClose={handleCloseCompose}
                onSend={handleSendEmail}
                sending={sendingEmail}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 