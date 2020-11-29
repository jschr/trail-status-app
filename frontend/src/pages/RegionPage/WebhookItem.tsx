import React, { useState } from 'react';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import Divider from '@material-ui/core/Divider';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import IconButton from '../../components/IconButton';
import TimeAgo from '../../components/TimeAgo';
import { Webhook, Region } from '../../api';

interface WebhookItemsProps {
  webhook: Webhook;
  region: Region;
  onEdit: () => void;
  onRun: () => void;
  onDelete: () => void;
}

const WebhookItem = ({
  webhook,
  region,
  onEdit,
  onRun,
  onDelete,
}: WebhookItemsProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  return (
    <>
      <ListItem dense button onClick={onEdit} selected={Boolean(anchorEl)}>
        <ListItemText
          primary={
            <>
              <Box
                style={{
                  textDecoration: webhook.enabled ? 'none' : 'line-through',
                }}
              >
                {webhook.name || <em>Unknown</em>}
              </Box>

              <Typography variant="body2" component="div">
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
                    Error! {webhook.error}
                  </Box>
                )}
              </Typography>
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
      <Divider />
    </>
  );
};

export default WebhookItem;
