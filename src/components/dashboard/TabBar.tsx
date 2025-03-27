import { cn } from "@/lib/utils"
import { Tab } from "@/types/tab"
import { Input } from "@/components/ui/input"
import { Search, Archive, Mail, ReplyAll } from "lucide-react"
import { KeyboardEvent } from "react"
import { ClassifierButton } from "./ClassifierButton"
import { useEmail } from "@/lib/EmailContext"

interface TabBarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onSearch: (query: string) => void
  searchQuery: string
}

export function TabBar({ activeTab, onTabChange, onSearch, searchQuery }: TabBarProps) {
  const { classifyInbox, classifyCurrentEmail, selectedEmail } = useEmail();
  
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch(searchQuery);
    }
  };

  const getTabIcon = (tab: Tab) => {
    switch (tab) {
      case 'reply':
        return <ReplyAll className="h-4 w-4 mr-2" />;
      case 'read':
        return <Mail className="h-4 w-4 mr-2" />;
      case 'archive':
        return <Archive className="h-4 w-4 mr-2" />;
      default:
        return null;
    }
  };

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 justify-between">
        <div className="flex space-x-1">
          {["reply", "read", "archive"].map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab as Tab)}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                activeTab === tab
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              {getTabIcon(tab as Tab)}
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center w-[300px] relative">
            <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              onKeyDown={handleKeyPress}
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <ClassifierButton 
              onClassify={() => classifyInbox(10)}
              label="Classify Inbox"
              variant="secondary"
              tooltipText="Automatically classify new emails in your inbox"
            />
            {selectedEmail && (
              <ClassifierButton
                onClassify={classifyCurrentEmail}
                label="Classify Email"
                variant="outline"
                size="sm"
                tooltipText="Classify the currently selected email"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
