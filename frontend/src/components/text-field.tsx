import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Control, FieldValues, Path } from 'react-hook-form';

interface TextFieldProps<T extends FieldValues> {
  className?: string;
  control: Control<T>;
  name: Path<T>;
  label: React.ReactNode;
  description?: React.ReactNode;
  multiline?: boolean;
}

export function TextField<T extends FieldValues>({
  className,
  control,
  name,
  label,
  description,
  multiline,
}: TextFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {multiline ? (
              <Textarea {...field} className={className} />
            ) : (
              <Input {...field} className={className} />
            )}
          </FormControl>
          <FormMessage />
          {description && <FormDescription>{description}</FormDescription>}
        </FormItem>
      )}
    />
  );
}
