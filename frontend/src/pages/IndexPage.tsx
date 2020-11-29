import React from 'react';
import { Redirect } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../api';

const IndexPage = () => {
  const { data: user } = useQuery('user', () => api.getUser());
  const regionId = user?.regions[0]?.id;

  if (regionId) {
    return <Redirect to={`/regions/${regionId}`} />;
  }

  return null;
};

export default IndexPage;
