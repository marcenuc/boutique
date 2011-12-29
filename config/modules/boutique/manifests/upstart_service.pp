define upstart_service($run_command, $admin_user) {
  $service_name = "${admin_user}-${name}"

  file { "/etc/init/${service_name}.conf":
    ensure  => file,
    owner   => 'root',
    group   => 'root',
    mode    => '0444',
    content => template('boutique/service.conf.erb'),
    require => User[$admin_user],
    notify  => Service[$name],
  }

  service { $name:
    ensure     => running,
    name       => $service_name,
    enable     => true,
    provider   => upstart,
    # Upstart does not detect new .conf file on restart of service.
    hasrestart => false,
    hasstatus  => false,
    status     => "/sbin/status '${service_name}' | /bin/grep -q '${service_name} start/running'"
  }
}
