import jwtDecode from 'jwt-decode';
import { env } from '@trail-status-app/utilities';

const apiEndpoint = env('REACT_APP_API_ENDPOINT');

interface RequestOptions {
  method: string;
  body?: any;
}

export interface User {
  id: string;
  username: string;
  regions: Array<{ id: string; name: string }>;
}

export interface Region {
  id: string;
  userId: string;
  name: string;
  openHashtag: string;
  closeHashtag: string;
  updatedAt: string;
  createdAt: string;
  trails: Trail[];
  webhooks: Webhook[];
}

export interface Trail {
  id: string;
  name: string;
  regionId: string;
  closeHashtag: string;
  updatedAt: string;
  createdAt: string;
}

export interface Webhook {
  id: string;
  regionId: string;
  trailId?: string;
  runPriority: number;
  name: string;
  description?: string;
  method: string;
  url: string;
  lastRanAt: string;
  error: string;
  updatedAt: string;
  createdAt: string;
}

interface ApiOptions {
  accessToken?: string | null;
  onUnauthorized: () => void;
  onRequestStart: () => void;
  onRequestEnd: () => void;
}

export default class ApiClient {
  private accessToken?: string | null;
  private onUnauthorized: () => void;
  private onRequestStart: () => void;
  private onRequestEnd: () => void;

  constructor(options: ApiOptions) {
    this.accessToken = options.accessToken;
    this.onUnauthorized = options.onUnauthorized;
    this.onRequestStart = options.onRequestStart;
    this.onRequestEnd = options.onRequestEnd;

    if (!this.accessToken) this.onUnauthorized();
  }

  getAuthorizeUrl() {
    return `${apiEndpoint}/instagram/authorize`;
  }

  getUser(): User {
    const decodedToken = jwtDecode(this.accessToken);

    return {
      id: decodedToken.sub,
      username: decodedToken.username,
      regions: decodedToken.regions || [],
    };
  }

  async getRegion(id: string): Promise<Region> {
    return await this.makeProtectedRequest(`${apiEndpoint}/regions?id=${id}`);
  }

  async updateTrail(
    id: string,
    body: { name?: string; closeHashtag?: string },
  ): Promise<void> {
    return await this.makeProtectedRequest(`${apiEndpoint}/trails?id=${id}`, {
      method: 'PUT',
      body,
    });
  }

  async createTrail(body: {
    name: string;
    closeHashtag: string;
    regionId: string;
  }): Promise<void> {
    return await this.makeProtectedRequest(`${apiEndpoint}/trails`, {
      method: 'POST',
      body,
    });
  }

  async makeProtectedRequest(
    url: string,
    opts: RequestOptions = { method: 'GET' },
  ) {
    this.onRequestStart();

    try {
      const resp = await fetch(url, {
        method: opts.method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(opts.body),
      });

      if (!resp.ok) {
        if (resp.status === 401 && this.onUnauthorized) {
          this.onUnauthorized();
        }

        throw new Error(
          `ApiClient error from ${url}: ${resp.statusText} — ${JSON.stringify(
            await resp.text(),
          )}`,
        );
      }

      return await resp.json();
    } catch (err) {
      throw err;
    } finally {
      this.onRequestEnd();
    }
  }

  getAccessToken() {
    return this.accessToken;
  }
}
