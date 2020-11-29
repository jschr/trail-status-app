import React from 'react';
import ReactTimeAgo from 'timeago-react';

export interface TimeAgoProps {
  datetime?: string;
}

const TimeAgo = ({ datetime }: TimeAgoProps) => {
  return (
    <span title={datetime ? new Date(datetime).toString() : ''}>
      {datetime ? <ReactTimeAgo datetime={datetime} /> : '-'}
    </span>
  );
};

export default TimeAgo;
