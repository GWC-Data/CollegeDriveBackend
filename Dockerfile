# Use Node.js 20 Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci

# Copy application source
COPY . .


# Expose backend port
EXPOSE 5000

# Set production environment
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]