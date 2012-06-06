$boutique_admin_user     = 'boutique'
$boutique_admin_password = 'Irotaz01'
$boutique_as400_user     = 'AS400USER'
$boutique_as400_password = 'AS400PASS'
class { 'boutique':
  admin_mail          => 'marcello.nuccio@gmail.com',
  auth_realm          => 'Boutique tailor',
  couchdb_secret      => 'e195ee9d49b33981878786c0ea58bd299adcb453d1dc1a8377f9c1ad39dd7011',
  couchdb_port        => '5984',
  proxyed_port        => '7999',
  home                => '/home/boutique',
  as400_host          => 'localhost',
  backup_share        => '//server/backup',
  backup_share_folder => 'Boutique',
}
