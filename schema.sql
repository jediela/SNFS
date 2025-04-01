-- Cars dummy table
CREATE TABLE IF NOT EXISTS cars (
    id SERIAL PRIMARY KEY,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    price NUMERIC(10,2) NOT NULL
);

-- Insert dummy data into cars table
INSERT INTO cars (make, model, year, price) VALUES
('Toyota', 'Camry', 2020, 24000.00),
('Honda', 'Accord', 2019, 22000.00),
('Ford', 'Mustang', 2021, 35000.00);

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
    balance DECIMAL(15, 2) DEFAULT 0.0
);

-- Cash Transaction table
CREATE TABLE CashTransactions (
    transaction_id SERIAL PRIMARY KEY,
    portfolio_id INT NOT NULL REFERENCES Portfolios(portfolio_id) ON DELETE CASCADE,
    type VARCHAR(10) CHECK (type IN ('deposit', 'withdrawal')),
    amount DECIMAL(15, 2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock table
CREATE TABLE Stocks (
    symbol VARCHAR(10) PRIMARY KEY, -- Changed to symbol (unique identifier)
    company_name VARCHAR(100) NOT NULL
);

-- Stock Prices table
CREATE TABLE StockPrices (
    symbol VARCHAR(10) NOT NULL REFERENCES Stocks(symbol) ON DELETE CASCADE,
    date DATE NOT NULL,
    open DECIMAL(15, 2) NOT NULL,
    high DECIMAL(15, 2) NOT NULL,
    low DECIMAL(15, 2) NOT NULL,
    close DECIMAL(15, 2) NOT NULL,
    volume BIGINT NOT NULL,
    PRIMARY KEY (symbol, date)  -- Unique price per symbol per day
);


-- Stock Transaction table
CREATE TABLE StockTransactions (
    transaction_id SERIAL PRIMARY KEY,
    portfolio_id INT NOT NULL REFERENCES Portfolios(portfolio_id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL REFERENCES Stocks(symbol) ON DELETE CASCADE,
    type VARCHAR(10) CHECK (type IN ('buy', 'sell')),
    num_shares INT NOT NULL CHECK (num_shares > 0),
    price DECIMAL(15, 2) NOT NULL,  -- Price per share at transaction time
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock List table
CREATE TABLE StockLists (
    list_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    visibility VARCHAR(10) NOT NULL CHECK (visibility IN ('private', 'shared', 'public'))
);

-- Stock List Item table
CREATE TABLE StockListItems (
    list_id INT NOT NULL REFERENCES StockLists(list_id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL REFERENCES Stocks(symbol) ON DELETE CASCADE,
    num_shares INT NOT NULL CHECK (num_shares >= 0),
    PRIMARY KEY (list_id, symbol)
);

-- Review table
CREATE TABLE Reviews (
    review_id SERIAL PRIMARY KEY,
    list_id INT NOT NULL REFERENCES StockLists(list_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(content) <= 4000),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (list_id, user_id)  -- One review per user per list
);

-- Friend Request table
CREATE TABLE FriendRequests (
    request_id SERIAL PRIMARY KEY,
    from_user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    to_user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    status VARCHAR(10) CHECK (status IN ('pending', 'accepted', 'rejected')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (from_user_id, to_user_id)  -- Prevent duplicate requests
);