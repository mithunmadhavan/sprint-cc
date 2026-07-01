FROM node:20-alpine

WORKDIR /workspace/src/apps/ey-sprint-frontend

COPY src/apps/ey-sprint-frontend/package*.json ./
RUN npm install

WORKDIR /workspace
COPY . .

WORKDIR /workspace/src/apps/ey-sprint-frontend

EXPOSE 3001
CMD ["npm", "run", "start"]
