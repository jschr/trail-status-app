import React from 'react';
import Card from '@material-ui/core/Card';
import MUIContainer from '@material-ui/core/Container';
import Box from '@material-ui/core/Box';

const Container: React.FunctionComponent = ({ children }) => {
  return (
    <Box mt={[5, 10]} mb={[5, 10]}>
      <MUIContainer maxWidth="xs">
        <Card elevation={6}>{children}</Card>
      </MUIContainer>
    </Box>
  );
};

export default Container;
