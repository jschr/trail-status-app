import React, { useState } from 'react';
import Container from '../components/Container';
import Avatar from '@material-ui/core/Avatar';
import Box from '@material-ui/core/Box';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import Divider from '@material-ui/core/Divider';
import Button from '@material-ui/core/Button';
import Link from '@material-ui/core/Link';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import api from '../api';

console.log(api);

const SetupPage: React.FunctionComponent = () => {
  const [hasChanged, setHasChanged] = useState(false);
  const [openHashtag, setOpenHashtag] = useState('#trails-open');
  const [closedHashtag, setClosedHashtag] = useState('#trails-closed');

  return (
    <Container>
      <CardHeader
        avatar={
          <Avatar src="https://scontent-yyz1-1.cdninstagram.com/v/t51.2885-19/21042217_125936164713332_2569638204021932032_a.jpg?_nc_ht=scontent-yyz1-1.cdninstagram.com&_nc_ohc=IzVty7dKv6QAX-Hheoz&oh=912c08c852d6d16e87b5f266d7174d88&oe=5E8B6178" />
        }
        title={
          <>
            Open or close the trails by posting to{' '}
            <Link
              href="https://www.instagram.com/the_hydrocut/"
              target="_blank"
              color="textPrimary"
            >
              <strong>@the_hydrocut</strong>
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

export default SetupPage;
