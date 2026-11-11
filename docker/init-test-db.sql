-- Runs once when the Postgres volume is first created.
-- A separate database for automated tests, so they never touch demo data.
CREATE DATABASE griffin_test OWNER griffin;
