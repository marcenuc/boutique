#!/bin/dash -e
cd ..
smbclient -A backup-access.cfg -c "cd $BACKUP_SHARE_FOLDER;recurse ON;prompt OFF;mput var" $BACKUP_SHARE
