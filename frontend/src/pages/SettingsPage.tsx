import React, { useState, useEffect, useCallback } from 'react';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import Divider from '@material-ui/core/Divider';
import Button from '@material-ui/core/Button';
import Link from '@material-ui/core/Link';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import InstagramIcon from '@material-ui/icons/Instagram';
import Alert from '@material-ui/lab/Alert';
import { Link as RouterLink } from 'react-router-dom';
import Container from '../components/Container';
import * as ApiClient from '../clients/ApiClient';
import api from '../api';

const Settings: React.FunctionComponent = () => {
  const [error, setError] = useState<Error>();
  const [settings, setSettings] = useState<ApiClient.Settings>();
  const [isSaving, setIsSaving] = useState(false);

  const trailId = settings?.trailId;
  const user = api.getUser();

  useEffect(() => {
    api
      .getSettings()
      .then(settings => {
        setSettings(settings);
        (window as any).trailStatus.register();
      })
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
    <Container maxWidth="md">
      {error && (
        <CardContent>
          <Alert severity="error">Oops! Something went wrong.</Alert>
        </CardContent>
      )}

      <CardHeader
        avatar={
          <Box mt={0.5}>
            <InstagramIcon fontSize="large" />
          </Box>
        }
        title={
          <Grid container justify="space-between" alignItems="center">
            <Grid item>
              Open or close the trails by posting to{' '}
              <Link
                href={`https://www.instagram.com/${user.username}/`}
                target="_blank"
                color="textPrimary"
              >
                <strong>@{user.username}</strong>
              </Link>
              .
            </Grid>{' '}
            <Grid item>
              <Button
                size="small"
                variant="text"
                component={RouterLink}
                to="/login"
                onClick={() => localStorage.removeItem('accessToken')}
              >
                Logout
              </Button>
            </Grid>
          </Grid>
        }
      />

      <Divider />

      <CardContent>
        <Grid container>
          <Grid item xs={12} sm={5}>
            <Box mt={2}>
              <Typography color="textSecondary" variant="overline">
                Hashtag Settings
              </Typography>
            </Box>

            <Box mt={2}>
              <TextField
                fullWidth
                variant="outlined"
                label="Open trails"
                helperText="Tag your post with this hashtag to open the trails."
                value={settings?.openHashtag ?? ''}
                onChange={e =>
                  updateSettingsState({ openHashtag: e.target.value })
                }
              />
            </Box>

            <Box mt={3}>
              <TextField
                fullWidth
                variant="outlined"
                label="Close trails"
                helperText="Tag your post with this hashtag to close the trails."
                value={settings?.closeHashtag ?? ''}
                onChange={e =>
                  updateSettingsState({ closeHashtag: e.target.value })
                }
              />
            </Box>

            <Box mt={3}>
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
          </Grid>
        </Grid>
        <Grid container>
          <Grid item xs={12} sm={11}>
            <Box mt={5}>
              <Typography color="textSecondary" variant="overline">
                Embed Code
              </Typography>
            </Box>

            <Box mt={2}>
              <Card elevation={2} variant="outlined">
                <CardContent>
                  <Box overflow="scroll" component="pre">
                    {`<link rel="stylesheet" href="https://trailstatusapp.com/embed.css"></link>
<div class="trailStatus" data-trail-status="${trailId}"></div>
<script async src="https://trailstatusapp.com/embed.js"></script>
`}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
      <Box mt={4}>
        <Divider />
      </Box>
      <Box mt={3} mb={6}>
        <div className="trailStatus" data-trail-status={trailId} />
      </Box>
    </Container>
  );
};

export default Settings;
