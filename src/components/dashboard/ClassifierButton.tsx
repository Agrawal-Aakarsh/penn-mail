import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, BrainCircuit } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ClassifierButtonProps {
  onClassify: () => Promise<any>;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  tooltipText?: string;
  showIcon?: boolean;
  fullWidth?: boolean;
  label?: string;
}

export function ClassifierButton({
  onClassify,
  variant = 'default',
  size = 'default',
  tooltipText = 'Classify emails using AI',
  showIcon = true,
  fullWidth = false,
  label = 'Classify',
}: ClassifierButtonProps) {
  const [isClassifying, setIsClassifying] = useState(false);

  const handleClick = async () => {
    setIsClassifying(true);
    try {
      await onClassify();
    } catch (error) {
      console.error('Classification error:', error);
    } finally {
      setIsClassifying(false);
    }
  };

  const buttonContent = (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isClassifying}
      className={fullWidth ? 'w-full' : ''}
    >
      {isClassifying ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Classifying...
        </>
      ) : (
        <>
          {showIcon && <BrainCircuit className="mr-2 h-4 w-4" />}
          {label}
        </>
      )}
    </Button>
  );

  if (tooltipText) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return buttonContent;
}
