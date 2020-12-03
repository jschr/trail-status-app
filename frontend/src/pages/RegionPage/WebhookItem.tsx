import React, { useState } from 'react';
import ListItem from '@material-ui/core/ListItem';
import Typography from '@material-ui/core/Typography';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Box from '@material-ui/core/Box';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import IconButton from '../../components/IconButton';
import TimeAgo from '../../components/TimeAgo';
import ListItemSecondaryAction from '../../components/ListItemSecondaryAction';
import { Webhook } from '../../api';

interface WebhookItemsProps {
  webhook: Webhook;
  onEdit: () => void;
  onRun: () => void;
  onDelete: () => void;
}

const WebhookItem = ({
  webhook,
  onEdit,
  onRun,
  onDelete,
}: WebhookItemsProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  return (
    <ListItem
      dense
      button
      onClick={onEdit}
      selected={Boolean(anchorEl)}
      divider
    >
      <Box>
        <Typography
          variant="subtitle1"
          style={{
            textDecoration: webhook.enabled ? 'none' : 'line-through',
          }}
        >
          {webhook.name || <em>Unknown</em>}
        </Typography>
        {webhook.enabled ? (
          <>
            <Box component="span" mr={1} color="text.secondary">
              Triggered:
            </Box>
            <Box component="span" mr={2}>
              <TimeAgo datetime={webhook?.lastRanAt} />
            </Box>
          </>
        ) : (
          <Box component="span" mr={1} color="text.secondary">
            Disabled
          </Box>
        )}
        {webhook.error && webhook.enabled && (
          <Box mt={1} color="error.main">
            {webhook.error}
          </Box>
        )}
      </Box>
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
              onRun();
            }}
          >
            <PlayArrowIcon />
            &nbsp;&nbsp; Trigger
          </MenuItem>
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
  );
};

export default WebhookItem;
