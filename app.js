angular.module('myApp', ['braintree-angular'])
.constant('clientTokenPath', 'braintree-client-token.php')
.controller('paymentsCtrl', function($scope, $braintree, $http, $timeout){
    $scope.submitted = false;
    $scope.$watch('submitted', function(newVal, oldVal){
        $scope.buttonText = $scope.submitted ? 'Purchase Another' : 'Purchase with Credit/Debit Card';
    });
    
    $scope.creditCard = {
      number: '',
      expirationDate: '',
      cardholderName: '',
      cvv: ''
    };
    $scope.customer = {
        first_name: "",
        last_name: "",
        company: "",
        email: ""
    }
    var startup = function() {
      $braintree.getClientToken().success(function(token) {
        client = new $braintree.api.Client({
          clientToken: token
        });
      });
    };
    
    // locks submit button until braintree is ready to recieve another. Configure in settings to be 10 seconds, default is 30  - https://articles.braintreepayments.com/control-panel/transactions/duplicate-checking#configure-duplicate-transaction-checking
    $scope.duplicatePreventer = false;
    $scope.$watch('duplicatePreventer', function(newVal, oldVal){
        $scope.submitButtonText = $scope.duplicatePreventer ? 'Wait 10 seconds to submit again' : 'Submit';
    });
    
    $scope.payButtonClicked = function(orderId) {
        // - Validate $scope.creditCard
        // - Make sure client is ready to use
        client.tokenizeCard({
        number: $scope.creditCard.number,
        expirationDate: $scope.creditCard.expirationDate
        }, function (err, nonce) {
        // - Send nonce to your server (e.g. to make a transaction)
        $scope.processing = true;
            $http.post('braintree-product.php', { 
              first_name: $scope.customer.first_name,
              last_name: $scope.customer.last_name,
              email: $scope.customer.email,
              company: $scope.customer.company,
              
              cardholderName: $scope.creditCard.cardholderName,
              nonce: nonce,
              cvv: $scope.creditCard.cvv,
              expirationDate: $scope.creditCard.expirationDate,
              
              orderId: orderId
            }).success( function(response, status, headers, config){
                $scope.processing = false;
                console.log(response);
                if(response.success == true){
                    alertify.success('Your payment has been submitted for processing.');
                    alertify.success('A receipt is being sent to your email address.');
                    $scope.submitted=true;
                    $scope.customer.first_name = '';
                    $scope.customer.last_name = '';
                    $scope.customer.email = '';
                    startup();
                    
                    // locks submit button until braintree is ready to recieve another. Configure in settings to be 10 seconds, default is 30 - https://articles.braintreepayments.com/control-panel/transactions/duplicate-checking#configure-duplicate-transaction-checking
                    $scope.duplicatePreventer = true;
                    $timeout(function(){
                        $scope.duplicatePreventer = false;
                    }, 10000);
                }
                else {
                    // response unsuccessful
                    alertify.error('This request was rejected. Double-check your Billing Information.');
                }
            }).error(function(data, status, headers, config) {
              console.log("AJAX failed!");
            });
        });
    };
    startup();
})

// begin ng-payments copypaste, this formats the CC number into groups of 4
// ----- THE REST IS NOT IMPORTANT FOR CONFIGURING ------

