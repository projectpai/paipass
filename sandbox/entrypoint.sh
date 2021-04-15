#!/bin/sh
echo "Starting sandbox!!!"
/usr/bin/transmission-daemon \
	--config-dir=/home/ubuntu/.config/transmission-daemon \
	--log-debug --logfile /var/log/transmission.log &

if [ ! -f /var/log/transmission.log ]; then
    echo "File not found!"
fi

sleep 2

if [ ! -f /var/log/transmission.log ]; then
    echo "File not found!"
fi

sleep 5

if [ ! -f /var/log/transmission.log ]; then
    echo "File not found!"
fi

exec "$@"
