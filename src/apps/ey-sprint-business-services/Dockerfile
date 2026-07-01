FROM node:20-alpine

WORKDIR /workspace/src/apps/ey-sprint-business-services

COPY src/apps/ey-sprint-business-services/package*.json ./
RUN npm install

WORKDIR /workspace
COPY . .

WORKDIR /workspace/src/apps/ey-sprint-business-services
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
