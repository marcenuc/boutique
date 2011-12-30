define unpacked_package($packages_folder, $installation_folder) {
  $package_root = "${installation_folder}/${name}"
  $package_file = "${package_root}.tar.xz"

  # copy the source package to $installation_folder (if it's changed)
  file { $name:
    path    => $package_file,
    source  => "${packages_folder}/${name}.tar.xz",
    require => File[$installation_folder],
  }

  $removed_package = "removed-${name}-package"
  exec { $removed_package:
    command     => "/usr/bin/test ! -e '${package_root}' || /bin/rm -r '${package_root}'",
    cwd         => $installation_folder,
    subscribe   => File[$name],
    # trigger execution only on source update.
    refreshonly => true,
  }

  exec { "unpacked-${name}-package":
    command   => "/bin/tar -Jxf '${package_file}'",
    cwd       => $installation_folder,
    creates   => $package_root,
    subscribe => Exec[$removed_package],
  }
}
