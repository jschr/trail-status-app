import React from 'react';
import { Redirect } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../api';

const IndexPage = () => {
  const { data: user, isFetched } = useQuery('user', () => api.getUser());

  const selectedRegionId = localStorage.getItem('selectedRegionId');
  const selectedRegion = user?.regions.find(r => r.id === selectedRegionId);
  const firstRegion = user?.regions[0];
  const regionId = selectedRegion?.id || firstRegion?.id;

  if (!regionId && isFetched) {
    return <Redirect to="/login" />;
  }

  if (regionId) {
    return <Redirect to={`/regions/${regionId}`} />;
  }

  return null;
};

export default IndexPage;
