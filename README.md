# SNFS
CSCC43 Final Project: A Social Network for Stocks

# Useful dev commands (Docker)

## Run the app (Flask and DB)
`docker-compose up --build`

## Stopping containers
`docker-compose down`

## Reinitializing the Database
```
docker-compose down -v
docker-compose up --build
```

# Linting & Formatting (Ruff)

## --- Start venv and make sure ruff is installed ---
Create venv: `python3 -m venv venv`

Activate venv: `source venv/bin/activate`

Install ruff: `pip install ruff`

## Lint all files in the current directory
`ruff check`

## Format all files in the current directory
`ruff format`

## Ruff Linter (https://docs.astral.sh/ruff/linter/)
```
ruff check                      # Lint files in the current directory.
ruff check --fix                # Lint files in the current directory and fix any fixable errors.
ruff check --watch              # Lint files in the current directory and re-lint on change.
ruff check path/to/code/        # Lint files in `path/to/code`.
```

## Ruff Formatter (https://docs.astral.sh/ruff/formatter/)
```
ruff format                     # Format all files in the current directory.
ruff format path/to/code/       # Format all files in `path/to/code` (and any subdirectories).
ruff format path/to/file.py     # Format a single file.
```