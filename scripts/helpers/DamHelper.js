var DamHelper = {

		request : require('request'),
	 	tough : require('tough-cookie'),
	 	fs : require('fs'),
	 	FormData : require('form-data'),
	 	https : require('https'), 
	 	extensions : require('./Extensions'),

	generateNewAssetPath : function(params) {
		return "/content/dam/nike/sales"
			+ "/multimedia"
			+ "/" + params.year
			+ "/" + params.month
			+ "/" + params.day
			+ "/" + params.hour
			+ "/" + params.minutes
	}, 	

	generateAssetPath : function (host, port, cookieJar, assetName, callback) {
		var requestUrl = (host == "localhost" ? 'http://' : 'https://')
			+ host
			+ ':' + port
			+ '/bin/assetlibrary/checkExistingFilename'
	    	+ '?assetFilename=' + assetName;

	   	var options = {
	   		url: requestUrl,   	
	   		headers: {
		    	'Cookie' : cookieJar.getCookieString('https://www.nike.net')
			},
	   		"rejectUnauthorized": false
	   	};

	   	if (host == "localhost") {
	   		options.auth = {
	   			username : "admin",
	   			password : "admin"
	   		};
	   	}

	    console.log('check if asset exists: ', requestUrl);
		this.request(options, function(error, response, body) {
			if(error) { 
				return console.error(error);
			}
			if(response.statusCode == 200) {
				console.log('exist response: ', response.body)
				callback({
					assetPath : body.replace("/" + assetName,''),
					overriding : body == "NOT_FOUND" ? "false" : "true"
				});
			} else {
				return console.log("failed to check if asset exists with ", response.statusCode);
			}
		});
	},


	generateRequestPath : function (assetPath, assetName, renameAsset, overriding) {
		return assetPath 
			+ ".uploadasset.html"
		 	+ "?format=json"
			+ "&newFileName=" + encodeURIComponent(renameAsset) 
			+ "&filePath=" + encodeURIComponent(assetPath + "/" + assetName)
			+ "&isOverriding=" + overriding;	
	},

	generateApiRequestPath : function(assetPath, assetName, renameAsset, overriding) {
		return "/bin/assetlibrary/api-assetupsert"
		 	+ "?format=json"
			+ "&assetPath=" + encodeURIComponent(assetPath + "/" + renameAsset) 
			+ (overriding == "false" ? "" : "&existingAsset=" + encodeURIComponent(assetPath + "/" + assetName));
	},

	generateMetaData : function(meta) {

		var now = new Date();
		var expDate = new Date();
		expDate.setMonth(now.getMonth() + 18);

		return  {
	        tags: meta.tags,
	        styles: meta.styles || "",
	        collections: meta.collections || 'No',
	        styleColors: meta.styleColors || "",
	        description: meta.description || "",
	        language: meta.language || "EN",
	        expirationDate: meta.expirationDate ||  expDate.getFullYear() + '-' + expDate.getMonth() + '-' + expDate.getDate(),
	        availableDate: meta.availableDate || now.getFullYear() + '-' + now.getMonth() + '-' + now.getDate()
	    };
	},

	generateUploadOptions : function(host, port, path, cookieJar) {
		return {
			host: host,
			port: port,
		    path: path,
			headers: {
		    	'Content-Disposition' : 'multipart/form-data;UTF-8',
		    	'Cookie' : cookieJar.getCookieString('https://www.nike.net')
			},
			protocol: (host == "localhost" ? 'http:' : 'https:'),
			"rejectUnauthorized": false,
			auth: host == "localhost" ? "admin:admin" : ""
		};
	},

	/*
	 * Create a read stream to the file for upload
	 */

	generateFileReadStream : function(fullFilePath) {
		console.log('create the read stream to the local file');
		var readStream = this.fs.createReadStream(fullFilePath);
		readStream.on('end', function() {
			console.log('file pipe has closed');
		});	
		readStream.on('error', function(err) {
			console.log('failed to open the stream to the file');
		});
		readStream.on('open', function () {
			console.log('file pipe has been opened');
		});	
		return readStream;	
	},

	/*
	 * Send Request
	 */

	uploadFile : function(uploadOptions, metaData, fullFilePath, callback) {

		// build form data

		var form = new this.FormData();
		form.append('file', this.generateFileReadStream(fullFilePath));
		for(var key in metaData) {
			console.log('append to form ' + key + " : " + metaData[key]);
			form.append(key, metaData[key]);
		}

		form.submit(uploadOptions, function(err, res) {
			if(err){
				return console.error(err);
			} 
			var data = '';
			res.on('data', function(chunk) {
				data += chunk.toString();
			});
			res.on('end', function() {
				callback(data);
			});		
			console.log('status code', res.statusCode);
		});	
		
	},

	/*
	 * Make authentication request. Return cookie jar containing authentication cookies
	 */

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
	            return callback(error);
	        }      
	        console.log('authentication returned: [' + response.statusCode + '] ', response.body);        
	        return callback("", cookieJar);
		});
	},

	/* 
	 * Make the call to upload the file
	 */

	executeFileUpload : function(param, callback) {

		// build the URL		
		var requestPath = this.generateApiRequestPath(param.asset.destination, param.asset.name, param.asset.rename, param.asset.overriding);
		console.log('requestPath: ', requestPath);

		// build upload POST request options
		var uploadOptions = this.generateUploadOptions(param.host, param.port, requestPath, param.cookieJar);	
		console.log("upload to: ", param.host, param.port);

		// upload the file
		this.uploadFile(uploadOptions, param.metaData, param.asset.path, function(fileUploadResponseData) {
			console.log('finished uploading the asset');
			callback(fileUploadResponseData);
		});

	},	

	/*
	 * Upload the asset
	 */

	uploadAsset : function(param, callback) {

		// get the authenticaion cookies
		var self = this;		
		console.log('authenticate: ', param.username);
		console.log('using endpoint: ', param.authenticationServiceEndPoint);
		self.generateAuthenticationCookies(param.username, param.password, param.authenticationServiceEndPoint, function(err, cookieJar) {

			if(err || !cookieJar.getCookies) {
				return callback(err);
			}
			var cookieLength = cookieJar.getCookies('https://www.nike.net').length;
			console.log('authentication returned ' + cookieLength + ' cookies');	
			if (cookieLength < 1) {
				return callback("failed to authenticate");
			}

			// build the meta data to associate with file
			var metaData = self.generateMetaData({
				tags : param.tags,
				styles : param.styles,
				collections : param.collections,
				stylecolors : param.stylecolors,
				description : param.description,
				language : param.language,
				expirationDate : param.expirationDate,
				availableDate : param.availableDate
 			});
			console.log('metadata: ', metaData);				

			// check if asset exists
			self.generateAssetPath(param.host, param.port, cookieJar, param.asset.name, function(existData) {

				var newAssetPath = existData.assetPath;

				if (existData.overriding != "true") {
					var now = new Date();
					newAssetPath = self.generateNewAssetPath({
						year: now.getFullYear(),
						month: now.getMonth()+1,
						day: now.getDate(),
						hour: now.getHours(),
						minutes: now.getMinutes()
					});
					console.log('asset does not exist: ', newAssetPath);						
				}

				self.executeFileUpload({
					asset : {
						name : param.asset.name,
						path : param.asset.path,
						rename : param.asset.rename,
						destination : newAssetPath,
						overriding : existData.overriding
					},
					host : param.host,
					port : param.port,
					cookieJar : cookieJar,
					metaData : metaData
				}, callback);

			});

		});
	},


	/* 
	 * Validate the JSON
	 */

	validateJson : function(json) {
		if (!json.authenticationServiceEndPoint || json.authenticationServiceEndPoint == "") return "no authentication service defined";
		if (!json.username || json.username == "") return "No authentication username";
		if (!json.password || json.password == "") return "No authentication password";

		if (!json.tags || json.tags == "") return "No tags";
		//if (!json.description || json.description == "") return "No description";

		if (!json.host || json.host == "") return "No host specified for DAM service endpoint";
		if (!json.asset || json.asset == "") return "No asset defined";
		if (!json.asset.path || json.asset.path == "") return "No path to asset to upload defined";

		if (!json.asset.name || json.asset.name == "") {
			json.asset.name = json.asset.path.split("/")[json.asset.path.split("/").length-1];
		}

		if (!json.asset.rename || json.asset.rename == "") {
			json.asset.rename = json.asset.name;
		}

		return ("success");
	},

	validateGetAssetJson : function(json) {
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
		self.generateAuthenticationCookies(param.username, param.password, param.authenticationServiceEndPoint, function(err, cookieJar) {

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
					return callback("failed to get asset details");
				}
			});			
		});
	},

	export : function() {
		exports.validateJson = this.extensions.bind(this.validateJson, this);
		exports.uploadAsset = this.extensions.bind(this.uploadAsset, this);

		exports.validateGetAssetJson = this.extensions.bind(this.validateGetAssetJson, this);
		exports.getAsset = this.extensions.bind(this.getAsset, this);
	}	
}

DamHelper.export();