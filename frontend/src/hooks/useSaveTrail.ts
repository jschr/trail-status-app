import { useState, useEffect, useCallback } from 'react';
import api, { Trail } from '../api';

export interface SaveTrailParams {
  name?: string;
  closeHashtag?: string;
  regionId?: string;
}

export default function useSaveTrail(
  trail?: Trail,
): (params: SaveTrailParams) => Promise<void> {
  const saveTrail = useCallback(
    async ({ name, closeHashtag, regionId }: SaveTrailParams) => {
      try {
        if (trail) {
          await api.updateTrail(trail.id, { name, closeHashtag });
        } else if (name && closeHashtag && regionId) {
          await api.createTrail({ name, closeHashtag, regionId });
        }
      } catch (err) {
        // TODO: Global error handler
        console.error(err);
      }
    },
    [trail],
  );

  return saveTrail;
}
