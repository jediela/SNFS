# SNFS
CSCC43 Final Project: A Social Network for Stocks

# Useful dev commands (Docker)

## Run the app (Frontend, Backend, DB)
`docker-compose up --build`

## Stopping containers
`docker-compose down`

## Reinitializing the Database
```
docker-compose down -v
docker-compose up --build
```
# Linting & Formatting: FRONTEND (ESLint & Prettier)

## --- Make sure packages are installed ---
Go into frontend directory: `cd frontend`

Install packages: `npm i`

## Lint all files in the frontend directory
`npm run lint`

## Format all files in the frontend directory
`npm run format`

# Linting & Formatting: BACKEND (Ruff)

## --- Start venv and make sure ruff is installed ---
Go into backend directory: `cd backend`

Create venv: `python3 -m venv venv`

Activate venv: `source venv/bin/activate`

Install ruff: `pip install ruff`

## Lint all files in the backend directory
`ruff check`

## Format all files in the backend directory
`ruff format`

## Ruff Linter (https://docs.astral.sh/ruff/linter/)
```
ruff check                      # Lint files in the current directory.
ruff check --fix                # Lint files in the current directory and fix any fixable errors.
ruff check --watch              # Lint files in the current directory and re-lint on change.
ruff check path/to/code/        # Lint files in `path/to/code`.
```