var config = require('../../config/environment');

var parser_yui = require('./parser_yui'),
	parser_file = require('./parser_file'),
	parser_git = require('./parser_git'),
	parser_util = require('./parser_util');

var nodegit = require('nodegit');
var rimraf = require('rimraf');
var neo4j = require('seraph')(config.neo4j);

var clone = nodegit.Clone.clone;

// var REPOSITORY_URL = config.repository.github.url;
// var SOURCE_DIRECTORY = 'target-folder';

function insertGraphData(data) {
	var txn = neo4j.batch(),
		linker = {},
		nodeClone;
	// console.log('NODES');
	data.nodes.forEach(function(node) {
		nodeClone = JSON.parse(JSON.stringify(node));
		// delete nodeClone.label;

		var dbNode = txn.save(nodeClone);
		txn.label(dbNode, node.label);

		node.dbNode = dbNode;

		console.log(dbNode);
	});
	// console.log('RELATIONSHIPS');
	data.relationships.forEach(function(relationship) {
		// console.log('source: ' + relationship.source.dbNode + ' with label ' + relationship.source.label);
		// console.log('target: ' + relationship.target.dbNode + ' with label ' + relationship.target.label);

		txn.relate(relationship.source.dbNode, relationship.type, relationship.target.dbNode, relationship.data);
	});

	txn.commit(function(err, results) {
		if(err) {
			throw err;
		}
		console.log('successful transaction');
		// console.log(results);
	});
}

function getGraphData(labels) {
	var getAll = 'MATCH (n)-[r]-(t) '
			   + 'WHERE n:' + labels.join(' OR n:') + ' '
			   + 'RETURN collect(distinct n) AS nodes,collect(distinct r) AS relationships';
	console.log(getAll);
	return new Promise(function(resolve, reject) {
		neo4j.query(getAll, function(err, result) {
			if(err) reject(err);
			resolve(result);
		});
	});
}

function deleteGraphData() {
	var clearAll = 'MATCH (n)'
				 + 'OPTIONAL MATCH (n)-[r]-()'
				 + 'DELETE n,r';
	console.log(clearAll);
	return new Promise(function(resolve, reject) {
		neo4j.query(clearAll, function(err, result) {
			if(err) reject(err);
			resolve(result);
		});
	});
}

// function cleanSource() {
// 	return new Promise(function(resolve, reject) {
// 		rimraf(SOURCE_DIRECTORY, function(err) {
// 			if(err) {
// 				reject(err);
// 			}
// 			resolve();
// 		});
// 	});
// }

// function cloneSource() {
// 	return clone(REPOSITORY_URL, SOURCE_DIRECTORY, null);
// }

function createGraphData() {
	var fileData,
		yuiData,
		directory,
		graph;

	return new Promise(function(resolve, reject) {

		if(!config.source) reject('No source directories provided. Add a source directory to the configuration.');
		
		fileData = parser_file.parse(config.source);
		graph = fileData.graph;

		directory = fileData.directories.yui;
		if(directory) {
			yuiData = parser_yui.parse(directory);
			graph = parser_util.combineGraphs([graph, yuiData.graph]);
		} else {
			reject('No YUI files found. Check the configured YUI source directory.');
			return;
		}

		insertGraphData(graph);

		resolve();
	});
}




function onCommit(data) {

}

function onBuild(data) {

}

function onEdit(data) {

}

module.exports = {
	createGraph: createGraphData,
	deleteGraph: deleteGraphData,
	getGraph: getGraphData
};




// Ideas
// - Show knowledge areas... show the people who know the most about sections of the code... ie. people who wrote/maintained the most
// - Show blame... show the people to 
// Show time spent on different areas of the source code





