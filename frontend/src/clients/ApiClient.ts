import jwtDecode from 'jwt-decode';
import { env } from '@trail-status-app/utilities';

const apiEndpoint = env('REACT_APP_API_ENDPOINT');

interface RequestOptions {
  method: string;
  body?: any;
}

export interface User {
  userId: string;
  username: string;
}

export interface Status {
  trailId: string;
  status: string;
  updatedAt: string;
  createdAt: string;
}

export interface Settings {
  trailId: string;
  openHashtag: string;
  closeHashtag: string;
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
      userId: decodedToken.sub,
      username: decodedToken.username,
    };
  }

  async getProfilePictureUrl(username: string): Promise<string> {
    try {
      this.onRequestStart();
      const profilePictureApiUrl = `https://www.instagram.com/${username}/?__a=1`;
      const userResp = await fetch(profilePictureApiUrl);

      if (!userResp.ok)
        throw new Error('Bad response fetching profile picture');

      const userPayload = await userResp.json();
      const profilePictureUrl = userPayload.graphql.user.profile_pic_url;

      this.onRequestEnd();

      const image = new Image();
      image.src = profilePictureUrl;
      return new Promise((resolve, reject) => {
        image.onload = () => {
          resolve(profilePictureUrl);
        };
        image.onerror = () => reject();
      });
    } catch (err) {
      console.error(err);
      return '';
    }
  }

  async getStatus(trailId: string): Promise<Status> {
    return await this.makeProtectedRequest(
      `${apiEndpoint}/status?trailId=${trailId}`,
    );
  }

  async getSettings(): Promise<Settings> {
    return await this.makeProtectedRequest(`${apiEndpoint}/settings`);
  }

  async putSettings(body: Settings): Promise<Settings> {
    return await this.makeProtectedRequest(`${apiEndpoint}/settings`, {
      method: 'PUT',
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

      const data = await resp.json();

      this.onRequestEnd();

      return data;
    } catch (err) {
      this.onRequestEnd();
      throw err;
    }
  }

  getAccessToken() {
    return this.accessToken;
  }
}
