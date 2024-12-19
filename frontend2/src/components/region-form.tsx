import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { Form } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/text-field';
import { Separator } from '@/components/ui/separator';
import { Region } from '@/api';

interface RegionFormProps {
  defaultValue: Region;
}

const FormSchema = z.object({
  regionName: z.string().min(2, {
    message: 'Region must be at least 2 characters.',
  }),
  openHashtag: z.string().min(2, {
    message: 'Open hashtag must be at least 2 characters.',
  }),
  closeHashtag: z.string().min(2, {
    message: 'Close hashtag must be at least 2 characters.',
  }),
});

export function RegionForm({ defaultValue }: RegionFormProps) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      regionName: '',
      openHashtag: '',
      closeHashtag: '',
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log(data);
  }

  // Sync form values with defaultValue.
  useEffect(() => {
    form.setValue('regionName', defaultValue.name ?? '');
    form.setValue('openHashtag', defaultValue.openHashtag ?? '');
    form.setValue('closeHashtag', defaultValue.closeHashtag ?? '');
  }, [defaultValue]);

  const isDirty = Object.values(form.formState.dirtyFields).length > 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
        <TextField
          control={form.control}
          name="regionName"
          label="Name"
          className="max-w-[300px]"
        />

        <div className="flex flex-col space-y-3">
          <div className="flex flex-col space-y-1">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
              Hashtag Settings
            </h4>
            <p className="text-xs">
              Open or close the trails by posting to{' '}
              <a
                href={`https://www.instagram.com/${defaultValue.user?.username}/`}
                target="_blank"
              >
                <strong>@{defaultValue.user?.username}</strong>
              </a>{' '}
              with a specific hashtag.
            </p>
          </div>

          <TextField
            control={form.control}
            name="openHashtag"
            label="Open Hashtag"
            className="max-w-[200px]"
          />

          <TextField
            control={form.control}
            name="closeHashtag"
            label="Close Hashtag"
            className="max-w-[200px]"
          />
        </div>
        <Separator />
        <Button type="submit" disabled={!isDirty}>
          Save Region
        </Button>
      </form>
    </Form>
  );
}
