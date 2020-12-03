import React from 'react';
import Box from '@material-ui/core/Box';

export interface StatusTextProps {
  status?: string;
}

const StatusText = ({ status, ...props }: StatusTextProps) => {
  let color = '';
  if (status === 'open') color = 'success.main';
  if (status === 'closed') color = 'error.main';

  let text = '-';
  if (status === 'open') text = 'Open';
  if (status === 'closed') text = 'Closed';

  return (
    <Box component="span" color={color} {...props}>
      {text}
    </Box>
  );
};

export default StatusText;
