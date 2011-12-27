define upstart_service($run_command, $admin_user) {
  $service_name = "${admin_user}-${name}"

  file { "/etc/init/${service_name}.conf":
    ensure  => file,
    owner   => 'root',
    group   => 'root',
    mode    => '0444',
    content => template('boutique/service.conf.erb'),
    require => User[$admin_user],
  }

  service { $name:
    ensure     => running,
    name       => $service_name,
    enable     => true,
    provider   => upstart,
    # Upstart does not detect new .conf file on restart of service.
    hasrestart => false,
    subscribe  => Service[$name],
  }
}
