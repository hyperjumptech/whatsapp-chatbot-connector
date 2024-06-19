# builder stage
FROM node:22 AS Base

# Set the working directory inside the container
WORKDIR /app
# Copy only the package.json and package-lock.json (if exists) to leverage Docker cache
COPY package*.json .

FROM base AS dependencies
# Copy the rest of the application files to the container
# Install project dependencies
RUN npm install --omit=dev --prefer-offline
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

EXPOSE 5007
ENV PORT 5007

# Set the default command to run the application
CMD ["npm", "start"]