.factory('$payments', function() {

    var verCC, verCVC, verEXP, defaultFormat, isIE;
    isIE = (document.documentMode && document.documentMode < 9); //Don't try to deal with selections on < IE9
    defaultFormat = /(\d{1,4})/g;

    return {

      verified: function() {
        return verCC && verCVC && verEXP;
      },

      cards: [
        {
          type: 'maestro',
          pattern: /^(5018|5020|5038|6304|6759|676[1-3])/,
          format: defaultFormat,
          length: [12, 13, 14, 15, 16, 17, 18, 19],
          cvcLength: [3],
          luhn: true
        }, {
          type: 'dinersclub',
          pattern: /^(36|38|30[0-5])/,
          format: defaultFormat,
          length: [14],
          cvcLength: [3],
          luhn: true
        }, {
          type: 'laser',
          pattern: /^(6706|6771|6709)/,
          format: defaultFormat,
          length: [16, 17, 18, 19],
          cvcLength: [3],
          luhn: true
        }, {
          type: 'jcb',
          pattern: /^35/,
          format: defaultFormat,
          length: [16],
          cvcLength: [3],
          luhn: true
        }, {
          type: 'unionpay',
          pattern: /^62/,
          format: defaultFormat,
          length: [16, 17, 18, 19],
          cvcLength: [3],
          luhn: false
        }, {
          type: 'discover',
          pattern: /^(6011|65|64[4-9]|622)/,
          format: defaultFormat,
          length: [16],
          cvcLength: [3],
          luhn: true
        }, {
          type: 'mastercard',
          pattern: /^5[1-5]/,
          format: defaultFormat,
          length: [16],
          cvcLength: [3],
          luhn: true
        }, {
          type: 'amex',
          pattern: /^3[47]/,
          format: /(\d{1,4})(\d{1,6})?(\d{1,5})?/,
          length: [15],
          cvcLength: [3, 4],
          luhn: true
        }, {
          type: 'visa',
          pattern: /^4/,
          format: defaultFormat,
          length: [13, 14, 15, 16],
          cvcLength: [3],
          luhn: true
        }
      ],

      reFormatCardNumber: function(num) {
        var card, groups, upperLength, _ref;
        card = this.cardFromNumber(num);
        if (!card) {
          return num;
        }
        upperLength = card.length[card.length.length - 1];
        num = num.replace(/\D/g, '');
        num = num.slice(0, +upperLength + 1 || 9e9);
        if (card.format.global) {
          return (_ref = num.match(card.format)) != null ? _ref.join(' ') : void 0;
        } else {
          groups = card.format.exec(num);
          if (groups != null) {
            groups.shift();
          }
          return groups != null ? groups.join(' ') : void 0;
        }
      }, //reFormatCardNumber

      cardFromNumber: function(num) {
        var card, _i, _len;
        num = (num + '').replace(/\D/g, '');
        for (_i = 0, _len = this.cards.length; _i < _len; _i++) {
          card = this.cards[_i];
          if (card.pattern.test(num)) {
            return card;
          }
        }
      }, //cardFromNumber

      luhnCheck: function(num) {
        var digit, digits, odd, sum, _i, _len, card, length;
        odd = true;
        sum = 0;
        card = this.cardFromNumber(num);
        if(!card) { return false; }
        length = card.length[card.length.length - 1];
        digits = (num + '').split('').reverse();
        for (_i = 0, _len = digits.length; _i < _len; _i++) {
          digit = digits[_i];
          digit = parseInt(digit, 10);
          if ((odd = !odd)) {
            digit *= 2;
          }
          if (digit > 9) {
            digit -= 9;
          }
          sum += digit;
        }
        return verCC = sum % 10 === 0;
      }, //luhnCheck

      validateCardExpiry: function(month, year) {
        var currentTime, expiry, prefix, _ref;
        if (typeof month === 'object' && 'month' in month) {
          _ref = month, month = _ref.month, year = _ref.year;
        }
        if (!(month && year)) {
          return false;
        }
        if (!/^\d+$/.test(month)) {
          return false;
        }
        if (!/^\d+$/.test(year)) {
          return false;
        }
        if (!(parseInt(month, 10) <= 12)) {
          return false;
        }
        if (year.length === 2) {
          prefix = (new Date).getFullYear();
          prefix = prefix.toString().slice(0, 2);
          year = prefix + year;
        }
        expiry = new Date(year, month);
        currentTime = new Date;
        expiry.setMonth(expiry.getMonth() - 1);
        expiry.setMonth(expiry.getMonth() + 1, 1);
        return verEXP = expiry > currentTime;
      }, //validateCardExpiry

      validateCVC: function(a, b) {
        return verCVC = a.indexOf(b)>-1;
      }
    }
  })
  .directive('formatCard', ['$payments','$timeout', function($payments, $timeout) {
    return {
        scope: false,
        link: function(scope, elem, attrs, validateCtrl) {

          //Format and determine card as typing it in
          elem.on('keypress', function(e) {
            var digit, re, card, value, length;
            if(e.which === 8 || e.metaKey || (!e.which && e.keyCode)) {
                return;
            }

            digit = String.fromCharCode(e.which);
            if (!/^\d+$/.test(digit)) {
              e.preventDefault();
              return;
            }
            value = elem.val();

            card = $payments.cardFromNumber(value + digit);

            length = (value.replace(/\D/g, '') + digit).length;
            upperLength = 16;

            if (card) {
              upperLength = card.length[card.length.length - 1];
            }

            if (length > upperLength) {
              e.preventDefault();
              return;
            }

            if (!this.isIE && (e.currentTarget.selectionStart != null) && (e.currentTarget.selectionStart !== value.length)) {
              return;
            }

            if (card && card.type === 'amex') {
              re = /^(\d{4}|\d{4}\s\d{6})$/;
            } else {
              re = /(?:^|\s)(\d{4})$/;
            }

            if (re.test(value)) {
              e.preventDefault();
              elem.val(value + ' ' + digit);
            } else if (re.test(value + digit) && length < upperLength) {
              e.preventDefault();
              elem.val(value + digit + ' ');
            }
          });

          //Format the card if they paste it in and check it
          elem.on('paste', function(e) {
            $timeout(function() {
              var formatted, value;
              value = elem.val();
              var formatted = $payments.reFormatCardNumber(value);
              elem.val(formatted);
            });
          });
        }
    }
  }]);