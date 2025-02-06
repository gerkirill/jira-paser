#!/bin/bash
SSH_USER=root
SSH_HOST=159.223.224.168
DEPLOY_ROOT="/root/ach-auth-helper"
HEALTH_URL="http://159.223.224.168:3000/health/"
FILES_TO_DEPLOY="ecosystem.yml package.json package-lock.json install-and-restart.sh dist"

main() {
  rm -rf ./dist
  npm run build
  git describe --tags > ./dist/version.txt
  scp -r \
    ${FILES_TO_DEPLOY} \
    ${SSH_USER}@${SSH_HOST}:${DEPLOY_ROOT}


  eval $(parse_yaml ecosystem.yml) # extracts ${apps__name}
  ssh ${SSH_USER}@${SSH_HOST} "bash -i -s" < ./install-and-restart.sh $DEPLOY_ROOT ${apps__name}
  sleep 3
  curl -s -o /dev/null --max-time 5 -w "Health check response: %{http_code}\n" ${HEALTH_URL}
}

function parse_yaml {
   local prefix=$2
   local s='[[:space:]]*' w='[a-zA-Z0-9_]*' fs=$(echo @|tr @ '\034')
   sed -ne "s|^\($s\):|\1|" \
        -e "s|^\($s\)\($w\)$s:$s[\"']\(.*\)[\"']$s\$|\1$fs\2$fs\3|p" \
        -e "s|^\($s\)\($w\)$s:$s\(.*\)$s\$|\1$fs\2$fs\3|p"  $1 |
   awk -F$fs '{
      indent = length($1)/2;
      vname[indent] = $2;
      for (i in vname) {if (i > indent) {delete vname[i]}}
      if (length($3) > 0) {
         vn=""; for (i=0; i<indent; i++) {vn=(vn)(vname[i])("_")}
         printf("%s%s%s=\"%s\"\n", "'$prefix'",vn, $2, $3);
      }
   }'
}

main "$@"
