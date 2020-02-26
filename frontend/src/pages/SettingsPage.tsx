import React, { useState } from 'react';
import Avatar from '@material-ui/core/Avatar';
import Box from '@material-ui/core/Box';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import Divider from '@material-ui/core/Divider';
import Button from '@material-ui/core/Button';
import Link from '@material-ui/core/Link';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import jwtDecode from 'jwt-decode';
import Container from '../components/Container';
import api from '../api';

const accessToken = api.getAccessToken();

let username: string = '';
let profilePictureUrl: string = '';

try {
  const decodedToken = jwtDecode(accessToken);
  username = decodedToken.username;
  profilePictureUrl = decodedToken.profilePictureUrl;
} catch (err) {}

const Settings: React.FunctionComponent = () => {
  const [hasChanged, setHasChanged] = useState(false);
  const [openHashtag, setOpenHashtag] = useState('#trails-open');
  const [closedHashtag, setClosedHashtag] = useState('#trails-closed');

  return (
    <Container>
      <CardHeader
        avatar={<Avatar src={profilePictureUrl} />}
        title={
          <>
            Open or close the trails by posting to{' '}
            <Link
              href={`https://www.instagram.com/${username}/`}
              target="_blank"
              color="textPrimary"
            >
              <strong>@{username}</strong>
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
            label="Trails open"
            helperText="Tag your post with this hashtag to open the trails."
            value={openHashtag}
            onChange={e => setOpenHashtag(e.target.value)}
          />
        </Box>
        <Box mt={2}>
          <TextField
            fullWidth
            variant="filled"
            label="Trails closed"
            helperText="Tag your post with this hashtag to close the trails."
            value={closedHashtag}
            onChange={e => setClosedHashtag(e.target.value)}
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
