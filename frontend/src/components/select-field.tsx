import { Control, FieldValues, Path } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SelectFieldProps<T extends FieldValues> {
  className?: string;
  control: Control<T>;
  name: Path<T>;
  label: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}

export function SelectField<T extends FieldValues>({
  className,
  control,
  name,
  label,
  description,
  children,
}: SelectFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger className={className}>
                  <SelectValue placeholder="" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>{children}</SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
          {description && <FormDescription>{description}</FormDescription>}
        </FormItem>
      )}
    />
  );
}
