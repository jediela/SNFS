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