# Deployment

Three ways to run the shop, from least to most setup.

| Option | Good for | Needs | Cost |
|---|---|---|---|
| GitHub Codespaces | Anyone, including non-technical people. Runs in a browser tab | A GitHub account with access to the repository | Free within GitHub's monthly allowance |
| Docker Compose | Developers, or a laptop driving a projector | Docker Desktop | Free |
| Render | A public URL to share | A Render account | Paid plan for three of the services |

## GitHub Codespaces

1. On the repository page, choose **Code → Codespaces → Create codespace**.
2. Wait a few minutes. The codespace installs dependencies, builds the image and starts everything.
3. The site opens on port 8080. If it does not, open the **Ports** tab and click the globe icon next to 8080.

To share the running site with someone else, right-click port 8080 in the **Ports** tab and set its visibility to Public.

The configuration is in `.devcontainer/devcontainer.json`. It has not yet been tested in a real codespace.

## Docker Compose

```bash
docker compose up --build
```

Open http://localhost:8080. To stop, press Ctrl+C. To wipe the data and start fresh:

```bash
docker compose down -v
```

To change the demo passwords or the signing secret, copy `.env.example` to `.env` and edit it before the first start.

## Render

`render.yaml` is a Render Blueprint describing the database, the three internal services and the public gateway.

1. In the Render dashboard choose **New → Blueprint** and pick this repository.
2. When asked, enter passwords for `OWNER_PASSWORD` and `CLERK_PASSWORD`.
3. Apply. When the `gilded-griffin` service is live, open its URL.

This blueprint has not yet been run against Render, so treat the first deploy as a test and expect to adjust it. The three internal services use Render's private service type, which has no free plan.

## Settings

| Variable | Used by | Purpose |
|---|---|---|
| `SERVICE` | image | Which service the container runs: `catalog`, `patrons`, `incidents`, `gateway` |
| `DATABASE_URL` | all | Postgres connection string |
| `JWT_SECRET` | all | Signs and verifies staff tokens. Must be the same everywhere, and secret in any real deployment |
| `CATALOG_URL`, `PATRONS_URL`, `INCIDENTS_URL` | gateway, patrons, incidents | Where the other services are |
| `OWNER_PASSWORD`, `CLERK_PASSWORD` | gateway | Passwords for the two demo accounts, applied when the accounts are first created |
| `PORT` | all | Port to listen on |

The login page lists the default demo passwords. If you change them for a public deployment, also remove the demo account buttons from `apps/portal/src/pages/Login.tsx`.
