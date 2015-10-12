var fs = require('fs'),
	path = require('path');

var parser_util = require('./parser_util');

var LABEL_FILE = 'File',
	LABEL_FOLDER = 'Folder';

var RELATIONSHIP_IS_PARENT = 'IS_PARENT';


function findFilesBySuffix(files, includeSuffix, excludeName) {
	var result = [];

	if(files.label === LABEL_FOLDER) {
		files.children.forEach(function(file) {
			result = result.concat(findFilesBySuffix(file, includeSuffix, excludeName));
		});
	} else if(files.label === LABEL_FILE) {
		if(includeSuffix && parser_util.endsWith(files.name, includeSuffix)) {
			if(excludeName && files.name === excludeName) {
				return result;
			}
			result.push(files);
		}
	}
	return result;
}

function findFile(files, filePath) {
	var filePathSplit;

	if(typeof filePath === 'string') {
		filePathSplit = filePath.replace(files.path, '').split(path.sep);
		filePathSplit.unshift(files.name);
	} else {
		filePathSplit = filePath;
	}

	filePathSplit = filePathSplit.filter(function(item) {
		return item !== '.' && item.trim() !== '';
	});

	// console.log('----------------finding: ' + filePathSplit);

	return findFileRecursive(files, filePathSplit);
}

function findFileRecursive(files, filePath) {
	var pathItem;

	pathItem = filePath.shift();

	if(files.hasOwnProperty('name') && files.name.trim() === pathItem.trim()) {
		// console.log('compare success for: ' + files.name + ' with ' + pathItem);
		if(filePath.length === 0) return files;
		if(files.hasOwnProperty('children')) {
			var found = null;
			files.children.some(function(child) {
				var childFound = findFileRecursive(child, filePath.slice());
				if(childFound) {
					found = childFound;
					return true;
				}
				return false;
			});
			// console.log('returning: ' + found);
			return found;
		}
	}
	return null;
}

function ParserFile(inputDirectories) {
	
	function getDirectories(directories) {
		var result = {};

		for(var index in directories) { 
			if (directories.hasOwnProperty(index)) {
				var directory = directories[index];
				result[index] = getDirectory(directory);
			}
		}
		return result;
	}

	function getDirectory(filename) {
		var stats = fs.lstatSync(filename),
			info = {
				path: filename,
				name: path.basename(filename)
			};

		if (stats.isDirectory()) {
			info.label = LABEL_FOLDER;
			info.children = fs.readdirSync(filename).map(function(child) {
				return getDirectory(filename + '/' + child);
			});
		} else {
			info.label = LABEL_FILE;

			if(parser_util.endsWith(info.name, '.js')) {
				info.content = fs.readFileSync(info.path, 'utf8');
			}
		}

		return info;
	}


	function convertDirectoriesToGraph(directories) {
		var result = {nodes:[], relationships:[]};

		for(var index in directories) { 
			if (directories.hasOwnProperty(index)) {
				var directory = directories[index];
				result = parser_util.combineGraphs([result, convertFilesToGraph(directory)]);
			}
		}

		return result;
	}

	function convertFilesToGraph(files, parent) {
		var graph = { nodes: [], relationships: [] };

		files.node = {
			label: files.label,
			path: files.path,
			name: files.name,

		};
		if(files.content) files.node.content = files.content;
		graph.nodes.push(files.node);

		if(parent) {
			graph.relationships.push(parser_util.createRelationship(parent, RELATIONSHIP_IS_PARENT, files.node, {}));
		} else {
			files.node.root = true;
		}

		if(files.label === LABEL_FOLDER) {
			files.children.forEach(function(file) {
				graph = parser_util.combineGraphs([graph, convertFilesToGraph(file, files.node)]);
			});
		}

		return graph;
	}

	this.storeContentExtension = ['.js', '.java', '.scss', '.css'];
	this.inputDirectories = inputDirectories;
	this.directories = getDirectories(this.inputDirectories);
	this.graph = convertDirectoriesToGraph(this.directories);
}

function parse(inputDirectories) {
	return new ParserFile(inputDirectories);
}

module.exports = {
	parse: parse,
	findFilesBySuffix: findFilesBySuffix,
	findFile: findFile
};





