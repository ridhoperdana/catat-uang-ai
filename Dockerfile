FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build frontend and backend
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]