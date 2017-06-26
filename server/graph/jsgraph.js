var fs = require('fs'),
	path = require('path'),
	detect = require('detect-import-require'),
	acorn = require('acorn-jsx'),
	walk = require('walk'),
	glob = require('glob'),
	_ = require('lodash'),
	tree = require('directory-tree'),
	Graph = require('./Graph').Graph;

function parseJSX(text) {
	return acorn.parse(text, {
	  ecmaVersion: 6,
	  sourceType: 'module',
	  allowReserved: true,
	  allowReturnOutsideFunction: true,
	  allowHashBang: true,
	  plugins: {
	    jsx: true
	  }
	});
}

class JSGraph extends Graph {
	constructor(name, src, version) {
		super(name, 'js', src, version);
	}

	parse() {
		return this.collect().catch(error => console.log('Error: ' + error));
	}

	collect() {
		let walker,
			results;

		return new Promise((resolve, reject) => {
			walker = walk.walk(this.src, {});

			walker.on("directories", (rootPath, dirStatsArray, next) => {
				next();
			});

			walker.on('file', (rootPath, fileStats, next) => {

				if(fileStats.name.endsWith('.js')) {
					let name = path.join(rootPath, fileStats.name);
					// console.log(`source: root… ${rootPath}, file… ${fileStats.name}, join… ${name}`);
					this.addNode(name.replace(/\.[^/.]+$/, ""), name.split('.').pop() || 'file', {});
					fs.readFile(name, 'utf8', (err, data) => {
						if(err) {
							console.log(err);
						} else {
							try {
								results = detect(parseJSX(data));
								results.forEach(target => {
									let targetName = target.startsWith('.') ? path.join(rootPath, target) : target;
									// console.log(`target: root… ${rootPath}, file… ${target}, join… ${targetName}`);
									this.addLink('uses', name.replace(/\.[^/.]+$/, ""), targetName.replace(/\.[^/.]+$/, ""))
								});	
							} catch(exception) {
								console.log(exception);
								console.log(name);
								console.log(data);
							}
						}

						next();
					});
				} else {
					next();
				}
			});

			walker.on('errors', (rootPath, nodeStatsArray, next) => {
				console.log('error');
				next();
			});

			walker.on('end', () => {
				console.log('done');
				resolve();
			});
		});
	}
}

module.exports = {
	JSGraph
};
