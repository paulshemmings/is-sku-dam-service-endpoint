var DamUploader = {

	extensions : require('../helpers/Extensions'),
	detailer : require('../components/Detailer'),
	modifier : require('../components/Modifier'),
	uploader : require('../components/Uploader'),

	/*
	 * Upload or update an asset
	 */ 

	uploadFile : function(req, res, path, content) {

		if (content == "") {
			res.end("no JSON submitted in form");
			return;
		}	

		var requestJSON = JSON.parse(content);
		var parseJson = this.uploader.validateRequest(requestJSON)
		if ( parseJson != "success") {
			res.end("Failed to validate json: " + parseJson);
			return;
		}
		
		this.uploader.uploadAsset(requestJSON, function(response) {
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});						
			res.end(response);					
		});
	},

	/*
	 * Get details of an existing asset
	 */

	getFile : function(req, res, path, content) {

		
		if (content == "") {
			res.end("no JSON submitted in form");
			return;
		}		

		var requestJSON = JSON.parse(content);
		var parseJSON = this.detailer.validateRequest(requestJSON);
		if ( parseJSON != "success") {
			res.end("Failed to validate json: " + parseJSON);
			return;
		}

		this.detailer.getAsset(requestJSON, function(response) {
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});													
			res.end(response);
		});

	},	

	/*
	 * Get details of an existing asset
	 */

	modifyFile : function(req, res, path, content) {

		
		if (content == "") {
			res.end("no JSON submitted in form");
			return;
		}		

		var requestJSON = JSON.parse(content);
		var parseJSON = this.modifier.validateRequest(requestJSON);
		if ( parseJSON != "success") {
			res.end("Failed to validate json: " + parseJSON);
			return;
		}

		this.modifier.modifyAsset(requestJSON, function(response) {
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});													
			res.end(response);
		});

	},

	/*
	 * Export service endpoints
	 */

	export : function() {
		exports.uploadFile = this.extensions.bind(this.uploadFile, this);
		exports.getFile = this.extensions.bind(this.getFile, this);
		exports.modifyFile = this.extensions.bind(this.modifyFile, this);
	}
}

DamUploader.export();