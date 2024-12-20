import { z } from 'zod';
import { useForm } from 'react-hook-form';
import pupa from 'pupa';
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
import { Region, Webhook } from '@/api';
import { urlSafeObject } from '@/lib/utils';
import { Form } from '@/components/ui/form';
import { ConfirmDelete } from '@/components/confirm-delete';
import { TextField } from '@/components/text-field';
import { SelectField } from '@/components/select-field';
import { SelectItem } from '@/components/ui/select';
import { SwitchField } from '@/components/switch-field';
import { useTrailStatus } from '@/hooks/use-trail-status';
import { useRegionStatus } from '@/hooks/use-region-status';
import { useSaveWebhook } from '@/hooks/use-save-webhook';
import { useDeleteWebhook } from '@/hooks/use-delete-webhook';

interface WebhookDialogProps {
  open: boolean;
  region?: Region;
  webhook?: Webhook;
  onOpenChange: (open: boolean) => void;
}

const FormSchema = z.object({
  webhookName: z.string().min(1, {
    message: 'Webhook name is required',
  }),
  description: z.string().optional(),
  trailId: z.string().optional(),
  enabled: z.boolean(),
  method: z.string(),
  url: z.string(),
});

export function WebhookDialog({
  open,
  region,
  webhook,
  onOpenChange,
}: WebhookDialogProps) {
  console.log('webhook', webhook);
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      webhookName: webhook?.name ?? '',
      description: webhook?.description,
      trailId: webhook?.trailId || 'region',
      enabled: webhook?.enabled ?? true,
      method: webhook?.method ?? 'POST',
      url: webhook?.url ?? '',
    },
  });

  const enabled = form.watch('enabled');
  const trailId = form.watch('trailId');
  const url = form.watch('url');
  const isDirty = Object.values(form.formState.dirtyFields).length > 0;

  const trail = region?.trails.find((t) => t.id === trailId);

  const { data: regionStatus } = useRegionStatus(region?.id);
  const { data: trailStatus } = useTrailStatus(trail?.id);

  const { mutateAsync: saveWebhook } = useSaveWebhook(region);
  const { mutateAsync: deleteWebhook } = useDeleteWebhook(region);

  function onSubmit(data: z.infer<typeof FormSchema>) {
    saveWebhook({
      webhookId: webhook?.id,
      ...data,
    });
    onOpenChange(false);
  }

  let urlExample = '';
  if (url) {
    try {
      if (trailId && trail && trailStatus) {
        urlExample = pupa(url, urlSafeObject(trailStatus));
      } else if (!trail && regionStatus) {
        urlExample = pupa(url, urlSafeObject(regionStatus));
      }
    } catch (e) {
      console.error('Failed to parse URL', e);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[820px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              {webhook?.id ? (
                <>
                  <DialogTitle>Edit Webhook</DialogTitle>
                  <DialogDescription>Update webhook settings</DialogDescription>
                </>
              ) : (
                <>
                  <DialogTitle>Create Webhook</DialogTitle>
                  <DialogDescription>
                    Add a new webhook to the region
                  </DialogDescription>
                </>
              )}
            </DialogHeader>
            <div className="flex flex-row gap-12 py-4 pb-6">
              <div className="flex-1 flex flex-col gap-4">
                <TextField
                  control={form.control}
                  name="webhookName"
                  label="Webhook Name"
                  className="max-w-60"
                />

                <TextField
                  control={form.control}
                  name="description"
                  label="Description"
                  multiline
                />

                <div className="flex flex-col space-y-3">
                  <div className="flex flex-col space-y-1">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
                      Trigger Settings
                    </h4>
                    <p className="text-xs">
                      You can trigger a webhook when the region status changes
                      or when a specific trail status changes.
                    </p>
                  </div>

                  <SelectField
                    control={form.control}
                    name="trailId"
                    label="Trigger when"
                    className="max-w-[200px]"
                  >
                    <SelectItem value="region">
                      Region status changed
                    </SelectItem>
                    {region?.trails.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} status changes
                      </SelectItem>
                    ))}
                  </SelectField>

                  <SwitchField
                    control={form.control}
                    name="enabled"
                    label="Enabled"
                    description={
                      enabled ? (
                        <>
                          Webhook will trigger when the status of{' '}
                          {
                            <strong>
                              {trailId === 'region'
                                ? region?.name
                                : trail?.name}
                            </strong>
                          }{' '}
                          changes.
                        </>
                      ) : (
                        'Webhook is disabled and will not trigger.'
                      )
                    }
                  />
                </div>
              </div>
              <div className="flex-[1.35] flex flex-col gap-4">
                <div className="flex flex-col space-y-3">
                  <div className="flex flex-col space-y-1">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
                      Request Settings
                    </h4>
                    <p className="text-xs">
                      Webhooks URLs can contain the current status using{' '}
                      <a
                        target="blank"
                        href="https://github.com/jschr/trail-status-app#variables"
                        className="text-primary hover:underline"
                      >
                        variables
                      </a>
                      . Webhooks using POST will also receive the status as JSON
                      in the request body.
                    </p>
                  </div>
                </div>

                <SelectField
                  control={form.control}
                  name="method"
                  label="Method"
                  className="max-w-[120px]"
                >
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectField>

                <TextField
                  control={form.control}
                  label="URL"
                  name="url"
                  multiline
                  className="h-32"
                  description={
                    urlExample && (
                      <>
                        <em>Example:</em>&nbsp;
                        <a
                          className="text-primary hover:underline whitespace-pre-wrap break-all"
                          href={urlExample}
                          target="_blank"
                        >
                          {urlExample.length > 480
                            ? `${urlExample.slice(0, 480)}...`
                            : urlExample}
                        </a>
                      </>
                    )
                  }
                />
              </div>
            </div>
            <DialogFooter>
              {webhook?.id && (
                <ConfirmDelete
                  title={`Delete webook '${webhook.name}'?`}
                  onDelete={async () => {
                    await deleteWebhook(webhook.id);
                    onOpenChange(false);
                  }}
                />
              )}
              <div className="flex-1" />
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!isDirty}>
                {webhook?.id ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
