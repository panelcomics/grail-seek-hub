import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface PasswordStrengthMeterProps {
  password: string;
  onValidationChange: (isValid: boolean) => void;
}

export const PasswordStrengthMeter = ({ password, onValidationChange }: PasswordStrengthMeterProps) => {
  const [strength, setStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
  const [message, setMessage] = useState<string>('');
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validatePassword = async () => {
      if (!password) {
        setStrength('weak');
        setMessage('');
        setIsValid(false);
        onValidationChange(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('validate-password', {
          body: { password }
        });

        if (error) throw error;

        setStrength(data.strength || 'weak');
        setMessage(data.message || '');
        setIsValid(data.valid);
        onValidationChange(data.valid);
      } catch (error) {
        console.error('Password validation error:', error);
        setIsValid(false);
        onValidationChange(false);
      }
    };

    // Debounce validation
    const timer = setTimeout(validatePassword, 300);
    return () => clearTimeout(timer);
  }, [password, onValidationChange]);

  if (!password) return null;

  const strengthColors = {
    weak: 'bg-destructive',
    medium: 'bg-warning',
    strong: 'bg-success'
  };

  const strengthWidth = {
    weak: 'w-1/3',
    medium: 'w-2/3',
    strong: 'w-full'
  };

  return (
    <div className="space-y-2 mt-2">
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full transition-all duration-300",
            strengthColors[strength],
            strengthWidth[strength]
          )}
        />
      </div>
      {message && (
        <p className={cn(
          "text-xs",
          isValid ? "text-success" : "text-muted-foreground"
        )}>
          {message}
        </p>
      )}
    </div>
  );
};
