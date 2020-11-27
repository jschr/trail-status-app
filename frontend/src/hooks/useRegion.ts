import { useState, useEffect, useCallback } from 'react';
import api, { Region } from '../api';

export default function useRegion(
  regionId?: string,
): [Region | null, () => void] {
  const [region, setRegion] = useState<Region | null>(null);

  const makeRequest = useCallback(async () => {
    try {
      if (!regionId) return;
      setRegion(await api.getRegion(regionId));
    } catch (err) {
      // TODO: Global error handler
      console.error(err);
    }
  }, [regionId]);

  useEffect(() => {
    makeRequest();
  }, [makeRequest]);

  return [region, makeRequest];
}
