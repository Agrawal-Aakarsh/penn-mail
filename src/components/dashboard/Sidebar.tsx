import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/AuthProvider"
import { LogOut, User } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SidebarProps {
  onCompose: () => void
}

export function Sidebar({ onCompose }: SidebarProps) {
  const { logout } = useAuth();

  return (
    <div className="w-64 border-r bg-muted/20 flex flex-col">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-primary">PennMail</h1>
        <Button className="w-full mt-4" variant="default" onClick={onCompose}>
          Compose
        </Button>
      </div>
      <nav className="mt-4 flex-1">
        <a 
          href="#" 
          className="flex items-center px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50"
        >
          Inbox
        </a>
        <a 
          href="#" 
          className="flex items-center px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50"
        >
          Sent
        </a>
        <a 
          href="#" 
          className="flex items-center px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50"
        >
          Drafts
        </a>
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