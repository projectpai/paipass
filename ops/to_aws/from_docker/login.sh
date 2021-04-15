token=$(aws ecr get-authorization-token)
registry=$(echo "$token" | jq -r .authorizationData[].proxyEndpoint | sed -e 's|https://||g')
pass=$(echo "$token" | jq -r .authorizationData[].authorizationToken | base64 -d | cut -d: -f2)
echo "$pass" | docker login -u AWS --password-stdin "$registry"