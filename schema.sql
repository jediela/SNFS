-- Cars dummy table
CREATE TABLE IF NOT EXISTS cars (
    id SERIAL PRIMARY KEY,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    color VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    price NUMERIC(10,2) NOT NULL
);
