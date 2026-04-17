-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create schema for investment scanner (optional)
CREATE SCHEMA IF NOT EXISTS scanner;

-- Set default search_path for the scanner user
ALTER ROLE scanner SET search_path TO scanner, public;