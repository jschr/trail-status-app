import React, { useEffect, useCallback } from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryCache } from 'react-query';
import api, { Trail, Region } from '../../api';
import TextField from '../../components/TextField';

export interface TrailDialogProps {
  region: Region;
  trail?: Trail;
  handleClose: () => void;
}

interface TrailInputs {
  name: string;
  closeHashtag: string;
}

const TrailDialog = ({ trail, region, handleClose }: TrailDialogProps) => {
  const { register, handleSubmit, formState, watch, setValue } = useForm<
    TrailInputs
  >({
    defaultValues: {
      name: trail?.name,
      closeHashtag: trail?.closeHashtag,
    },
  });

  const name = watch('name');
  const closeHashtag = watch('closeHashtag');
  const isDirty = Object.values(formState.dirtyFields).length > 0;

  const queryCache = useQueryCache();

  const [saveTrail, saveTrailState] = useMutation(
    async (params: { id?: string; inputs: TrailInputs }) => {
      if (params.id) {
        await api.updateTrail(params.id, params.inputs);
      } else {
        await api.createTrail({ ...params.inputs, regionId: region.id });
      }

      queryCache.invalidateQueries(['region', region.id]);
    },
  );

  const onSubmit = useCallback(
    async (inputs: TrailInputs) => {
      await saveTrail({ id: trail?.id, inputs });
      handleClose();
    },
    [trail, saveTrail, handleClose],
  );

  // Set the default hashtag for a new trail when updating the name.
  useEffect(() => {
    if (trail) return;
    if (!name) return;
    setValue(
      'closeHashtag',
      `#${(name || '')
        .toLowerCase()
        .replace(/\s/, '')
        .replace(`'`, '')}closed`,
    );
  }, [trail, name, setValue]);

  return (
    <Dialog open onClose={handleClose} maxWidth="xs">
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          {trail ? `Edit ${trail.name} Trail` : 'Add New Trail'}
        </DialogTitle>
        <DialogContent>
          <Box>
            <TextField
              fullWidth
              autoFocus={!trail}
              label="Trail name"
              name="name"
              inputRef={register({ required: true })}
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
              name="closeHashtag"
              inputRef={register({ required: true })}
              helperText={`Example: The trails are open but please avoid ${name ||
                ''}! ${region.openHashtag} ${closeHashtag || ''}`}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Box flex={1} />
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
          <Button
            type="submit"
            color="primary"
            disabled={saveTrailState.status === 'loading' || !isDirty}
          >
            {saveTrailState.status === 'loading' ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TrailDialog;
