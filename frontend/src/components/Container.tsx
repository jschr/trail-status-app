import React from 'react';
import MUIContainer, { ContainerProps } from '@material-ui/core/Container';
import Box from '@material-ui/core/Box';

const Container: React.FunctionComponent<ContainerProps> = ({
  children,
  ...props
}) => {
  return (
    <Box mt={[4, 8]} mb={[4, 8]}>
      <MUIContainer {...props}>{children}</MUIContainer>
    </Box>
  );
};

export default Container;
