/**
 * Main application routes
 */

'use strict';

var errors = require('./components/errors');
var codeProcessor = require('./components/code-processor');
var path = require('path');

module.exports = function(app) {

	// Insert routes below
	// app.use('/api/things', require('./api/thing'));

	app.route('/graph')
		.get(function(req, res, next) {
			var labels = req.query.label;

			if(labels) {
				if(typeof labels === 'string') {
					labels = [labels];
				}
			} else {
				labels = ['Folder'];
			}

			codeProcessor.getGraph(labels)
				.then(function(result){
					res.send(result);
					return;
				})
				.catch(function(err) {
					console.log(err);
					next(err);
				});
		})
		.put(function(req, res, next) {
			codeProcessor.createGraph()
				.then(function(result) {
					res.send(result);
					return;
				})
				.catch(function(err) {
					console.log(err);
					next(err);
				});
		})
		.delete(function(req, res, next) {
			codeProcessor.deleteGraph()
				.then(function(result) {
					res.send(result);
					return;
				})
				.catch(function(err) {
					console.log(err);
					next(err);
				});
		});
	
	// All undefined asset or api routes should return a 404
	app.route('/:url(api|auth|components|app|bower_components|assets)/*')
	 .get(errors[404]);

	// All other routes should redirect to the index.html
	app.route('/*')
		.get(function(req, res) {
			res.sendFile(path.resolve(app.get('appPath') + '/index.html'));
		});
};
