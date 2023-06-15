FROM node:18.14-alpine

WORKDIR /app

ENV PATH /app/node_modules/.bin:$PATH

COPY . /app
RUN cp ./consts/mainnet.consts.ts ./src/consts.ts
RUN npm ci

CMD ["npm", "run", "start"]
