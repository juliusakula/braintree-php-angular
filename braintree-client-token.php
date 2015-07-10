<?php
require_once 'braintree-product-lib.php';

$cli = new Braintree_Product('config.ini');
echo $cli->client_token;
?>