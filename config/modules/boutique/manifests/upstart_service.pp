define upstart_service($run_command, $admin_user) {
  $service_name = "${admin_user}-${name}"
  $service_conf = "/etc/init/${service_name}.conf"

  file { $service_conf:
    ensure  => file,
    owner   => 'root',
    group   => 'root',
    mode    => '0444',
    content => template('boutique/service.conf.erb'),
    require => User[$admin_user],
    notify  => Service[$name],
  }

  #FIXME workaround to upstart provider bugs
  file { "/etc/init.d/${service_name}":
    ensure => link,
    target => $service_conf,
    before => Service[$name],
  }

  service { $name:
    ensure     => running,
    name       => $service_name,
    # FIXME uncomment when Puppet works with upstart.
    #enable     => true,
    provider   => upstart,
    # Upstart does not detect new .conf file on restart of service.
    hasrestart => false,
  }
}
