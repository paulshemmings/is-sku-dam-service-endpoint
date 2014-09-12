var Detailer = {

	request : require('request'),
 	tough : require('tough-cookie'),
 	extensions : require('../helpers/Extensions'),	
 	authenticator : require('./Authenticator'),

	validateRequest : function(json) {
		if (!json.authenticationServiceEndPoint || json.authenticationServiceEndPoint == "") return "no authentication service defined";
		if (!json.username || json.username == "") return "No authentication username";
		if (!json.password || json.password == "") return "No authentication password";
		if (!json.host || json.host == "") return "No host specified for DAM service endpoint";
		if (!json.port || json.port == "") return "No port specified for DAM service endpoint";
		if (!json.asset || json.asset == "") return "No asset defined";
		return ("success");
	}, 	

	getAsset : function(param, callback) {
		var self = this;

		console.log('authenticate: ', param.username);
		console.log('using endpoint: ', param.authenticationServiceEndPoint);

		this.authenticator.generateAuthenticationCookies(param.username, param.password, param.authenticationServiceEndPoint, function(err, cookieJar) {

			if(err || !cookieJar.getCookies) {
				return callback(err);
			}
			
			var cookieLength = cookieJar.getCookies('https://www.nike.net').length;
			console.log('authentication returned ' + cookieLength + ' cookies');	
			if (cookieLength < 1) {
				return callback("failed to authenticate");
			}

			var requestUrl = (param.host == "localhost" ? 'http://' : 'https://')
				+ param.host
				+ ':' + param.port
				+ '/bin/assetlibrary/api-assetdetails'
		    	+ '?existingAssetAbsolutePath=' + param.asset;


		   	var options = {
		   		url: requestUrl,   	
		   		headers: {
			    	'Cookie' : cookieJar.getCookieString('https://www.nike.net')
				},
		   		"rejectUnauthorized": false
		   	};

		   	if (param.host == "localhost") {
		   		options.auth = {
		   			username : "admin",
		   			password : "admin"
		   		};
		   	}		   	

		    console.log('get asset details: ', requestUrl);
			self.request(options, function(error, response, body) {
				if(error) { 
					return console.error(error);
				}
				if(response.statusCode == 200) {
					console.log('asset details returned');
					return callback(response.body);
				} else {
					console.log('request failed');
					return callback("failed to get asset details: ", response.statusCode);
				}
			});			
		});
	},

	export : function() {
		exports.validateRequest = this.extensions.bind(this.validateRequest, this);
		exports.getAsset = this.extensions.bind(this.getAsset, this);
	}	
}

Detailer.export();