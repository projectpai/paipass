#!/usr/bin/env bash
echo "Frontend Admin Operational."
printenv | more
printf "DEPLOYMENT_ENV=%s\n" "${DEPLOYMENT_ENVIRONMENT}"
if [ "${DEPLOYMENT_ENVIRONMENT}" == "production" ];
then
        echo "Running nginx"
        # daemon off -> run nginx in the foreground to stop docker from
        # closing.
        nginx -g 'daemon off;'
elif [ "${DEPLOYMENT_ENVIRONMENT}" == "development" ];
then
        echo "Running npm"
        npm start
else
        printf "DEPLOYMENT_ENV: %s not found" "${DEPLOYMENT_ENVIRONMENT}"
        exit 9001
fi      

