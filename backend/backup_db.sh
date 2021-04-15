#!/bin/bash
set -e

DIRECTORY=./backups
DIRPATH=$(realpath $DIRECTORY)
BASEDIR=$(dirname $DIRPATH)
if [ ! -d "$DIRPATH" ]; then
	mkdir "$DIRPATH"
fi

DUMP_PATH="$DIRPATH/db_dump_`date +%d-%m-%Y"_"%H_%M_%S`.sql"

sudo docker-compose -f ${PAIPASS_DIRECTORY}/docker-compose.backend.yml exec db pg_dumpall -c -U j1149  | tee -a "$DUMP_PATH" > /dev/null
sudo rm -f "$BASEDIR/db_dump.sql"
cp "$DUMP_PATH" "$BASEDIR/db_dump.sql"

DUMP_PATH="$DIRPATH/torrent_client_db_dump_`date +%d-%m-%Y"_"%H_%M_%S`.sql"
sudo docker-compose -f ${PAIPASS_DIRECTORY}/docker-compose.backend.yml exec torrent_client_db pg_dumpall -c -U j1149  | tee -a "$DUMP_PATH" > /dev/null
sudo rm -f "$BASEDIR/torrent_client_db_dump.sql"
cp "$DUMP_PATH" "$BASEDIR/torrent_client_db_dump.sql"

DUMP_PATH="$DIRPATH/torrent_tracker_db_dump_`date +%d-%m-%Y"_"%H_%M_%S`.sql"
sudo docker-compose -f ${PAIPASS_DIRECTORY}/docker-compose.backend.yml exec torrent_tracker_db pg_dumpall -c -U j1149 | tee -a "$DUMP_PATH" > /dev/null
sudo rm -f "$BASEDIR/torrent_tracker_db_dump.sql"
cp "$DUMP_PATH" "$BASEDIR/torrent_tracker_db_dump.sql"
