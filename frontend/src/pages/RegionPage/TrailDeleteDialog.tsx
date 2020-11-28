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
import api, { Trail, Region } from '../../api';

export interface TrailDeleteDialogProps {
  trail: Trail;
  region: Region;
  handleClose: () => void;
}

const TrailDeleteDialog = ({
  trail,
  region,
  handleClose,
}: TrailDeleteDialogProps) => {
  const queryCache = useQueryCache();

  const [deleteTrail, deleteTrailState] = useMutation(async (id: string) => {
    await api.deleteTrail(id);
    queryCache.invalidateQueries(['region', trail.regionId]);
  });

  const onDelete = useCallback(async () => {
    await deleteTrail(trail.id);
    handleClose();
  }, [trail, deleteTrail, handleClose]);

  const trailWebhooks = region.webhooks.filter(w => w.trailId === trail.id);

  return (
    <Dialog open onClose={handleClose} maxWidth="xs">
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <WarningIcon fontSize="large" />
          &nbsp;&nbsp;Delete "{trail.name}" Trail?
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Deleting this trail will remove it from{' '}
          <strong>
            {region.name}
            {region.name.charAt(region.name.length - 1) === 's' ? "'" : "'s"}
          </strong>{' '}
          status
          {trailWebhooks.length > 0
            ? ' and disable the following webhooks: '
            : '.'}
          {trailWebhooks.length > 0 && (
            <ul>
              {trailWebhooks.map(w => (
                <li>{w.name}</li>
              ))}
            </ul>
          )}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button
          onClick={onDelete}
          color="secondary"
          disabled={deleteTrailState.status === 'loading'}
        >
          {deleteTrailState.status === 'loading' ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TrailDeleteDialog;
