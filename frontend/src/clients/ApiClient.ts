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

export interface Settings {
  trailId: string;
  openHashtag: string;
  closeHashtag: string;
  updatedAt: string;
  createdAt: string;
}

export default class ApiClient {
  constructor(
    private accessToken: string | null,
    private onUnauthorized: () => void,
  ) {
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
      const profilePictureUrl = `https://www.instagram.com/${username}/?__a=1`;
      const userResp = await fetch(profilePictureUrl);

      if (!userResp.ok)
        throw new Error('Bad response fetching profile picture');

      const userPayload = await userResp.json();
      return userPayload.graphql.user.profile_pic_url;
    } catch (err) {
      console.error(err);
      return '';
    }
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
  }

  getAccessToken() {
    return this.accessToken;
  }
}
