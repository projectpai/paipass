#!/bin/sh
echo "Starting torrent provider" 
/usr/bin/transmission-daemon \
	--config-dir=/home/ubuntu/.config/transmission-daemon \
	--log-debug --logfile /var/log/transmission.log &

/usr/bin/python3 /opt/api/manage.py makemigrations
/usr/bin/python3 /opt/api/manage.py migrate

exec "$@"
