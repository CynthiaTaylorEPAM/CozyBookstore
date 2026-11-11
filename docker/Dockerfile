# One image holds all four services and the built portal. Which service a
# container runs is chosen at start-up with the SERVICE environment variable:
# catalog, patrons, incidents or gateway.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY services/catalog/package.json services/catalog/
COPY services/patrons/package.json services/patrons/
COPY services/incidents/package.json services/incidents/
COPY services/gateway/package.json services/gateway/
COPY apps/portal/package.json apps/portal/
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
USER node
CMD ["sh", "-c", "node services/${SERVICE:?Set SERVICE to catalog, patrons, incidents or gateway}/dist/index.js"]
