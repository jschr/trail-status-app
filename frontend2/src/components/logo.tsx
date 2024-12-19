import { Bike } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <Bike
      className={cn(
        'p-1 rounded-md bg-primary text-primary-foreground w-8 h-8',
        className,
      )}
    />
  );
}
