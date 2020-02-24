import React from 'react';
import Card from '@material-ui/core/Card';
import MUIContainer from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Divider from '@material-ui/core/Divider';

const Container: React.FunctionComponent = ({ children }) => {
  return (
    <Box mt={[8, 16]}>
      <MUIContainer maxWidth="xs">
        <Box textAlign="center" mb={2}>
          <Typography variant="overline">Trail Status App</Typography>
          <Typography variant="caption" component="div">
            Update trail status by posting to Instagram.
          </Typography>
        </Box>

        <Box mb={4}>
          <Divider variant="middle" />
        </Box>
        <Card>{children}</Card>
      </MUIContainer>
    </Box>
  );
};

export default Container;
