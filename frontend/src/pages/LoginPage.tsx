import React from 'react';
import CardActions from '@material-ui/core/CardActions';
import Button from '@material-ui/core/Button';
import InstagramIcon from '@material-ui/icons/Instagram';
import Container from '../components/Container';
import { useHistory } from 'react-router-dom';

const LoginPage: React.FunctionComponent = () => {
  const history = useHistory();

  return (
    <Container>
      <CardActions>
        <Button
          fullWidth
          variant="contained"
          startIcon={<InstagramIcon />}
          color="primary"
          onClick={() => history.push('/setup')}
        >
          Log in With Instagram
        </Button>
      </CardActions>
    </Container>
  );
};

export default LoginPage;
