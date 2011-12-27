$boutique_admin_user     = 'boutique'
$boutique_admin_password = 'secret'

class { 'boutique':
  auth_realm      => 'Boutique realm',
  couchdb_secret  => 'b8b5d0da8105b4287dda5936bb3bd613',
  packages_folder => '/vagrant',
}
