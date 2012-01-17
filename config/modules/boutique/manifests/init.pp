# This class install/configures/manages a production instance of Boutique.
#
# == Parameters
#
# [*admin_user*]
#   Username of the admin user.
#
# == Examples
#
#   class { 'boutique':
#     auth_realm      => 'Boutique realm',
#     couchdb_secret  => 'b8b5d0da8105b4287dda5936bb3bd613',
#     packages_folder => '/vagrant',
#   }
#
# == Authors
#
# Marcello Nuccio <marcello.nuccio@gmail.com>
#
# == Copyright
#
# Copyright 2011 Nuccio s.a.s., unless otherwise noted.
#
class boutique(
  $admin_mail      = undef,
  $auth_realm      = undef,
  $couchdb_secret  = undef,
  $proxyed_path    = 'boutique',
  $proxyed_port    = '8000',
  $couchdb_port    = '12000',
  $photo_share     = 'Boutique',
  $shares_folder   = '/srv/samba',
  $home            = undef,
  $packages_folder = undef,
  $as400_host      = undef,
  $java_home       = '/opt/jdk'
) {
  case $::operatingsystem {
    ubuntu: {
      $packages = ['git', 'zlib1g', 'libssl0.9.8', 'samba', 'libpam-smbpass', 'imagemagick']
    }
    default: {
      fail("Module ${::module_name} does not support ${::operatingsystem}")
    }
  }

  if $::boutique_admin_user == undef {
    fail("Set boutique_admin_user.")
  }
  $admin_user = $::boutique_admin_user

  if $::boutique_admin_password == undef {
    fail("Set boutique_admin_password.")
  }
  $admin_password = $::boutique_admin_password

  if $as400_host == undef {
    fail("Set as400_host.")
  }

  if $::boutique_as400_user == undef {
    fail("Set boutique_as400_user.")
  }
  $as400_user = $::boutique_as400_user

  if $::boutique_as400_password == undef {
    fail("Set boutique_as400_password.")
  }
  $as400_password = $::boutique_as400_password

  if $auth_realm == undef {
    fail("Set auth_realm.")
  }
  if $couchdb_secret == undef {
    fail("Set couchdb_secret.")
  }
  if $packages_folder == undef {
    fail("Set packages_folder.")
  }
  #TODO Validate all parameters.
  #TODO Hash $admin_password.
  #TODO Ensure JDK is installed in $java_home.

  $couchdb_folder     = "${home}/CouchDB"
  $couchdb_log        = "${home}/couch.log"
  $couchdb_lib_folder = "${home}/var/lib/couchdb"

  $nodejs_folder      = "${home}/NodeJS"

  $webapp_folder      = "${home}/webapp"

  $photo_folder       = "${shares_folder}/${photo_share}"
  $photo_subfolders   = ["${photo_folder}/tessuti", "${photo_folder}/foto", "${photo_folder}/schizzi", "${photo_folder}/pubblicate"]

  Package { ensure => latest, }

  File {
    owner => $admin_user,
    group => $admin_user,
    mode  => '0644',
  }

  Service {
    ensure     => running,
    enable     => true,
    provider   => upstart,
    # Upstart does not detect new .conf file on restart of service.
    hasrestart => false,
    hasstatus  => false,
  }

  unpacked_package { ['CouchDB', 'NodeJS']:
    packages_folder     => $packages_folder,
    installation_folder => $home,
  }

  upstart_service { 'couchdb':
    run_command => "${couchdb_folder}/bin/couchdb",
    admin_user  => $admin_user,
    require     => [Unpacked_package['CouchDB'], User[$admin_user]],
  }

  file { 'environment':
    ensure  => file,
    path    => "${webapp_folder}/environment",
    content => template('boutique/environment.erb'),
    notify  => [Service['couchdb'], Service['webserver'], Service['follow']],
  }

  exec { 'build':
    command   => "${webapp_folder}/run build",
    cwd       => $webapp_folder,
    subscribe => File['environment'],
  }

  couchapp { 'boutique':
    webapp_folder => $webapp_folder,
  }

  upstart_service { 'webserver':
    run_command => "${webapp_folder}/scripts/run-production-webserver.sh",
    admin_user  => $admin_user,
    subscribe   => [Exec['build'], User[$admin_user]],
  }

  upstart_service { 'follow':
    run_command => "${webapp_folder}/scripts/run-service-follow.sh",
    admin_user  => $admin_user,
    subscribe   => [Exec['build'], User[$admin_user], Service['couchdb'], Couchapp['boutique']],
  }

  package { $packages: }

  group { $admin_user:
    ensure => present,
  }

  user { $admin_user:
    ensure     => present,
    gid        => $admin_user,
    membership => minimum,
    shell      => '/bin/false',
    managehome => false,
    home       => $home,
    comment    => 'Boutique service user',
    require    => Group[$admin_user],
  }

  file { $home:
    ensure  => directory,
    require => User[$admin_user],
  }

  file { 'var':
    ensure  => directory,
    recurse => true,
    path    => "${home}/var",
    require => File[$home],
  }

  file { 'lib':
    ensure  => directory,
    path    => "${home}/var/lib",
    require => File['var'],
  }

  file { $couchdb_lib_folder:
    ensure  => directory,
    require => File['lib'],
    notify  => Service['couchdb'],
  }

  file { "${couchdb_folder}/var":
    ensure  => directory,
    require => [Unpacked_package['CouchDB'], User[$admin_user]],
    notify  => Service['couchdb'],
  }

  file { "${couchdb_folder}/etc/couchdb/local.d/boutique.ini":
    ensure  => file,
    content => template('boutique/couchdb.ini.erb'),
    require => [Unpacked_package['CouchDB'], User[$admin_user]],
    notify  => Service['couchdb'],
  }


  file { $shares_folder:
    ensure => directory,
    owner  => 'root',
    group  => 'root',
    mode   => '0644',
  }

  file { $photo_folder:
    ensure  => directory,
    owner  => 'root',
    group  => 'root',
    mode   => '0644',
    require => File[$shares_folder],
  }

  file { $photo_subfolders:
    ensure  => directory,
    recurse => true,
    mode    => '2664',
    require => File[$photo_folder],
  }

  file { 'smb.conf':
    ensure  => file,
    path    => '/etc/samba/smb.conf',
    content => template('boutique/smb.conf.erb'),
    require => [Package['samba'], Package['imagemagick'], Package['libpam-smbpass']],
  }

  service { ['smbd', 'nmbd']:
    subscribe => File['smb.conf'],
  }

  file { $couchdb_log:
    ensure => file,
    notify => Service['couchdb'],
  }

  file { '/etc/logrotate.d/boutique':
    ensure  => file,
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('boutique/logrotate.erb'),
  }

  file { "${webapp_folder}/config/server-configs.js":
    ensure  => file,
    # TODO should we change owner? this file has sensitive data...
    mode    => '0440',
    content => template('boutique/server-configs.js.erb'),
    notify  => [Service['webserver'], Service['follow']],
  }

  file { 'as400-settings':
    ensure  => file,
    path    => "${webapp_folder}/local.properties",
    # TODO should we change owner? this file has sensitive data...
    mode    => '0440',
    content => template('boutique/local.properties.erb'),
  }

  # TODO this service requires java: add dependency.
  cron { 'sync-as400':
    command     => "${webapp_folder}/run sync-as400",
    environment => ["MAILTO=\"${admin_mail}\"", "PATH=\"/usr/local/bin:/bin:/usr/bin:${java_home}/bin\""],
    hour        => [7, 13, 16],
    minute      => 30,
    user        => $admin_user,
    require     => [User[$admin_user], File['as400-settings']],
  }

  cron { 'backup':
    command => "${webapp_folder}/run backup",
    hour    => 6,
    minute  => 0,
    user    => $admin_user,
    require => User[$admin_user],
  }
}
