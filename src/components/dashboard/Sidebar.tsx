import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/AuthProvider"
import { LogOut, User, Inbox, Send, FileEdit, Moon, Sun } from "lucide-react"
import { EmailView } from "./Dashboard"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/ThemeProvider"

interface SidebarProps {
  onCompose: () => void
  currentView: EmailView
  onViewChange: (view: EmailView) => void
}

export function Sidebar({ onCompose, currentView, onViewChange }: SidebarProps) {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="w-64 border-r bg-muted/20 flex flex-col">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-primary">PennMail</h1>
        <Button className="w-full mt-4" variant="default" onClick={onCompose}>
          Compose
        </Button>
      </div>
      <nav className="mt-4 flex-1">
        <button 
          onClick={() => onViewChange("inbox")}
          className={`flex items-center w-full px-4 py-2 text-sm hover:bg-muted/50 ${
            currentView === "inbox" ? "bg-muted text-primary font-medium" : "text-muted-foreground"
          }`}
        >
          <Inbox className="h-4 w-4 mr-3" />
          Inbox
        </button>
        <button 
          onClick={() => onViewChange("sent")}
          className={`flex items-center w-full px-4 py-2 text-sm hover:bg-muted/50 ${
            currentView === "sent" ? "bg-muted text-primary font-medium" : "text-muted-foreground"
          }`}
        >
          <Send className="h-4 w-4 mr-3" />
          Sent
        </button>
        <button 
          onClick={() => onViewChange("drafts")}
          className={`flex items-center w-full px-4 py-2 text-sm hover:bg-muted/50 ${
            currentView === "drafts" ? "bg-muted text-primary font-medium" : "text-muted-foreground"
          }`}
        >
          <FileEdit className="h-4 w-4 mr-3" />
          Drafts
        </button>
      </nav>
      <div className="p-4 mt-auto border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuItem onClick={toggleTheme}>
              {theme === 'dark' ? (
                <>
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Dark Mode</span>
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
} 