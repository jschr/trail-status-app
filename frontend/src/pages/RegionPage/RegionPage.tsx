import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import CardHeader from '@material-ui/core/CardHeader';
import Divider from '@material-ui/core/Divider';
import Button from '@material-ui/core/Button';
import Link from '@material-ui/core/Link';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import React, { useEffect, useCallback } from 'react';
import {
  Switch,
  Route,
  Redirect,
  useHistory,
  RouteComponentProps,
} from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryCache } from 'react-query';
import api from '../../api';
import Container from '../../components/Container';
import TextField from '../../components/TextField';
import IconButton from '../../components/IconButton';
import StatusText from '../../components/StatusText';
import TimeAgo from '../../components/TimeAgo';
import TrailItem from './TrailItem';
import TrailDialog from './TrailDialog';
import TrailDeleteDialog from './TrailDeleteDialog';
import WebhookItem from './WebhookItem';
import WebhookDialog from './WebhookDialog';
import WebhookDeleteDialog from './WebhookDeleteDialog';

interface RegionPageProps extends RouteComponentProps<{ id: string }> {}

interface RegionInputs {
  name: string;
  openHashtag: string;
  closeHashtag: string;
}

const RegionPage = ({ match }: RegionPageProps) => {
  const history = useHistory();
  const queryCache = useQueryCache();

  const regionId = match.params.id;

  const { data: user } = useQuery('user', () => api.getUser());

  const { data: region, status: getRegionStatus } = useQuery(
    ['region', regionId],
    () => (regionId ? api.getRegion(regionId) : null),
  );

  const { data: regionStatus } = useQuery(
    ['regionStatus', regionId],
    () => (regionId ? api.getRegionStatus(regionId) : null),
    { staleTime: 2 * 60 * 1000, refetchOnWindowFocus: true },
  );

  const [runWebhook] = useMutation(async (id: string) => {
    await api.runWebhook(id);
    queryCache.invalidateQueries(['region', regionId]);
  });

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

  const { register, handleSubmit, reset, formState } = useForm<RegionInputs>();

  const onSubmit = useCallback(
    async (inputs: RegionInputs) => {
      if (region) {
        await saveRegion({ id: region.id, inputs });
      }
    },
    [region, saveRegion],
  );

  // Reset the form when region is loaded or changed.
  useEffect(() => {
    if (region) reset(region);
  }, [region, reset]);

  if (getRegionStatus === 'loading') {
    return null;
  }

  const isDirty = Object.values(formState.dirtyFields).length > 0;

  return (
    <Container maxWidth="md">
      <Box>
        <CardHeader
          title={
            <>
              {region?.name ?? ''}
              <Box position="relative">
                <Typography variant="body2">
                  <Box component="span" mr={1} color="text.secondary">
                    Status:
                  </Box>
                  <Box component="span" mr={3}>
                    <StatusText status={regionStatus?.status} />
                  </Box>

                  <Box component="span" mr={1} color="text.secondary">
                    Updated:
                  </Box>
                  <Box component="span" mr={2}>
                    <Link
                      href={regionStatus?.instagramPermalink}
                      target="_blank"
                      color="inherit"
                    >
                      <TimeAgo datetime={regionStatus?.updatedAt} />
                    </Link>
                  </Box>
                </Typography>
              </Box>
            </>
          }
        />
      </Box>

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
            pr={0.5}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography color="textSecondary" variant="overline">
              Trails
            </Typography>
            <IconButton onClick={() => history.push(`${match.url}/trails/new`)}>
              <AddCircleOutlineIcon />
            </IconButton>
          </Box>
          <List disablePadding>
            {region?.trails.map(trail => (
              <TrailItem
                key={trail.id}
                trail={trail}
                regionStatus={regionStatus}
                onEdit={() =>
                  history.push(`${match.url}/trails/${trail.id}/edit`)
                }
                onDelete={() =>
                  history.push(`${match.url}/trails/${trail.id}/delete`)
                }
              />
            ))}
          </List>

          <Box
            mt={6}
            pr={0.5}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography color="textSecondary" variant="overline">
              Webhooks
            </Typography>
            <IconButton
              onClick={() => history.push(`${match.url}/webhooks/new`)}
            >
              <AddCircleOutlineIcon />
            </IconButton>
          </Box>
          <List disablePadding>
            {region?.webhooks.map(webhook => (
              <WebhookItem
                key={webhook.id}
                webhook={webhook}
                region={region}
                onEdit={() =>
                  history.push(`${match.url}/webhooks/${webhook.id}/edit`)
                }
                onDelete={() =>
                  history.push(`${match.url}/webhooks/${webhook.id}/delete`)
                }
                onRun={() => runWebhook(webhook.id)}
              />
            ))}
          </List>
        </Grid>
      </Grid>

      {region && (
        <Switch>
          <Route
            path={`${match.url}/trails/new`}
            render={() => (
              <TrailDialog
                region={region}
                handleClose={() => history.push(`/regions/${regionId}`)}
              />
            )}
          />

          <Route
            path={`${match.url}/trails/:id/edit`}
            render={({ match }) => (
              <TrailDialog
                region={region}
                trail={region.trails.find(t => t.id === match.params.id)}
                handleClose={() => history.push(`/regions/${regionId}`)}
              />
            )}
          />

          <Route
            path={`${match.url}/trails/:id/delete`}
            render={({ match }) => {
              const trail = region.trails.find(t => t.id === match.params.id);
              if (!trail) {
                return <Redirect to="/" />;
              }
              return (
                <TrailDeleteDialog
                  trail={trail}
                  region={region}
                  handleClose={() => history.push(`/regions/${regionId}`)}
                />
              );
            }}
          />

          <Route
            path={`${match.url}/webhooks/new`}
            render={() => (
              <WebhookDialog
                region={region}
                regionStatus={regionStatus}
                handleClose={() => history.push(`/regions/${regionId}`)}
              />
            )}
          />

          <Route
            path={`${match.url}/webhooks/:id/edit`}
            render={({ match }) => (
              <WebhookDialog
                region={region}
                regionStatus={regionStatus}
                webhook={region.webhooks.find(w => w.id === match.params.id)}
                handleClose={() => history.push(`/regions/${regionId}`)}
              />
            )}
          />

          <Route
            path={`${match.url}/webhooks/:id/delete`}
            render={({ match }) => {
              const webhook = region.webhooks.find(
                t => t.id === match.params.id,
              );
              if (!webhook) {
                return <Redirect to="/" />;
              }
              return (
                <WebhookDeleteDialog
                  webhook={webhook}
                  region={region}
                  handleClose={() => history.push(`/regions/${regionId}`)}
                />
              );
            }}
          />
        </Switch>
      )}
    </Container>
  );
};

export default RegionPage;
