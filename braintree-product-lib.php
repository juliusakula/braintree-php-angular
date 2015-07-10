<?php
require_once 'braintree-lib/lib/Braintree.php';

class Braintree_Product {
    public function __construct($config, $price = 0){
        // DO NOT store .ini files in public web root! to bypass figuring that out (if you're hella lazy)
        // remove $config as a parameter and hardcode your values into this short section
        $parsed = parse_ini_file($config, TRUE);
        Braintree_Configuration::environment( $parsed['environment']);
        Braintree_Configuration::merchantId(  $parsed['merchantId'] );
        Braintree_Configuration::publicKey(   $parsed['publicKey']  );
        Braintree_Configuration::privateKey(  $parsed['privateKey'] );
        
        if($price > 0){
            // angular doesnt like php's $_POST something something 
            // http://stackoverflow.com/questions/19254029/angularjs-http-post-does-not-send-data
            $post_inputs = json_decode(file_get_contents('php://input'),true); 
            
            
            $result = Braintree_Transaction::sale(array(
                'amount' => $price,
                'paymentMethodNonce' => $post_inputs['nonce'],
                'customer' => [
                    'firstName' => $post_inputs['first_name'],
                    'lastName' => $post_inputs['last_name'],
                    'email' => $post_inputs['email'],
                    'company' => $post_inputs['company'] ],
                'creditCard' => [
                    'cardholderName' => $post_inputs['cardholderName'],
                    'cvv' => $post_inputs['cvv'],
                    'expirationDate' => $post_inputs['expirationDate'] ],
                'orderId' => $post_inputs['orderId'],
                'options' => [
                    'submitForSettlement' => True // bill immediately
                ]
            ));
            
            if ($result->success) {
                $response['success'] = true;
                $response['message'] = "Success";
                $response['id'] = $result->transaction->id;
            } else if ($result->transaction) {
                $response['success'] = false;
                $response['message'] = "Error processing transaction";
                $response['code'] = $result->transaction->processorResponseCode;
                $response['text'] = $result->transaction->processorResponseText;
            } else {
                $response['success'] = false;
                $response['message'] = "Validation errors";
                $response['errors'] = $result->errors->deepAll();
            }

            $this->response = json_encode($response);
        }
        else {
            // price not provided, create client token
            $this->client_token = Braintree_ClientToken::generate();
        }
    }
}
?>