<?php
require_once 'braintree-product-lib.php';

$sale = new Braintree_Product('config.ini', 50.00);
echo $sale->response;
?>