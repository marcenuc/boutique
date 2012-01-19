define owned_folder($owner) {
  file { $name:
    ensure  => directory,
    mode    => '2775',
  }

  exec { "chown ${name}":
    command => "/bin/chown -R ${owner}: .",
    user    => 'root',
    cwd     => $name,
    require => File[$name],
  }

  exec { "chmod ${name}":
    command => "/bin/chmod -R u=rwX,g=rwXs,o=rX .",
    user    => 'root',
    cwd     => $name,
    require => Exec["chown ${name}"],
  }
}
