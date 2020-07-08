FROM node:alpine as builder

WORKDIR /app
COPY package*.json ./

RUN npm install

COPY . .
RUN npm run tsc

FROM node:alpine

WORKDIR /usr/src/app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
RUN ls -la

EXPOSE 3000
CMD [ "node", "build/server.js" ]
