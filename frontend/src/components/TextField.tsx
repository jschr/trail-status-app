import React from 'react';
import MUITextField, {
  TextFieldProps as MUITextFieldProps,
} from '@material-ui/core/TextField';

const TextField = (props: MUITextFieldProps) => {
  return (
    <MUITextField
      {...props}
      size="small"
      variant="outlined"
      InputLabelProps={{ shrink: true, ...props.InputLabelProps }}
    />
  );
};

export default TextField;
