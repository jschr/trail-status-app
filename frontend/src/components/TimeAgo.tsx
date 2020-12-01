import React, { useEffect, useState } from 'react';
import { format } from 'timeago.js';

export interface TimeAgoProps {
  datetime?: string;
}

const TimeAgo = ({ datetime }: TimeAgoProps) => {
  const [timeAgoText, setTimeAgoText] = useState<string | null>(null);

  useEffect(() => {
    if (!datetime) return;
    setTimeAgoText(format(datetime));

    const interval = setInterval(() => {
      setTimeAgoText(format(datetime));
    }, 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [datetime]);

  return (
    <span title={datetime ? new Date(datetime).toString() : ''}>
      {timeAgoText ?? '-'}
    </span>
  );
};

export default TimeAgo;
