#!/bin/sh

opentracker -f /usr/local/etc/opentracker.conf &

/usr/bin/python3.7 /opt/api/manage.py makemigrations --verbosity=3
/usr/bin/python3.7 /opt/api/manage.py migrate --verbosity=3
# make sure the open tracker has a whitelist.conf file available
# by running this script.
#/usr/bin/python3.7 -m whitelist_api.opentracker

exec "$@"
