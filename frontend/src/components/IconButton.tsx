import React from 'react';
import MUIIconButton, { IconButtonProps } from '@material-ui/core/IconButton';

const IconButton = (props: IconButtonProps) => {
  return (
    <MUIIconButton
      {...props}
      style={{ opacity: props.color === 'primary' ? 1 : 0.5 }}
    />
  );
};

export default IconButton;
