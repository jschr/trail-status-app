import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { ChevronDownIcon, CheckIcon, PlusIcon } from '@radix-ui/react-icons';
import { useSelectedRegionId } from '@/hooks/use-selected-region-id';
import { useUser } from '@/hooks/use-user';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Trail, Webhook } from '@/api';

export function Region() {
  const { regionId } = useParams();

  const { data: selectedRegionId } = useSelectedRegionId();
  const { data: region } = useRegion(selectedRegionId);
  const { data: regionStatus } = useRegionStatus(regionId);
  const { data: user } = useUser();

  const [dialogKey, setDialogKey] = useState(0);
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

  const hasMultipleRegions = (user?.regions.length ?? 0) > 1;

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
              <Popover>
                <PopoverTrigger
                  className="flex gap-2 items-center hover:text-foreground"
                  disabled={!hasMultipleRegions}
                >
                  <BreadcrumbPage>{region?.name}</BreadcrumbPage>
                  {hasMultipleRegions && <ChevronDownIcon />}
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0 -ml-3" align="start">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        {user?.regions.map((r) => (
                          <CommandItem key={r.id} asChild>
                            <Link
                              to={`/regions/${r.id}`}
                              onClick={() => {
                                localStorage.setItem('selectedRegionId', r.id);
                              }}
                            >
                              <span>{r.name}</span>
                              {r.id === regionId && (
                                <CheckIcon className="ml-auto opacity-100" />
                              )}
                            </Link>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <div className="ml-4 flex gap-2 items-center">
                {regionStatus?.status === 'open' && (
                  <div className="text-xs bg-green-500 w-2 h-2 rounded-full" />
                )}
                {regionStatus?.status === 'closed' && (
                  <div className="text-xs bg-red-500 w-2 h-2 rounded-full" />
                )}
                {regionStatus?.message && (
                  <div className="hidden md:block text-xs w-full max-w-[500px] text-ellipsis overflow-hidden">
                    {regionStatus.message}
                  </div>
                )}
              </div>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Header>
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        {region && (
          <div className="w-full max-w-[820px] flex flex-col md:flex-row gap-16">
            <div className="flex-1 flex flex-col gap-6">
              <h2 className="text-xl">Region Settings</h2>
              <RegionForm key={region.id} region={region} />
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
                      setDialogKey((k) => k + 1);
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
                        setDialogKey((k) => k + 1);
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
                      setDialogKey((k) => k + 1);
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
                        setDialogKey((k) => k + 1);
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
        key={'t' + dialogKey}
        open={trailDialogOpen}
        onOpenChange={(open) => {
          setTrailDialogOpen(open);
          if (!open) setTimeout(() => setSelectedTrail(undefined), 250);
        }}
        region={region}
        trail={selectedTrail}
      />

      <WebhookDialog
        key={'w' + dialogKey}
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
