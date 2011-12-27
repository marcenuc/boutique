#!/bin/bash -ex
packages_folder="${1:?Folder with CouchDB.tar.xz and NodeJS.tar.xz packages?}"
[ -f "${packages_folder}/CouchDB.tar.xz" ]
[ -f "${packages_folder}/NodeJS.tar.xz" ]

auth_realm="${2:?Authentication realm?}"
admin_user="${3:?Admin user?}"
admin_password="${4:?Admin password?}"
admin_mail="${5:?Admin mail?}"
as400_user="${6:?as400 user?}"
as400_password="${7:?as400 password?}"

#TODO this folder name is duplicated in config/modules/boutique/manifests/init.pp
home_folder="/home/${admin_user}"
webapp_folder="${home_folder}/webapp"

couchdb_secret=$(dd if=/dev/urandom count=1 2> /dev/null |sha1sum |cut -f1 -d\ )

sudo apt-get install puppet
sudo mkdir -p "$home_folder"
sudo git clone "$PWD" "$webapp_folder"

( cd "$webapp_folder" &&
  sudo git submodule init &&
  sudo git submodule update )

#FIXME use temporary file
manifest="setup.pp"
cat > "$manifest" <<EOF
\$boutique_admin_user     = '$admin_user'
\$boutique_admin_password = '$admin_password'
\$boutique_as400_user     = '$as400_user'
\$boutique_as400_password = '$as400_password'

class { 'boutique':
  admin_mail      => '$admin_mail',
  auth_realm      => '$auth_realm',
  couchdb_secret  => '$couchdb_secret',
  packages_folder => '$packages_folder',
}
EOF
sudo puppet apply --modulepath="$PWD"/config/modules "$manifest"

echo 'Maybe you need to "cd lib/As400Querier && mvn package" to start.'
