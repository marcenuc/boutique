#!/bin/bash -ex

echo Checking java and Maven dependencies...
javac -version
mvn --version
echo OK.

echo Installing git and Puppet...
sudo apt-get install -y git puppet
echo OK.

home_folder="${1:?Home folder?}"
packages_folder="${2:?Packages folder?}"
[ -f "${packages_folder}/CouchDB.tar.xz" ]
[ -f "${packages_folder}/NodeJS.tar.xz" ]

auth_realm="${3:?Authentication realm?}"
admin_user="${4:?Admin user?}"
admin_password="${5:?Admin password?}"
admin_mail="${6:?Admin mail?}"
as400_user="${7:?as400 user?}"
as400_password="${8:?as400 password?}"
as400_host="${9:?as400 host?}"

couchdb_secret=$(dd if=/dev/urandom count=1 2> /dev/null |sha256sum |cut -f1 -d\ )
java_home=$(dirname $(dirname $(which java)))

#TODO DRY this folder name is duplicated in config/modules/boutique/manifests/init.pp
webapp_folder="${home_folder}/webapp"
git clone git://github.com/marcenuc/boutique.git "$webapp_folder"
cd "$webapp_folder"
git submodule init
git submodule update

manifest=$(tempfile -s .pp) || exit
trap "rm -f -- '$manifest'" EXIT

cat > "$manifest" <<EOF
class { 'boutique':
  admin_mail      => '$admin_mail',
  auth_realm      => '$auth_realm',
  couchdb_secret  => '$couchdb_secret',
  as400_host      => '$as400_host',
  home            => '$home_folder',
  packages_folder => '$packages_folder',
  java_home       => '$java_home',
}
EOF

sudo /usr/bin/env \
  FACTER_boutique_admin_user="$admin_user" \
  FACTER_boutique_admin_password="$admin_password" \
  FACTER_boutique_as400_user="$as400_user" \
  FACTER_boutique_as400_password="$as400_password" \
  puppet apply --modulepath="$webapp_folder/config/modules" "$manifest"

echo 'You need to "cd lib/As400Querier && ./install-jt400.sh && mvn package" to start.'
rm -f -- "$manifest"
trap - EXIT
exit
