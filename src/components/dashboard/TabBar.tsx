import { cn } from "@/lib/utils"
import { Tab } from "@/types/tab"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { KeyboardEvent } from "react"

interface TabBarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onSearch: (query: string) => void
  searchQuery: string
}

export function TabBar({ activeTab, onTabChange, onSearch, searchQuery }: TabBarProps) {
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch(searchQuery);
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
              {tab}
            </button>
          ))}
        </div>
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
      </div>
    </div>
  )
} 