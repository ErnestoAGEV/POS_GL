#!/bin/sh
set -e

echo "Running database migrations..."
node dist/db/migrate.js

echo "Starting POSGL server..."
exec node dist/index.js
