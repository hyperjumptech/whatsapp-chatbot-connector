# builder stage
FROM node:22 AS base

# Set the working directory inside the container
WORKDIR /app
# Copy only the package.json and package-lock.json (if exists) to leverage Docker cache
COPY package*.json .

FROM base AS dependencies
# Copy the rest of the application files to the container
# Install project dependencies
RUN npm ci
COPY . .
RUN npm run build

# runner stage
FROM node:22-alpine AS release

WORKDIR /app
COPY --from=dependencies /app/dist ./dist
COPY --from=dependencies /app/node_modules ./node_modules

# Create a group and user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
# Tell docker that all future commands should run as the appuser user
USER appuser

ENV NODE_ENV=production
ENV WEBHOOK_VERIFY_TOKEN=abcdefghijkl 
ENV GRAPH_API_TOKEN=EEAAAT1234567890ABCDEFGHIJKLMNOPQRSTUVWXQY
ENV BUSINESS_PHONE_NUMBER_ID=1081234567890

ENV DIFY_BASE_URL=http://api.dify.ai/v1
ENV DIFY_API_KEY=app-abcdefghijkl1234567890
ENV WEBHOOK_APP_SECRET=app-abcdefghijkl1234567890

ENV CONNECTION_PLATFORM=rasa

ENV SESSION_DATABASE=in-memory
ENV REDIS_URL=redis://0.0.0.0:6379

EXPOSE 5007
ENV PORT=5007

# Set the default command to run the application
CMD ["node", "dist/index.js"]