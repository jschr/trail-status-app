import React, { useState } from 'react';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import Divider from '@material-ui/core/Divider';
import Menu from '@material-ui/core/Menu';
import Box from '@material-ui/core/Box';
import MenuItem from '@material-ui/core/MenuItem';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import IconButton from '../../components/IconButton';
import StatusText from '../../components/StatusText';
import ListItemSecondaryAction from '../../components/ListItemSecondaryAction';
import { Trail, RegionStatus } from '../../api';

interface TrailItemsProps {
  trail: Trail;
  regionStatus?: RegionStatus | null;
  onEdit: () => void;
  onDelete: () => void;
}

const TrailItem = ({
  trail,
  regionStatus,
  onEdit,
  onDelete,
}: TrailItemsProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const trailStatus = regionStatus?.trails.find(t => t.id === trail.id);

  return (
    <>
      <ListItem dense button onClick={onEdit} selected={Boolean(anchorEl)}>
        <ListItemText
          primary={trail.name || <em>Unknown</em>}
          secondary={
            <>
              <Box component="span" mr={1} color="text.secondary">
                Status:
              </Box>
              <Box component="span" mr={3}>
                <StatusText status={trailStatus?.status} />
              </Box>
              {/* <Box component="span" mr={1} color="text.secondary">
          Close Hashtag:
        </Box>
        <Box component="span" mr={3}>
          {trail?.closeHashtag}
        </Box> */}
            </>
          }
        />
        <ListItemSecondaryAction>
          <IconButton
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
