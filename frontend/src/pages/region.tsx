import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { PlusIcon } from '@radix-ui/react-icons';
import { useSelectedRegionId } from '@/hooks/use-selected-region-id';
import { useRegion } from '@/hooks/use-region';
import { useRegionStatus } from '@/hooks/use-region-status';
import { Header } from '@/components/header';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { RegionForm } from '@/components/region-form';
import { Button } from '@/components/ui/button';
import { TrailDialog } from '@/components/trail-dialog';
import { WebhookDialog } from '@/components/webhook-dialog';
import { Trail, Webhook } from '@/api';

export function Region() {
  const { regionId } = useParams();
  const { data: selectedRegionId } = useSelectedRegionId();
  const { data: region } = useRegion(selectedRegionId);
  const { data: regionStatus } = useRegionStatus(regionId);
  const [trailDialogOpen, setTrailDialogOpen] = useState(false);
  const [selectedTrail, setSelectedTrail] = useState<Trail>();
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook>();

  const trails = (region?.trails || []).sort(
    (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
  );
  const webhooks = (region?.webhooks || []).sort(
    (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
  );

  return (
    <>
      <Header>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink asChild>
                <Link to="/regions">Regions</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex gap-6 items-center">
                <span>{region?.name}</span>
                <div className="hidden md:flex gap-2 items-center">
                  {regionStatus?.status === 'open' && (
                    <div className="text-xs bg-green-500 w-2 h-2 rounded-full" />
                  )}
                  {regionStatus?.status === 'closed' && (
                    <div className="text-xs bg-red-500 w-2 h-2 rounded-full" />
                  )}
                  {regionStatus?.message && (
                    <div className="text-xs text-muted-foreground w-full max-w-[500px] text-ellipsis overflow-hidden">
                      {regionStatus.message}
                    </div>
                  )}
                </div>
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Header>
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        {region && (
          <div className="w-full max-w-[820px] flex flex-row gap-16">
            <div className="flex-1 flex flex-col gap-6">
              <h2 className="text-xl">Region Settings</h2>
              <RegionForm key={region.id} defaultValue={region} />
            </div>

            <div className="flex-1 flex flex-col gap-14">
              <div className="flex flex-col gap-4">
                <div className="flex-1 flex flex-row items-center gap-4">
                  <h2 className="flex-1 text-xl">Trails</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTrail(undefined);
                      setTrailDialogOpen(true);
                    }}
                  >
                    <PlusIcon />
                    New Trail
                  </Button>
                </div>
                {trails.length === 0 && (
                  <p className="text-sm italic">No trails.</p>
                )}
                {trails.map((trail) => (
                  <div key={trail.id} className="flex flex-row gap-4">
                    <div className="flex-1">
                      <h3 className="text-sm">{trail.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {trail.closeHashtag}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTrail(trail);
                        setTrailDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex-1 flex flex-row items-center gap-4">
                  <h2 className="flex-1 text-xl">Webhooks</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedWebhook(undefined);
                      setWebhookDialogOpen(true);
                    }}
                  >
                    <PlusIcon />
                    New Webhook
                  </Button>
                </div>
                {webhooks.length === 0 && (
                  <p className="text-sm italic">No webhooks.</p>
                )}
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="flex flex-row gap-4">
                    <div className="flex-1">
                      <h3 className="text-sm">{webhook.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {webhook.description}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedWebhook(webhook);
                        setWebhookDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <TrailDialog
        key={selectedTrail?.id}
        open={trailDialogOpen}
        onOpenChange={(open) => {
          setTrailDialogOpen(open);
          if (!open) setTimeout(() => setSelectedTrail(undefined), 250);
        }}
        region={region}
        trail={selectedTrail}
      />

      <WebhookDialog
        key={selectedWebhook?.id}
        open={webhookDialogOpen}
        onOpenChange={(open) => {
          setWebhookDialogOpen(open);
          if (!open) setTimeout(() => setSelectedWebhook(undefined), 250);
        }}
        region={region}
        webhook={selectedWebhook}
      />
    </>
  );
}