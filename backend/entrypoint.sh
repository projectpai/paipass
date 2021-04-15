#!/bin/sh

set -e
echo "Creating Cache Table"
python manage.py createcachetable
echo "Making Migrations"
python manage.py makemigrations
echo "Migrating"
python manage.py migrate
echo "Running run_migrations.py"
python run_migrations.py
exec "$@"
