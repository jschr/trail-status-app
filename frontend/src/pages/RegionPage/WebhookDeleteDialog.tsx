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

export interface WebhookDialogProps {
  webhook: Webhook;
  region: Region;
  handleClose: () => void;
}

const WebhookDialog = ({
  webhook,
  region,
  handleClose,
}: WebhookDialogProps) => {
  const trail = region.trails.find(t => t.id === webhook.trailId);

  const queryCache = useQueryCache();

  const [deleteWebhook, deleteWebhookState] = useMutation(
    async (id: string) => {
      await api.deleteWebhook(id);
      queryCache.invalidateQueries(['region', webhook.regionId]);
    },
  );

  const onDelete = useCallback(async () => {
    await deleteWebhook(webhook.id);
    handleClose();
  }, [webhook, deleteWebhook, handleClose]);

  return (
    <Dialog open onClose={handleClose} maxWidth="xs">
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <WarningIcon fontSize="large" />
          &nbsp;&nbsp;Delete "{webhook.name}"?
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Deleting this webhook will no longer trigger when the status of{' '}
          <strong>
            {webhook.trailId ? (trail ? trail.name : '[Deleted]') : region.name}
          </strong>{' '}
          changes.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button
          onClick={onDelete}
          color="secondary"
          disabled={deleteWebhookState.status === 'loading'}
        >
          {deleteWebhookState.status === 'loading' ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WebhookDialog;
