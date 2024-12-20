import { z } from 'zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Region, Trail } from '@/api';
import { Form } from '@/components/ui/form';
import { TextField } from '@/components/text-field';
import { useSaveTrail } from '@/hooks/use-save-trail';
import { ConfirmDelete } from '@/components/confirm-delete';
import { useDeleteTrail } from '@/hooks/use-delete-trail';

interface TrailDialogProps {
  open: boolean;
  region?: Region;
  trail?: Trail;
  onOpenChange: (open: boolean) => void;
}

const FormSchema = z.object({
  trailName: z.string().min(1, {
    message: 'Trail name is required',
  }),
  closeHashtag: z.string().min(1, {
    message: 'Close hashtag is required.',
  }),
});

export function TrailDialog({
  open,
  region,
  trail,
  onOpenChange,
}: TrailDialogProps) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      trailName: trail?.name ?? '',
      closeHashtag: trail?.closeHashtag ?? '',
    },
  });

  const { mutateAsync: saveTrail } = useSaveTrail(region);
  const { mutateAsync: deleteTrail } = useDeleteTrail(region);

  function onSubmit(data: z.infer<typeof FormSchema>) {
    saveTrail({ trailId: trail?.id, ...data });
    onOpenChange(false);
  }

  const trailName = form.watch('trailName');
  const closeHashtag = form.watch('closeHashtag');

  const isDirty = Object.values(form.formState.dirtyFields).length > 0;

  // Set the default hashtag for a new trail when updating the name.
  useEffect(() => {
    if (trail) return;
    if (!trailName) return;
    form.setValue(
      'closeHashtag',
      `#${(trailName || '').toLowerCase().replace(/\s/, '').replace(`'`, '')}closed`,
    );
  }, [trail, trailName, form.setValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[455px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              {trail?.id ? (
                <>
                  <DialogTitle>Edit Trail</DialogTitle>
                  <DialogDescription>Update trail settings</DialogDescription>
                </>
              ) : (
                <>
                  {' '}
                  <DialogTitle>Create Trail</DialogTitle>
                  <DialogDescription>
                    Add a new trail to the region
                  </DialogDescription>
                </>
              )}
            </DialogHeader>
            <div className="grid gap-4 py-4 pb-6">
              <TextField
                control={form.control}
                name="trailName"
                label="Trail Name"
                className="max-w-60"
              />

              <div className="flex flex-col space-y-3">
                <div className="flex flex-col space-y-1">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
                    Hashtag Settings
                  </h4>
                  <p className="text-xs">
                    When opening the region, you can tag your post with specific
                    hashtags to keep one or more trails closed.
                  </p>
                </div>

                <TextField
                  control={form.control}
                  name="closeHashtag"
                  label="Close Hashtag"
                  className="max-w-48"
                  description={
                    trailName &&
                    closeHashtag &&
                    `Example: The trails are open but please avoid ${trailName} ${region?.openHashtag} ${closeHashtag}`
                  }
                />
              </div>
            </div>
            <DialogFooter>
              {trail?.id && (
                <ConfirmDelete
                  title={`Delete trail '${trail.name}'?`}
                  onDelete={async () => {
                    await deleteTrail(trail.id);
                    onOpenChange(false);
                  }}
                />
              )}
              <div className="flex-1" />
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!isDirty}>
                {trail?.id ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
