import React, { useState, useEffect, useCallback } from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import Link from '@material-ui/core/Link';
import PlayCircleOutlineIcon from '@material-ui/icons/PlayCircleOutline';
import IconButton from '@material-ui/core/IconButton';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryCache } from 'react-query';
import api, { Webhook, Region } from '../../api';
import SelectField from '../../components/SelectField';
import TextField from '../../components/TextField';

export interface WebhookDialogProps {
  open: boolean;
  region: Region;
  webhook?: Webhook;
  handleClose: () => void;
}

interface WebhookInputs {
  name: string;
  description: string;
  trailId: string;
  method: string;
  url: string;
}

const WebhookDialog = ({
  webhook,
  region,
  open,
  handleClose,
}: WebhookDialogProps) => {
  const { register, handleSubmit } = useForm<WebhookInputs>();

  const queryCache = useQueryCache();

  const [saveWebhook, { status }] = useMutation(
    async (params: { id?: string; inputs: WebhookInputs }) => {
      if (params.id) {
        await api.updateWebhook(params.id, params.inputs);
      } else {
        await api.createWebhook(params.inputs);
      }

      queryCache.invalidateQueries(['region', region.id]);
    },
  );

  const onSubmit = useCallback(
    async (inputs: WebhookInputs) => {
      await saveWebhook({ id: webhook?.id, inputs });
      handleClose();
    },
    [handleClose],
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md">
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
                  defaultValue={webhook?.name}
                  inputRef={register({ required: true })}
                  fullWidth
                />
              </Box>

              <Box mt={2}>
                <TextField
                  label="Description (optional)"
                  name="description"
                  defaultValue={webhook?.description}
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
                  defaultValue={webhook?.trailId}
                  inputRef={register}
                  fullWidth
                >
                  <option value="">Region status changes</option>
                  {region?.trails.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} status changes
                    </option>
                  ))}
                </SelectField>
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
                  defaultValue={webhook?.method ?? 'GET'}
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
                  defaultValue={webhook?.url}
                  inputRef={register({ required: true })}
                  fullWidth
                  multiline
                />
              </Box>

              <Box mt={2}></Box>
            </DialogContent>
          </Grid>
        </Grid>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">
            Delete
          </Button>
          <Box flex={1} />
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
          <Button
            type="submit"
            color="primary"
            disabled={status === 'loading'}
            // disabled={isSaving || !hasChanged || !isValid}
          >
            {status === 'loading' ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default WebhookDialog;
