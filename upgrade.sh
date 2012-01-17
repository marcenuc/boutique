#!/bin/sh -ex
sudo -u boutique git pull
sudo puppet apply --modulepath $PWD/config/modules setup.pp
