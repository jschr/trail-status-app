import React from 'react';
import MUITextField, {
  TextFieldProps as MUITextFieldProps,
} from '@material-ui/core/TextField';

const SelectField = (props: MUITextFieldProps) => {
  return (
    <MUITextField
      {...props}
      size="small"
      variant="outlined"
      select
      InputLabelProps={{ shrink: true, ...props.InputLabelProps }}
      SelectProps={{ displayEmpty: true, native: true, ...props.SelectProps }}
    />
  );
};

export default SelectField;
