# Trail Status App

https://trailstatusapp.com

## How does it work?

The trail status app periodically checks your Instagram account for specific hashtags to open or close the region. You can also create trails within the region that allow you to keep certain trails closed when opening the region.

### Example Instagram posts

**Closing the region**

_Trails closed, please wait until the next update! #trailsclosed_

**Opening the region**

_Trails open, enjoy the nice weather! #trailsopen_

**Opening the region, keeping a specific trail closed**

_Trails open but stay off Glasglow side! #trailsopen #glasglowclosed_

You can configure the trails and hashtags for your region after logging in at https://trailstatusapp.com. Note that the app is not yet approved by Facebook so you will need to be invited as a tester. Open an issue if you want an invite.

## API

The trail status app has a public API for retrieving the current region and trail status. You can find your region id and trail ids in the URL of trailstatusapp.com, click on the trail to find it’s id.

### Fetching the region status

GET /regions/status?id=REGION_ID

### Fetching the status of a specific trail

GET /trails/status?id=TRAIL_ID

## Webhooks

You can create webhooks to notify other services when the status of the region or a specific trail changes. You can configure your webhook to be triggered via GET or POST. Webhooks using POST will also receive the status as JSON in the request body.

Webhook URLs support variables to receive the current status. Variables are denoted by curly braces in the URL.

**Example Webhook URL**

https://my-webhook.com/status={status}&message={message}

### Variables

| Variable    | Description                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| {status}    | The status of the region or the specified trail.                                                          |
| {updatedAt} | When the status of the region or trail was updated.                                                       |
| {message}   | The caption of the Instagram post used to open or close the region. Only available for regional webhooks. |
| {imageUrl}  | The image of the Instagram post used to open or close the region. Only available for regional webhooks.   |

## Development

The Instagram API does not allow callbacks over http, to create your own localhost certs:

```bash
brew install mkcert
brew install nss

mkcert -install
mkcert localhost

```

Create `.env`, `env.dev` and `env.production` at the root of this project with the contents of the provided `.sample` files in this repo. Modify the env vars if you're own.

Run the app in development:

```bash
yarn dev
```

## Deployment

Deploy the backend:

```bash
yarn infrastructure deploy
```

Connect Netlify to your repository to deploy the frontend from `master`.
