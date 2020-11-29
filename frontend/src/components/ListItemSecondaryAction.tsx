import React from 'react';
import MUIListItemSecondaryAction, {
  ListItemSecondaryActionProps,
} from '@material-ui/core/ListItemSecondaryAction';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  root: {
    top: theme.spacing(0.5),
    transform: 'none',
  },
}));

const ListItemSecondaryAction = (props: ListItemSecondaryActionProps) => {
  const classes = useStyles();
  return (
    <MUIListItemSecondaryAction {...props} classes={{ root: classes.root }} />
  );
};

ListItemSecondaryAction.muiName = 'ListItemSecondaryAction';

export default ListItemSecondaryAction;
