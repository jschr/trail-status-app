import React, { useState } from 'react';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import Divider from '@material-ui/core/Divider';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import IconButton from '../../components/IconButton';
import { Trail } from '../../api';

interface TrailItemsProps {
  trail: Trail;
  onEdit: () => void;
  onDelete: () => void;
}

const TrailItem = ({ trail, onEdit, onDelete }: TrailItemsProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  return (
    <>
      <ListItem button onClick={onEdit} selected={Boolean(anchorEl)}>
        <ListItemText primary={trail.name || <em>Unknown</em>} />
        <ListItemSecondaryAction>
          <IconButton
            size="small"
            edge="end"
            style={{ opacity: 0.35 }}
            onClick={event => setAnchorEl(event.currentTarget)}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                onEdit();
              }}
            >
              <EditIcon />
              &nbsp;&nbsp; Edit
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                onDelete();
              }}
            >
              <DeleteIcon />
              &nbsp;&nbsp; Delete
            </MenuItem>
          </Menu>
        </ListItemSecondaryAction>
      </ListItem>
      <Divider />
    </>
  );
};

export default TrailItem;
