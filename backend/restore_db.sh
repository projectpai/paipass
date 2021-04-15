#!/bin/bash
set -e

docker-compose rm -fsv db torrent_client_db torrent_tracker_db
docker-compose up -d db torrent_client_db torrent_tracker_db
# give the processes some time to boot
sleep 10s
cat ${PAIPASS_DIRECTORY}/backend/db_dump.sql | docker-compose exec -T db psql --dbname paipass -U ${SQL_USER} -e ${SQL_PASS}

cat ${PAIPASS_DIRECTORY}/backend/torrent_client_db_dump.sql | docker-compose exec -T torrent_client_db psql --dbname torrent_client  -U ${SQL_USER} -e ${SQL_PASS}

cat ${PAIPASS_DIRECTORY}/backend/torrent_tracker_db_dump.sql | docker-compose exec -T  torrent_tracker_db psql --dbname torrent_tracker  -U ${SQL_USER} -e ${SQL_PASS}

