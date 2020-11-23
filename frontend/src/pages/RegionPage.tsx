import React, { useState, Fragment } from 'react';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import CardHeader from '@material-ui/core/CardHeader';
import Divider from '@material-ui/core/Divider';
import Button from '@material-ui/core/Button';
import Link from '@material-ui/core/Link';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import IconButton from '@material-ui/core/IconButton';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import useUser from '../hooks/useUser';
import useRegion from '../hooks/useRegion';
import Container from '../components/Container';
import TrailDialog from '../components/TrailDialog';

const RegionPage = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTrailId, setSelectedTrailId] = useState('');
  const [selectedWebhookId, setSelectedWebhookId] = useState('');
  const [isTrailDialogOpen, setIsTrailDialogOpen] = useState(false);
  const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);

  const user = useUser();
  const regionId = user?.regions[0]?.id;
  const [region, refetchRegion] = useRegion(regionId);

  const selectedTrail = region?.trails.find(t => t.id === selectedTrailId);
  const selectedWebhook = region?.webhooks.find(
    w => w.id === selectedWebhookId,
  );

  return (
    <Container maxWidth="md">
      <CardHeader title={region?.name ?? ''} />
      <Divider style={{ opacity: 0.5 }} />

      <Grid container spacing={8}>
        <Grid item xs={12} sm={5}>
          <Box mt={6}>
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              label="Region name"
              helperText=""
              value={region?.name ?? ''}
              // onChange={e =>
              //   updateSettingsState({ openHashtag: e.target.value })
              // }
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
              size="small"
              variant="outlined"
              label="Region open"
              helperText={`Example: Trails are open! ${region?.openHashtag ??
                ''}`}
              value={region?.openHashtag ?? ''}
              // onChange={e =>
              //   updateSettingsState({ openHashtag: e.target.value })
              // }
            />
          </Box>

          <Box mt={3}>
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              label="Region closed"
              helperText={`Example: Trails are too wet to ride! ${region?.closeHashtag ??
                ''}`}
              value={region?.closeHashtag ?? ''}
              // onChange={e =>
              //   updateSettingsState({ closeHashtag: e.target.value })
              // }
            />
          </Box>

          <Box mt={6}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              disabled={true}
              // disabled={isSaving || !hasChanged}
              // onClick={saveSettings}
            >
              {isSaving ? 'Saving...' : 'Save Region'}
            </Button>
          </Box>
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
                  dense
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
                  dense
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
          refetchRegion={refetchRegion}
        />
      )}
    </Container>
  );
};

export default RegionPage;
