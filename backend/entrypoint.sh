#!/bin/bash

echo "Waiting for database to be ready..."
sleep 5

echo "Applying migrations..."
python manage.py migrate --noinput

echo "Creating superuser if not exists..."
python manage.py createsuperuser_if_not_exists

echo "Generating demo data..."
python manage.py generate_demo_data

echo "Starting development server..."
exec python manage.py runserver 0.0.0.0:8000
