import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import CardHeader from '@material-ui/core/CardHeader';
import Divider from '@material-ui/core/Divider';
import Button from '@material-ui/core/Button';
import Link from '@material-ui/core/Link';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import IconButton from '@material-ui/core/IconButton';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import React, { Fragment, useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryCache } from 'react-query';
import api, { Webhook, Region } from '../../api';
import useUser from '../../hooks/useUser';
import useRegion from '../../hooks/useRegion';
import Container from '../../components/Container';
import TextField from '../../components/TextField';
import TrailDialog from './TrailDialog';
import WebhookDialog from './WebhookDialog';

interface RegionInputs {
  name: string;
  openHashtag: string;
  closeHashtag: string;
}

const RegionPage = () => {
  const queryCache = useQueryCache();

  const { data: user } = useQuery('user', () => api.getUser());
  const regionId = user?.regions[0]?.id;

  const { data: region } = useQuery(['region', regionId], () =>
    regionId ? api.getRegion(regionId) : null,
  );

  const [saveRegion, { status }] = useMutation(
    async (params: { id: string; inputs: RegionInputs }) => {
      const updatedRegion = await api.updateRegion(params.id, params.inputs);
      queryCache.setQueryData(['region', updatedRegion.id], () => ({
        ...updatedRegion,
        webhooks: region?.webhooks,
        trails: region?.trails,
      }));
    },
  );

  const { register, handleSubmit, setValue, reset, formState } = useForm<
    RegionInputs
  >();

  // TODO: Use react-router for this
  const [selectedTrailId, setSelectedTrailId] = useState('');
  const [selectedWebhookId, setSelectedWebhookId] = useState('');
  const [isTrailDialogOpen, setIsTrailDialogOpen] = useState(false);
  const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);

  const isDirty = Object.values(formState.dirtyFields).length > 0;
  const selectedTrail = region?.trails.find(t => t.id === selectedTrailId);
  const selectedWebhook = region?.webhooks.find(
    w => w.id === selectedWebhookId,
  );

  const onSubmit = useCallback(
    async (inputs: RegionInputs) => {
      if (region) {
        await saveRegion({ id: region.id, inputs });
      }
    },
    [region],
  );

  // Reset the form when region is loaded or changed.
  useEffect(() => {
    if (region) reset(region);
  }, [region]);

  return (
    <Container maxWidth="md">
      <CardHeader title={region?.name ?? ''} />
      <Divider style={{ opacity: 0.5 }} />

      <Grid container spacing={8}>
        <Grid item xs={12} sm={5}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Box mt={6}>
              <TextField
                fullWidth
                label="Region name"
                name="name"
                defaultValue={region?.name}
                inputRef={register({ required: true })}
              />
            </Box>

            <Box mt={4}>
              <Typography color="textSecondary" variant="overline">
                Hashtag Settings
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption">
                Open or close the trails by posting to{' '}
                <Link
                  href={`https://www.instagram.com/${user?.username}/`}
                  target="_blank"
                  color="textPrimary"
                >
                  <strong>@{user?.username}</strong>
                </Link>{' '}
                with a specific hashtag.
              </Typography>
            </Box>

            <Box mt={4}>
              <TextField
                fullWidth
                label="Region open"
                name="openHashtag"
                defaultValue={region?.openHashtag}
                inputRef={register({ required: true })}
                helperText={`Example: Trails are open! ${region?.openHashtag ??
                  ''}`}
              />
            </Box>

            <Box mt={3}>
              <TextField
                fullWidth
                label="Region close"
                name="closeHashtag"
                defaultValue={region?.closeHashtag}
                inputRef={register({ required: true })}
                helperText={`Example: Trails are too wet to ride! ${region?.closeHashtag ??
                  ''}`}
              />
            </Box>

            <Box mt={6}>
              <Button
                fullWidth
                type="submit"
                variant="contained"
                color="primary"
                disabled={status === 'loading' || !isDirty}
              >
                {status === 'loading' ? 'Saving...' : 'Save Region'}
              </Button>
            </Box>
          </form>
        </Grid>

        <Grid item xs={12} sm={7}>
          <Box
            mt={4}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography color="textSecondary" variant="overline">
              Trails
            </Typography>
            <IconButton
              color="primary"
              onClick={() => setIsTrailDialogOpen(true)}
            >
              <AddCircleOutlineIcon />
            </IconButton>
          </Box>
          <List>
            {region?.trails.map(trail => (
              <Fragment key={trail.id}>
                <ListItem
                  button
                  onClick={() => {
                    setSelectedTrailId(trail.id);
                    setIsTrailDialogOpen(true);
                  }}
                >
                  {trail.name || <em>Unknown</em>}
                </ListItem>
                <Divider />
              </Fragment>
            ))}
          </List>

          <Box
            mt={6}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography color="textSecondary" variant="overline">
              Webhooks
            </Typography>
            <IconButton
              color="primary"
              onClick={() => {
                setSelectedWebhookId('');
                setIsWebhookDialogOpen(true);
              }}
            >
              <AddCircleOutlineIcon />
            </IconButton>
          </Box>
          <List>
            {region?.webhooks.map(webhook => (
              <Fragment key={webhook.id}>
                <ListItem
                  button
                  onClick={() => {
                    setSelectedWebhookId(webhook.id);
                    setIsWebhookDialogOpen(true);
                  }}
                >
                  {webhook.name || <em>Unamed</em>}
                </ListItem>
                <Divider />
              </Fragment>
            ))}
          </List>
        </Grid>
      </Grid>

      {region && isTrailDialogOpen && (
        <TrailDialog
          open={isTrailDialogOpen}
          region={region}
          trail={selectedTrail}
          handleClose={() => {
            setIsTrailDialogOpen(false);
            setSelectedTrailId('');
          }}
        />
      )}

      {region && isWebhookDialogOpen && (
        <WebhookDialog
          open={isWebhookDialogOpen}
          region={region}
          webhook={selectedWebhook}
          handleClose={() => {
            setIsWebhookDialogOpen(false);
            setSelectedWebhookId('');
          }}
        />
      )}
    </Container>
  );
};

export default RegionPage;
