import React, { useState, useEffect, useCallback } from 'react';
import Avatar from '@material-ui/core/Avatar';
import Box from '@material-ui/core/Box';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import Divider from '@material-ui/core/Divider';
import Button from '@material-ui/core/Button';
import Link from '@material-ui/core/Link';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import Alert from '@material-ui/lab/Alert';
import Container from '../components/Container';
import * as ApiClient from '../clients/ApiClient';
import api from '../api';

let fetchTimeout: number;

const Settings: React.FunctionComponent = () => {
  const [error, setError] = useState<Error>();
  const [settings, setSettings] = useState<ApiClient.Settings>();
  const [trailStatus, setTrailStatus] = useState<ApiClient.Status>();
  const [profilePictureUrl, setProfilePicture] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const trailId = settings?.trailId;
  const user = api.getUser();

  useEffect(() => {
    api.getProfilePictureUrl(user.username).then(setProfilePicture);
  }, [user.username]);

  useEffect(() => {
    if (!trailId) return;

    const fetchTrailStatus = () => {
      api
        .getStatus(trailId)
        .then(payload => {
          setTrailStatus(payload);
          fetchTimeout = window.setTimeout(fetchTrailStatus, 30 * 1000);
        })
        .catch(setError);
    };

    fetchTrailStatus();

    return () => {
      clearTimeout(fetchTimeout);
    };
  }, [trailId]);

  useEffect(() => {
    api
      .getSettings()
      .then(setSettings)
      .catch(setError);
  }, []);

  const updateSettingsState = useCallback(
    (params: Partial<ApiClient.Settings>) => {
      if (settings) {
        setSettings({ ...settings, ...params });
      }
    },
    [settings],
  );

  const saveSettings = useCallback(() => {
    if (!settings) return;
    setIsSaving(true);
    api
      .putSettings(settings)
      .catch(setError)
      .finally(() => setIsSaving(false));
  }, [settings]);

  return (
    <Container>
      {error && (
        <CardContent>
          <Alert severity="error">Oops! Something went wrong.</Alert>
        </CardContent>
      )}
      <CardHeader
        avatar={<Avatar src={profilePictureUrl} />}
        title={
          <>
            Open or close the trails by posting to{' '}
            <Link
              href={`https://www.instagram.com/${user.username}/`}
              target="_blank"
              color="textPrimary"
            >
              <strong>@{user.username}</strong>
            </Link>
            .
          </>
        }
      />
      <Divider />
      <CardContent>
        <Typography color="textSecondary" variant="overline">
          Hashtag Settings
        </Typography>
        <Box mt={2}>
          <TextField
            fullWidth
            variant="filled"
            label="Open trails"
            helperText="Tag your post with this hashtag to open the trails."
            value={settings?.openHashtag ?? ''}
            onChange={e => updateSettingsState({ openHashtag: e.target.value })}
          />
        </Box>
        <Box mt={2}>
          <TextField
            fullWidth
            variant="filled"
            label="Close trails"
            helperText="Tag your post with this hashtag to close the trails."
            value={settings?.closeHashtag ?? ''}
            onChange={e =>
              updateSettingsState({ closeHashtag: e.target.value })
            }
          />
        </Box>
      </CardContent>
      <Box p={2}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          disabled={isSaving}
          onClick={saveSettings}
        >
          {isSaving ? 'Saving...' : 'Save Hashtag Settings'}
        </Button>
      </Box>
      {trailStatus && (
        <>
          <Divider />
          <CardContent>
            {trailStatus.status === 'open' && (
              <Alert severity="success">The trails are open.</Alert>
            )}
            {trailStatus.status === 'closed' && (
              <Alert severity="warning">The trails are closed.</Alert>
            )}
          </CardContent>
        </>
      )}
    </Container>
  );
};

export default Settings;
