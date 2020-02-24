import React from 'react';
import Container from '../components/Container';
import Avatar from '@material-ui/core/Avatar';
import Box from '@material-ui/core/Box';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardActions from '@material-ui/core/CardActions';
import Divider from '@material-ui/core/Divider';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';

const SetupPage: React.FunctionComponent = () => {
  return (
    <Container>
      <CardHeader
        avatar={
          <Avatar src="https://scontent-yyz1-1.cdninstagram.com/v/t51.2885-19/s150x150/44866784_317418545527632_4964076424227979264_n.jpg?_nc_ht=scontent-yyz1-1.cdninstagram.com&_nc_ohc=P_ScHihTuOQAX_R0Fgz&oh=f22a5d9404b3b2b0ee0966e933e40637&oe=5E88C564" />
        }
        title="Jordan Schroter"
        subheader="logged in as @jordanschroter"
      />
      <Divider />
      <CardContent>
        <Box mt={2}>
          <TextField
            fullWidth
            variant="filled"
            label="Trails open hashtag"
            value="#trails-open"
            helperText="Tag your post with this hashtag to open the trails."
          />
        </Box>
        <Box mt={2}>
          <TextField
            fullWidth
            variant="filled"
            label="Trails closed hashtag"
            value="#trails-closed"
            helperText="Tag your post with this hashtag to close the trails."
          />
        </Box>
        <Box mt={2} />
      </CardContent>
      <CardActionArea>
        <CardActions>
          <Button fullWidth variant="contained" color="primary">
            Update Settings
          </Button>
        </CardActions>
      </CardActionArea>
    </Container>
  );
};

export default SetupPage;
