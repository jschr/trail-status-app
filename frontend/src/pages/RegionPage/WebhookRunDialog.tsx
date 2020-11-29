import React, { useCallback } from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContentText from '@material-ui/core/DialogContentText';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import WarningIcon from '@material-ui/icons/Warning';
import { useMutation, useQueryCache } from 'react-query';
import api, { Webhook, Region } from '../../api';

export interface WebhookRunDialogProps {
  webhook: Webhook;
  region: Region;
  handleClose: () => void;
}

const WebhookRunDialog = ({
  webhook,
  region,
  handleClose,
}: WebhookRunDialogProps) => {
  const trail = region.trails.find(t => t.id === webhook.trailId);

  const queryCache = useQueryCache();

  const [runWebhook, runWebhookState] = useMutation(async (id: string) => {
    await api.runWebhook(id);
    queryCache.invalidateQueries(['region', webhook.regionId]);
  });

  const onRun = useCallback(async () => {
    await runWebhook(webhook.id);
  }, [webhook, runWebhook, handleClose]);

  return (
    <Dialog open onClose={handleClose} maxWidth="sm">
      <DialogTitle>
        <Box display="flex" alignItems="center">
          Trigger "{webhook.name}"
        </Box>
      </DialogTitle>
      <DialogContent>
        {/* <DialogContentText>
          Deleting this webhook will no longer trigger when the status of{' '}
          <strong>
            {webhook.trailId ? (trail ? trail.name : '[Deleted]') : region.name}
          </strong>{' '}
          changes.
        </DialogContentText> */}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          color="primary"
          disabled={runWebhookState.status === 'loading'}
          onClick={onRun}
        >
          {runWebhookState.status === 'loading' ? 'Running...' : 'Trigger'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WebhookRunDialog;
