import React, { useState, useEffect } from 'react';
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

const user = api.getUser();

const Settings: React.FunctionComponent = () => {
  const [hasChanged, setHasChanged] = useState(false);
  const [error, setError] = useState<Error>();
  const [settings, setSettings] = useState<ApiClient.Settings>({
    openTrailHashtag: '',
    closeTrailHashtag: ''
  });

  useEffect(() => {
    api
      .getSettings()
      .then(setSettings)
      .catch(setError);
  }, []);

  return (
    <Container>
      {error && (
        <CardContent>
          <Alert severity="error">Oops! Something went wrong.</Alert>
        </CardContent>
      )}
      <CardHeader
        avatar={<Avatar src={user.profilePictureUrl} />}
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
      <CardContent onChange={() => setHasChanged(true)}>
        <Typography color="textSecondary" variant="overline">
          Hashtag Settings
        </Typography>
        <Box mt={2}>
          <TextField
            fullWidth
            variant="filled"
            label="Open trails"
            helperText="Tag your post with this hashtag to open the trails."
            value={settings.openTrailHashtag}
            onChange={e =>
              setSettings({ ...settings, openTrailHashtag: e.target.value })
            }
          />
        </Box>
        <Box mt={2}>
          <TextField
            fullWidth
            variant="filled"
            label="Close trails"
            helperText="Tag your post with this hashtag to close the trails."
            value={settings.closeTrailHashtag}
            onChange={e =>
              setSettings({ ...settings, closeTrailHashtag: e.target.value })
            }
          />
        </Box>
      </CardContent>
      <Box p={2}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          disabled={!hasChanged}
        >
          Save Hashtag Settings
        </Button>
      </Box>
    </Container>
  );
};

export default Settings;
