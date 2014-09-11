var DamUploader = {

	extensions : require('../helpers/Extensions'),
	damHelper : require('../helpers/DamHelper'),

	/*
	 * Upload or update an asset
	 */ 

	uploadFile : function(req, res, path, content) {

		var requestJSON = JSON.parse(content);
		if (requestJSON == "") {
			res.end("no JSON submitted in form");
			return;
		}

		var parseJson = this.damHelper.validateJson(requestJSON)
		if ( parseJson != "success") {
			res.end("Failed to validate json: " + parseJson);
			return;
		}
		
		this.damHelper.uploadAsset(requestJSON, function(response) {
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
		var parseJSON = this.damHelper.validateGetAssetJson(requestJSON);
		if ( parseJSON != "success") {
			res.end("Failed to validate json: " + parseJSON);
			return;
		}

		this.damHelper.getAsset(requestJSON, function(response) {
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});													
			res.end(response);
		});

	},	

	export : function() {
		exports.uploadFile = this.extensions.bind(this.uploadFile, this);
		exports.getFile = this.extensions.bind(this.getFile, this);
	}
}

DamUploader.export();