var Authenticator = {

	request : require('request'),
 	tough : require('tough-cookie'),
 	extensions : require('../helpers/Extensions'),	

	generateAuthenticationCookies : function (username, password, authenticationServiceEndPoint, callback) {

		var cookieJar = this.request.jar(); 
		this.request.post({
			headers: {
				'content-type' : 'application/x-www-form-urlencoded'
			},
			url: authenticationServiceEndPoint,
			jar: cookieJar,
			followRedirect: true,
			form: {
				'changeLanguageSelect' : 'en',
				'email' : '',
				'logon' : username,
				'method' : 'login',				    	
				'password' : password,
				'realm' : 'realm1'
			},
			"rejectUnauthorized": false

		}, function(error, response, body) {		
	        if(error) {
	        	console.error(error);
	            return callback("failed to authenticate");
	        }      
	        console.log('authentication returned: [' + response.statusCode + '] ', response.body);        
	        return callback("", cookieJar);
		});
	},

	export : function() {
		exports.generateAuthenticationCookies = this.extensions.bind(this.generateAuthenticationCookies, this);
	}	
}

Authenticator.export();