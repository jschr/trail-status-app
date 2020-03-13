import React from 'react';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import InstagramIcon from '@material-ui/icons/Instagram';
import Divider from '@material-ui/core/Divider';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Container from '../components/Container';
import api from '../api';

const LoginPage: React.FunctionComponent = () => {
  return (
    <Container maxWidth="xs">
      <CardContent>
        <Box textAlign="center">
          <Typography variant="overline">Trail Status App</Typography>
          <Typography variant="caption" component="div">
            Automatically open or close the trails by posting to Instagram.
          </Typography>
        </Box>
      </CardContent>
      <Divider />
      <Box p={2}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<InstagramIcon />}
          color="primary"
          href={api.getAuthorizeUrl()}
        >
          Log in With Instagram
        </Button>
      </Box>
    </Container>
  );
};

export default LoginPage;
