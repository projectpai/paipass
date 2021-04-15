#!/bin/sh

# error out if any given command fails
set -e
## For the initial migration otherwise it won't work.
#python manage.py makemigrations users
#python manage.py makemigrations oauth2
## A necessary fix to a long open problem.
#python ./fix1_oauth_lib.py
#python manage.py migrate
## Another necessary fix to a long open problem.
#python manage.py makemigrations
#python manage.py migrate
## the dependency ./users/0001_initial.py won't exist before the first
## migration and the second migration is the initial setup of the system
## so we want it to occur after that.
## TODO this should be looked into:
## https://docs.djangoproject.com/en/3.0/howto/writing-migrations/#controlling-the-order-of-migrations
#cp ./users/0002_known_users.py \
#	./users/migrations/0002_known_users.py
#python manage.py makemigrations users
#python manage.py migrate
#cp ./users/0003_test_user.py ./users/migrations/0003_test_user.py
#python manage.py makemigrations users
#python manage.py migrate
##
#cp ./oauth2/0002_known_apps.py \
#	./oauth2/migrations/0002_known_apps.py
#python manage.py makemigrations oauth2
python manage.py makemigrations
python manage.py migrate