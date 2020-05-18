# Trail Status App

I created this app to automatically update my local trail commitee's website when they post trail status updates to their Instagram. Once you connect your Instagram account you will be given an embed code that you can paste into your website. Tagging your next Instagram post with #trails-open or #trails-closed will automatically the embed.

**Built with**
- React frontend, hosted on Netlify
- Serverless backend with AWS Lambda and API Gateway
- Infrastructure as code with AWS CDK

You are welcome to fork this app and host it using your own AWS account. Feel free to open an issue if you get stuck or have any feedback.

## Development

The Instagram API does not allow callbacks over http, to create your own localhost certs:

```bash
brew install mkcert
brew install nss

mkcert -install
mkcert localhost

```

Rename `.env.sample` and `.env.dev.sample` and `.env.production.sample` and remove `.sample`. Open each file and modify to use
your own env vars.

Run the app in development:

```bash
yarn dev
```

## Deployment

Deploy the backend:

```bash
yarn infrastructure deploy
```

Netlify is connected to the repo and the frontend will be deployed whenever a change is pushed to `master`.
