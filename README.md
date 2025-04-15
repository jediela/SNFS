# Social Network for Stocks (SNFS)
A web app that lets users create and manage investment portfolios and stock lists, view statistics, and share them with friends.

# Tech Stack
- Backend: Python (Flask), PostgreSQL
- Frontend: Next.js, React, Tailwind CSS

# Running the app
## Start the app (Frontend, Backend, Database)
```
docker-compose up --build
```

## Stop Containers
```
docker-compose down
```

## Reinitialize Database
```
docker-compose down -v
docker-compose up --build
```
