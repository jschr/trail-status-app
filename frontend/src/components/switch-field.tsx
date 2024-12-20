import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Control, FieldValues, Path } from 'react-hook-form';

interface SwitchFieldProps<T extends FieldValues> {
  className?: string;
  control: Control<T>;
  name: Path<T>;
  label: React.ReactNode;
  description?: React.ReactNode;
}

export function SwitchField<T extends FieldValues>({
  className,
  control,
  name,
  label,
  description,
}: SwitchFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center gap-4">
          <div className="space-y-0.5">
            <FormLabel>{label}</FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
          </div>
          <FormControl>
            <div>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                className={className}
              />
            </div>
          </FormControl>
        </FormItem>
      )}
    />
  );
}
