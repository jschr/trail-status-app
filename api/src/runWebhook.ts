import fetch, { Response } from 'node-fetch';
import pupa from 'pupa';
import traverse from 'traverse';
import WebhookModel from './models/WebhookModel';
import { RegionStatus } from './buildRegionStatus';

const urlSafeObject = (obj: any) => {
  return traverse(obj).map(function(x) {
    if (typeof x === 'string') {
      this.update(encodeURIComponent(x));
    } else if (x === undefined || x === null) {
      this.update('');
    }
  });
};

export default async (
  webhook: WebhookModel,
  regionStatus: RegionStatus,
): Promise<[number, string]> => {
  const method = webhook.method;
  let url: string;
  let body: string;

  if (webhook.trailId) {
    const { trails, ...regionStatusWithoutTrails } = regionStatus;
    const trailStatus = trails.find(t => t.id === webhook.trailId);
    if (!trailStatus) {
      // If the trail status hasn't been found this means it probably still hasn't been sync'd.
      throw new Error(`Trail status for trail '${webhook.trailId}' not found`);
    }
    const trailStatusWithRegion = {
      ...trailStatus,
      region: regionStatusWithoutTrails,
    };

    url = pupa(webhook.url, urlSafeObject(trailStatusWithRegion));
    body = JSON.stringify(trailStatusWithRegion);
  } else {
    url = pupa(
      webhook.url,
      urlSafeObject({
        ...regionStatus,
        message: regionStatus.message,
      }),
    );
    body = JSON.stringify(regionStatus);
  }

  let res: Response;
  if (method.toLowerCase() === 'post') {
    try {
      res = await fetch(`${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(`Failed to POST '${url}' with '${err.message}'`);
    }
  } else if (method.toLowerCase() === 'get') {
    try {
      res = await fetch(`${url}`, { method: 'GET' });
    } catch (err) {
      throw new Error(`Failed to GET '${url}' with '${err.message}'`);
    }
  } else {
    throw new Error(`Invalid webhook method '${webhook.method}'`);
  }

  if (!res.ok) {
    const errorMessage = `Invalid response '${res.status}' from '${method.toUpperCase} ${url}'`;
    throw new Error(errorMessage);
  }

  return [res.status, url];
};
