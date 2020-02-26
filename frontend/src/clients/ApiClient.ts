export default class ApiClient {
  constructor(private accessToken: string | null) {}

  getAccessToken() {
    return this.accessToken;
  }
}
