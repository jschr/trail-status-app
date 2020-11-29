import React, { useCallback } from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import Link from '@material-ui/core/Link';
import Switch from '@material-ui/core/Switch';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormHelperText from '@material-ui/core/FormHelperText';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryCache } from 'react-query';
import pupa from 'pupa';
import traverse from 'traverse';
import api, { Webhook, Region, RegionStatus } from '../../api';
import SelectField from '../../components/SelectField';
import TextField from '../../components/TextField';

const urlSafeObject = (obj: any) => {
  // eslint-disable-next-line
  return traverse(obj).map(function(x) {
    if (typeof x === 'string') {
      this.update(encodeURIComponent(x));
    } else if (x === undefined || x === null) {
      this.update('');
    }
  });
};

export interface WebhookDialogProps {
  region: Region;
  regionStatus?: RegionStatus | null;
  webhook?: Webhook;
  handleClose: () => void;
}

interface WebhookInputs {
  name: string;
  description: string;
  trailId: string;
  method: string;
  url: string;
  enabled: boolean;
}

const WebhookDialog = ({
  webhook,
  region,
  regionStatus,
  handleClose,
}: WebhookDialogProps) => {
  const { register, handleSubmit, formState, control, watch } = useForm<
    WebhookInputs
  >({ defaultValues: webhook ? webhook : { enabled: true } });

  const trailId = watch('trailId');
  const enabled = watch('enabled');
  const url = watch('url');

  const trail = region.trails.find(t => t.id === trailId);

  const { data: trailStatus } = useQuery(
    ['trailStatus', trailId],
    () => (trailId ? api.getTrailStatus(trailId) : null),
    { staleTime: Infinity },
  );

  const queryCache = useQueryCache();

  const [saveWebhook, saveWebhookState] = useMutation(
    async (params: { id?: string; inputs: WebhookInputs }) => {
      if (params.id) {
        await api.updateWebhook(params.id, params.inputs);
      } else {
        await api.createWebhook({ ...params.inputs, regionId: region.id });
      }

      queryCache.invalidateQueries(['region', region.id]);
    },
  );

  const onSubmit = useCallback(
    async (inputs: WebhookInputs) => {
      await saveWebhook({ id: webhook?.id, inputs });
      handleClose();
    },
    [handleClose, saveWebhook, webhook],
  );

  const isTrailDeleted = !!trailId && !trail;
  const isDirty = Object.values(formState.dirtyFields).length > 0;

  let urlExample = '';
  if (url) {
    if (trailId && trail && trailStatus) {
      urlExample = pupa(url, urlSafeObject(trailStatus));
    } else if (!trailId && regionStatus) {
      urlExample = pupa(url, urlSafeObject(regionStatus));
    }
  }

  return (
    <Dialog open onClose={handleClose} maxWidth="md">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container>
          <Grid item xs={12} sm={5}>
            <DialogTitle>
              {webhook ? `Edit ${webhook.name} Webhook` : 'Add New Webhook'}
            </DialogTitle>
            <DialogContent>
              <Box>
                <TextField
                  autoFocus={!webhook}
                  label="Webhook name"
                  name="name"
                  inputRef={register({ required: true })}
                  fullWidth
                />
              </Box>

              <Box mt={2}>
                <TextField
                  label="Description (optional)"
                  name="description"
                  fullWidth
                  multiline
                  rows={2}
                  inputRef={register}
                />
              </Box>

              <Box mt={3}>
                <Typography color="textSecondary" variant="overline">
                  Trigger Settings
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption">
                  You can trigger a webhook when the region status changes or
                  when a specific trail status changes.
                </Typography>
              </Box>

              <Box mt={3}>
                <SelectField
                  label="Trigger when"
                  name="trailId"
                  inputRef={register}
                  fullWidth
                  error={isTrailDeleted}
                >
                  {isTrailDeleted && (
                    <option value={webhook?.trailId} disabled>
                      [Deleted]
                    </option>
                  )}
                  <option value="">Region status changes</option>
                  {region?.trails.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} status changes
                    </option>
                  ))}
                </SelectField>

                <Box mt={2}>
                  <FormControlLabel
                    label="Enabled"
                    control={
                      <Controller
                        control={control}
                        name="enabled"
                        render={({ value, onChange }) => (
                          <Switch
                            color="primary"
                            checked={value ?? false}
                            onChange={e => onChange(e.currentTarget.checked)}
                          />
                        )}
                      />
                    }
                  />
                  <FormHelperText>
                    {enabled ? (
                      <>
                        Webhook will trigger when the status of{' '}
                        {
                          <strong>
                            {trailId
                              ? trail
                                ? trail.name
                                : '[Deleted]'
                              : region.name}
                          </strong>
                        }{' '}
                        changes.
                      </>
                    ) : (
                      'Webhook is disabled and will not trigger.'
                    )}
                  </FormHelperText>
                </Box>
              </Box>
            </DialogContent>
          </Grid>
          <Grid item xs={12} sm={7}>
            <DialogContent>
              <Box>
                <Typography color="textSecondary" variant="overline">
                  Request Settings
                </Typography>
                <Box>
                  <Typography variant="caption">
                    Webhooks URLs can contain the current status using{' '}
                    <Link>variables</Link>. Webhooks using POST will also
                    receive the status as JSON in the request body.
                  </Typography>
                </Box>
              </Box>

              <Box mt={3}>
                <SelectField
                  label="Method"
                  name="method"
                  inputRef={register({ required: true })}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </SelectField>
              </Box>

              <Box mt={2}>
                <TextField
                  label="URL"
                  name="url"
                  inputRef={register({ required: true })}
                  fullWidth
                  multiline
                  helperText={
                    urlExample && (
                      <>
                        <em>Example:</em>&nbsp;
                        <Link
                          color="inherit"
                          href={urlExample}
                          target="_blank"
                          style={{
                            whiteSpace: 'pre-wrap',
                            lineBreak: 'anywhere',
                          }}
                        >
                          {urlExample.length > 480
                            ? `${urlExample.slice(0, 480)}...`
                            : urlExample}
                        </Link>
                      </>
                    )
                  }
                />
              </Box>
            </DialogContent>
          </Grid>
        </Grid>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
          <Button
            type="submit"
            color="primary"
            disabled={saveWebhookState.status === 'loading' || !isDirty}
          >
            {saveWebhookState.status === 'loading' ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default WebhookDialog;
