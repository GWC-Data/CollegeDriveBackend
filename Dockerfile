# Backend/Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the backend source code
COPY . .

# Expose the port the app runs on (defaults to 5000 in index.js)
EXPOSE 5000

# Start the application
CMD ["node", "index.js"]
