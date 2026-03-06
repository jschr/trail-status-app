import { Region } from '@/api';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import {
  Form, FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useSaveRegion } from '@/hooks/use-save-region';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface RegionFormProps {
  region: Region;
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
  statusLookbackDays: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z
      .number()
      .int('Must be a whole number.')
      .positive('Must be greater than 0.')
      .nullable()
      .optional(),
  ),
});

export function RegionForm({ region }: RegionFormProps) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      regionName: '',
      openHashtag: '',
      closeHashtag: '',
      statusLookbackDays: null,
    },
  });

  const { mutateAsync: saveRegion } = useSaveRegion();

  function getFormValues(r: Region) {
    return {
      regionName: r.name ?? '',
      openHashtag: r.openHashtag ?? '',
      closeHashtag: r.closeHashtag ?? '',
      statusLookbackDays: r.statusLookbackDays ?? null,
    };
  }

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    const saved = await saveRegion({
      regionId: region.id,
      regionName: data.regionName,
      openHashtag: data.openHashtag,
      closeHashtag: data.closeHashtag,
      statusLookbackDays: data.statusLookbackDays ?? null,
    });
    // Reset the form with the returned values so the field stays populated
    // and dirty state is cleared.
    if (saved) {
      form.reset(getFormValues(saved));
    }
  }

  // Sync form values with region prop on initial load / region change.
  useEffect(() => {
    form.reset(getFormValues(region));
  }, [region.id]);

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
                href={`https://www.instagram.com/${region.user?.username}/`}
                target="_blank"
              >
                <strong>@{region.user?.username}</strong>
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

        <div className="flex flex-col space-y-3">
          <div className="flex flex-col space-y-1">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
              Post Lookback Threshold
            </h4>
            <p className="text-xs">
              Only consider Instagram posts from the last N days when checking
              for status hashtags. Leave blank to consider all posts.
            </p>
          </div>

          <FormField
            control={form.control}
            name="statusLookbackDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Days</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="No limit"
                    className="max-w-[120px]"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === '' ? null : e.target.value,
                      )
                    }
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  e.g. <strong>60</strong> to only look at the last 60 days
                </FormDescription>
              </FormItem>
            )}
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
