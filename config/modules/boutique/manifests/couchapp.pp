define couchapp($webapp_folder) {
  exec { 'couchapp push':
    command   => "${webapp_folder}/run push",
    cwd       => $webapp_folder,
    subscribe => [Service['couchdb']],
  }
}
