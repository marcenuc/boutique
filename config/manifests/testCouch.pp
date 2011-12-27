$boutique_admin_user     = 'boutique'
$boutique_admin_password = 'secret'
$boutique_as400_user     = 'as400user'
$boutique_as400_password = 'as400secret'

class { 'boutique':
  admin_mail      => 'admin@example.com',
  auth_realm      => 'Boutique vagrant',
  couchdb_secret  => 'b8b5d0da8105b4287dda5936bb3bd613',
  packages_folder => '/vagrant',
}
