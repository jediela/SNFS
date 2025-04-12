-- Users table
CREATE TABLE IF NOT EXISTS Users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL
);

-- Portfolio table
CREATE TABLE IF NOT EXISTS Portfolios (
    portfolio_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) DEFAULT 0.0,
    name VARCHAR(50) NOT NULL
);

-- Cash Transaction table
CREATE TABLE IF NOT EXISTS CashTransactions (
    transaction_id SERIAL PRIMARY KEY,
    portfolio_id INT NOT NULL REFERENCES Portfolios(portfolio_id) ON DELETE CASCADE,
    type VARCHAR(10) CHECK (type IN ('deposit', 'withdrawal')),
    amount DECIMAL(15, 2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock table
CREATE TABLE IF NOT EXISTS Stocks (
    symbol VARCHAR(5) PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL
);

-- Stock Holdings table
CREATE TABLE IF NOT EXISTS StockHoldings (
    portfolio_id INT NOT NULL REFERENCES Portfolios(portfolio_id) ON DELETE CASCADE,
    symbol VARCHAR(5) NOT NULL REFERENCES Stocks(symbol) ON DELETE CASCADE,
    num_shares INT NOT NULL CHECK (num_shares >= 0),
    PRIMARY KEY (portfolio_id, symbol)
);

-- Stock Transaction table
CREATE TABLE IF NOT EXISTS StockTransactions (
    transaction_id SERIAL PRIMARY KEY,
    portfolio_id INT NOT NULL REFERENCES Portfolios(portfolio_id) ON DELETE CASCADE,
    symbol VARCHAR(5) NOT NULL REFERENCES Stocks(symbol) ON DELETE CASCADE,
    type VARCHAR(10) CHECK (type IN ('buy', 'sell')),
    num_shares INT NOT NULL CHECK (num_shares > 0),
    price DECIMAL(15, 2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Prices table
CREATE TABLE IF NOT EXISTS StockPrices (
    symbol VARCHAR(5) NOT NULL REFERENCES Stocks(symbol) ON DELETE CASCADE,
    timestamp DATE NOT NULL,
    open DECIMAL(15, 2) NOT NULL,
    high DECIMAL(15, 2) NOT NULL,
    low DECIMAL(15, 2) NOT NULL,
    close DECIMAL(15, 2) NOT NULL,
    volume BIGINT NOT NULL,
    PRIMARY KEY (symbol, timestamp)
);

-- Stock Predictions table
CREATE TABLE IF NOT EXISTS StockPredictions (
    symbol VARCHAR(5) NOT NULL REFERENCES Stocks(symbol) ON DELETE CASCADE,
    prediction_date DATE NOT NULL,
    future_date DATE NOT NULL,
    predicted_close DECIMAL(15, 2) NOT NULL,
    PRIMARY KEY (symbol, prediction_date, future_date)
);

-- Stock List table
CREATE TABLE IF NOT EXISTS StockLists (
    list_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    visibility VARCHAR(10) NOT NULL CHECK (visibility IN ('private', 'shared', 'public'))
);

-- Stock List Item table
CREATE TABLE IF NOT EXISTS StockListItems (
    list_id INT NOT NULL REFERENCES StockLists(list_id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL REFERENCES Stocks(symbol) ON DELETE CASCADE,
    num_shares INT NOT NULL CHECK (num_shares >= 0),
    PRIMARY KEY (list_id, symbol)
);

-- Review table
CREATE TABLE IF NOT EXISTS Reviews (
    review_id SERIAL PRIMARY KEY,
    list_id INT NOT NULL REFERENCES StockLists(list_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(content) <= 4000),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (list_id, user_id)
);

-- Friend Request table
CREATE TABLE IF NOT EXISTS FriendRequests (
    request_id SERIAL PRIMARY KEY,
    from_user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    to_user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    status VARCHAR(10) CHECK (status IN ('pending', 'accepted', 'rejected')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (from_user_id != to_user_id)
);

CREATE TABLE IF NOT EXISTS Friends (
    user1_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    user2_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    since TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user1_id, user2_id),
    CHECK (user1_id < user2_id)
);

-- Shared List table
CREATE TABLE SharedLists (
    list_id INT NOT NULL REFERENCES StockLists(list_id) ON DELETE CASCADE,
    shared_user INT REFERENCES Users(user_id) ON DELETE CASCADE,
    PRIMARY KEY (list_id, shared_user)
);