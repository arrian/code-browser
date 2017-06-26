var fs = require('fs'),
	walk = require('walk'),
	glob = require('glob'),
	_ = require('lodash'),
	tree = require('directory-tree'),
	Graph = require('./Graph').Graph;

class FileGraph extends Graph {
	constructor(name, src, version) {
		super(name, 'file', src, version);
	}

	parse() {
		return this.collect().catch(error => console.log('Error: ' + error));
	}

	collect() {
		return new Promise((resolve, reject) => {
			this.addRecursive(tree(this.src));
			console.log('done');
			resolve();
		});
	}

	addRecursive(structure) {
		this.addNode(structure.path, 'folder', { friendlyName: structure.name, size: structure.size });

		if(structure.children) {
			_.each(structure.children, child => {
				this.addLink('extends', child.path, structure.path);
				this.addRecursive(child);
			});
		}
	}
}

module.exports = {
	FileGraph
};
