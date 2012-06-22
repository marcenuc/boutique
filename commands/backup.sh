#!/bin/sh -e
cd ..
day=$(date +%A)
hostname=$(hostname -s)

log () {
  logger "$1";
  echo "$(date) $1";
}

for i in $BACKUP_DATA_FILES; do
  archive_file="$hostname$(echo $i |sed -e 's#[/ ]#_#g')-$day.tar.gz"
  log "Backing up $i to $archive_file: "
  local_archive_file=$archive_file
  tar czf $local_archive_file $i
  log " - $(ls -lh $local_archive_file)"
  smbclient -A backup-access.cfg -c "cd $BACKUP_SHARE_FOLDER;prompt OFF;put $local_archive_file" $BACKUP_SHARE
  log " - copied $local_archive_file to $BACKUP_SHARE_FOLDER/$BACKUP_SHARE_FOLDER, done."
done

for i in $BACKUP_STATIC_FILES; do
  log "Backing up $i to $BACKUP_SHARE_FOLDER/$BACKUP_SHARE_FOLDER."
  smbclient -A backup-access.cfg -c "cd $BACKUP_SHARE_FOLDER;recurse ON;prompt OFF;mput $i" $BACKUP_SHARE
  log "Done backing up $i to $BACKUP_SHARE/$BACKUP_SHARE_FOLDER."
done
