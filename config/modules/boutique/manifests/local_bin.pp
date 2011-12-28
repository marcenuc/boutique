define local_bin($package_name, $package_folder) {
  file { $name:
    ensure  => link,
    path    => "/usr/local/bin/${name}",
    target  => "${package_folder}/bin/${name}",
    require => Unpacked_package[$package_name],
  }
}
