########################################### NPM RUN BUILD/START ###########################################
# FROM node:20-alpine

# WORKDIR /app

# COPY package.json package-lock.json ./

# RUN npm ci

# COPY . .

# RUN npm run build

# EXPOSE 3000

# CMD ["npm", "start"]


########################################### NPM RUN DEV ###########################################
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]