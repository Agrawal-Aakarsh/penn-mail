import { Button } from './button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from './hover-card';
import { Mail } from 'lucide-react';

interface EmailAddressProps {
  emailString: string;
  onComposeClick?: (email: string) => void;
}

export function parseEmailString(emailString: string): { name: string | null; email: string } {
  // Match "Display Name <email@domain.com>" or just "email@domain.com"
  // This pattern ensures the entire display name is captured before the email
  const match = emailString.match(/^(?:"([^"]+)"|([^<]+?))?\s*<([^>]+)>$|^([^<\s]+@[^>\s]+)$/);
  
  if (!match) {
    // If no match, treat the whole string as an email address
    return { name: null, email: emailString.trim() };
  }
  
  const [, quotedName, unquotedName, emailInBrackets, plainEmail] = match;
  
  return {
    name: (quotedName || unquotedName)?.trim() || null,
    email: (emailInBrackets || plainEmail).trim()
  };
}

export function EmailAddress({ emailString, onComposeClick }: EmailAddressProps) {
  const { name, email } = parseEmailString(emailString);

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto p-1 font-normal hover:bg-muted"
        >
          {name ? (
            <span>
              <span className="font-medium">{name}</span>
              <span className="text-muted-foreground"> &lt;{email}&gt;</span>
            </span>
          ) : (
            <span>{email}</span>
          )}
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-4">
        <div className="space-y-4">
          <div className="space-y-1">
            {name && <h4 className="text-sm font-semibold">{name}</h4>}
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
          {onComposeClick && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onComposeClick(email)}
            >
              <Mail className="mr-2 h-4 w-4" />
              Compose Email
            </Button>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
} 