var esprima = require('esprima'),
	yuidoc = require('yuidocjs'),
	fs = require('fs'),
	path = require('path');

var parser_util = require('./parser_util');
var parser_file = require('./parser_file');

var LABEL_MODULE = 'Module',
	LABEL_WARNING = 'Warning',
	LABEL_CLASS = 'Class';

var RELATIONSHIP_DEPENDS_ON = 'DEPENDS_ON',
	RELATIONSHIP_IN_FILE = 'IN_FILE',
	RELATIONSHIP_HAS_WARNING = 'HAS_WARNING',
	RELATIONSHIP_EXTENDS_FROM = 'EXTENDS_FROM';

function ParserYUI(directory) {

	function convertWarningsToGraph(files, documentation) {
		// console.log('converting warnings to graph');
		var nodes = [],
			relationships = [],
			warnings = documentation.warnings,
			lastIndex,
			warningPath,
			line,
			result;

		if(warnings) {
			warnings.forEach(function(warning) {
				result = null;
				line = null;
				warningPath = null;

				if(warning.line) {

					lastIndex = warning.line.lastIndexOf(':');
					warningPath = warning.line.substring(0, lastIndex);
					line = warning.line.substring(lastIndex + 1);
					// console.log('warningPath: ' + warningPath.replace(files.path, ''));
					// console.log('with root: ' + files.path);
					result = parser_file.findFile(files, warningPath);
					warning.file = result;
				}

				warning.node = {
					message: warning.message,
					path: warning.line,
					line: line,
					label: LABEL_WARNING
				};
				nodes.push(warning.node);

				if(result) {
					relationships.push(parser_util.createRelationship(result.node, RELATIONSHIP_HAS_WARNING, warning.node, {}));
				}
			});
		}
		// console.log('converting warnings to graph success: ' + JSON.stringify(nodes));
		return { nodes: nodes, relationships: relationships };
	}

	function convertDependenciesToGraph(dependencies) {
		var nodes = [],
			relationships = [],
			module,
			target;

		for (var k in dependencies){
			if (dependencies.hasOwnProperty(k)) {
				module = dependencies[k];

				module.node = {
					label: LABEL_MODULE,
					name: k,
					external: false
				};
				nodes.push(module.node);

				if(!module.requires) module.requires = [];

				// ensure all external dependencies are created
				module.requires.forEach(function(dependency) {
					if(!dependencies.hasOwnProperty(dependency)) {
						dependencies[dependency] = {
							node: {
								label: LABEL_MODULE,
								name: dependency,
								external: true,
							},
							requires: []
						};
						nodes.push(dependencies[dependency].node);
					}
				});
			}
		}

		for (var k in dependencies) {
			if (dependencies.hasOwnProperty(k)) {
				module = dependencies[k];

				if(module.from) {
					relationships.push(parser_util.createRelationship(module.node, RELATIONSHIP_IN_FILE, module.from.node, {}));
				}
				
				module.requires.forEach(function(dependency) {
					if(dependencies.hasOwnProperty(dependency)) {
						target = dependencies[dependency];
						
						relationships.push(parser_util.createRelationship(module.node, RELATIONSHIP_DEPENDS_ON, target.node, {}));
					}
				});
			}
		}

		return { nodes: nodes, relationships: relationships };
	}

	function convertClassesToGraph(files, documentation) {
		var nodes = [],
			relationships = [],
			classes = documentation.classes,
			c,
			file,
			classParent,
			plugin,
			extension;

		Object.keys(classes).forEach(function(className) {
			c = classes[className];
			c.node = {
				label: LABEL_CLASS,
				external: false,
				name: c.name,
				module: c.module,
				namespace: c.namespace,
				file: c.file,
				line: c.line,
				description: c.description,
			};

			c.file = parser_file.findFile(files, c.file);
			
			classParent = c['extends'];
			if(classParent && !classes.hasOwnProperty(classParent)) {
				classes[classParent] = {
					node: {
						name: classParent,
						label: LABEL_CLASS,
						external: true
					},
					file: null
				};
				c['extends'] = classes[classParent];
				nodes.push(c['extends'].node);
			} else {
				c['extends'] = null;
			}
			
			nodes.push(c.node);
			
		});

		Object.keys(classes).forEach(function(className) {
			c = classes[className];
			file = c.file;
			classParent = c['extends'];

			if(file) {
				relationships.push(parser_util.createRelationship(c.node, RELATIONSHIP_IN_FILE, file.node, {}));
			}

			if(classParent) {
				relationships.push(parser_util.createRelationship(c.node, RELATIONSHIP_EXTENDS_FROM, classParent.node, {}));
			}
		});

		return { nodes: nodes, relationships: relationships };
	}

	function convertClassItemsToGraph() {

	}

	function getYUIDoc(directory) {
		var result,
			options;

		// console.log('yui doc for directory: ' + directory + ' with path ...' + directory.path);

		if(!directory || !directory.path) return null;

		options = {
			paths: [ directory.path ],
			external: {
				data: 'http://yuilibrary.com/yui/docs/api/data.json'
			},
			quiet: true
		};

		result = (new yuidoc.YUIDoc(options)).run();

		return result;
	};

	function getDependencies(directory) {
		// console.log('getting yui dependencies');
		var result = {},
			files = parser_file.findFilesBySuffix(directory, '.json', 'build.json'),
			data;

		files.forEach(function(file) {
			data = JSON.parse(fs.readFileSync(file.path, 'utf8'));

			for (var k in data){
				if (data.hasOwnProperty(k)) {
					data[k].from = file;
					result[k] = data[k];
				}
			}
		});
		return result;
	};

	function getGraph(directory, dependencies, documentation) {
		var dependencies = convertDependenciesToGraph(dependencies),
			warnings = convertWarningsToGraph(directory, documentation),
			classes = convertClassesToGraph(directory, documentation),
			result = parser_util.combineGraphs([dependencies, warnings, classes]);
		
		console.log('result: ' + result.nodes.length + ' and ' + result.relationships.length);

		return result;
	};

	this.directory = directory;
	this.dependencies = getDependencies(this.directory);
	this.documentation = getYUIDoc(this.directory);
	this.graph = getGraph(this.directory, this.dependencies, this.documentation);

}

function parse(directory) {
	return new ParserYUI(directory);
}

module.exports = {
	parse: parse
};

