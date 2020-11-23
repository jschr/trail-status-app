import React, { useState, useEffect, useCallback } from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import api, { Trail, Region } from '../../api';
import useSaveTrail from '../../hooks/useSaveTrail';

export interface TrailDialogProps {
  open: boolean;
  region: Region;
  trail?: Trail;
  handleClose: () => void;
  refetchRegion: () => void;
}

const TrailDialog = ({
  trail,
  region,
  open,
  handleClose,
  refetchRegion,
}: TrailDialogProps) => {
  const [name, setName] = useState(trail?.name);
  const [closeHashtag, setCloseHashtag] = useState(trail?.closeHashtag);
  const [isSaving, setIsSaving] = useState(false);

  const saveTrail = useSaveTrail(trail);

  const isValid = !!name && !!closeHashtag;
  const hasChanged = trail
    ? trail.name !== name || trail.closeHashtag !== closeHashtag
    : true;

  const saveAndClose = useCallback(async () => {
    setIsSaving(true);
    await saveTrail({ name, closeHashtag, regionId: region.id });
    setIsSaving(false);
    refetchRegion();
    handleClose();
  }, [name, closeHashtag, handleClose, setIsSaving, refetchRegion]);

  useEffect(() => {
    if (trail) return;
    setCloseHashtag(
      `#${(name || '')
        .toLowerCase()
        .replace(/\s/, '_')
        .replace(`'`, '')}closed`,
    );
  }, [trail, name, setCloseHashtag]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs">
      <form
        onSubmit={e => {
          e.preventDefault();
          saveAndClose();
        }}
      >
        <DialogTitle>
          {trail ? `Edit ${trail.name} Trail` : 'Add New Trail'}
        </DialogTitle>
        <DialogContent>
          <Box>
            <TextField
              fullWidth
              autoFocus={!trail}
              size="small"
              variant="outlined"
              label="Trail name"
              value={name ?? ''}
              onChange={e => setName(e.target.value)}
            />
          </Box>

          <Box mt={3}>
            <Typography color="textSecondary" variant="overline">
              Hashtag Settings
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption">
              When opening the region, you can tag your post with specific
              hastags to keep one or more trails closed.
            </Typography>
          </Box>

          <Box mt={3} mb={1}>
            <TextField
              fullWidth
              label="Trail closed"
              type="text"
              size="small"
              variant="outlined"
              value={closeHashtag ?? '#'}
              onChange={e => setCloseHashtag(e.target.value)}
              helperText={`Example: The trails are open but please avoid ${name ||
                ''}! ${region.openHashtag} ${closeHashtag || ''}`}
            />
          </Box>
        </DialogContent>
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
            disabled={isSaving || !hasChanged || !isValid}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TrailDialog;
