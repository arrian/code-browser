var esprima = require('esprima'),
	yuidocjs = require('yuidocjs'),
	fs = require('fs'),
	mkdirp = require('mkdirp'),
	walk = require('walk'),
	glob = require('glob'),
	_ = require('lodash'),
	Graph = require('./Graph').Graph;

class YUIGraph extends Graph {
	constructor(name, src, version) {
		super(name, 'yui', src, version);
	}

	addNode(name, type, data) {
		super.addNode(name.replace(/^(Y\.)/,""), type, data);
	}

	parse() {
		return this.collect().then(analysis => {
			this.addNode('Base', 'class');
			this.addNode('App.Base', 'class', { extend: 'Base' });
			this.addNode('Model', 'class', { extend: 'Base' });
			this.addNode('ModelList', 'class', { extend: 'Base' });
			this.addNode('View', 'class', { extend: 'Base' });
			this.addNode('Widget', 'class', { extend: 'Base' });
			this.addNode('App', 'class', { uses: ['View'], extend: 'App.Base' });
			this.addNode('Plugin.Base', 'class', { extend: 'Base' });

			this.createNodes(analysis);
			this.createLinks(analysis);
			console.log('done');
		}).catch(error => console.log('Error: ' + (error.stack || error)));
	}

	collect() {
		return new Promise((resolve, reject) => {
			var walker = walk.walk(this.src, { followLinks: false }),
				yuidoc = (new yuidocjs.YUIDoc({
					paths: [ this.src ],
					quiet: true
				})).run(),
				parsed = {},
				dependencies = {};

			walker.on('file', (root, stat, next) => {
				var filename = root + '/' + stat.name;

				if(this.endsWith(filename, '.js')) {
					parsed[stat.name] = JSON.stringify(esprima.parse(fs.readFileSync(filename).toString()));					
				} else if (this.endsWith(filename, '.json') && !this.endsWith(filename, 'build.json')) {
					dependencies[stat.name] = JSON.parse(fs.readFileSync(filename).toString());
				}

				next();
			});

			walker.on('end', () => {
				resolve({
					yuidoc,
					dependencies,
					parsed
				});
			});
		});
	}

	createNodes(analysis) {
		var extend,
			uses;

		_.each(analysis.yuidoc.classes, info => {

			extend = info.extends ? info.extends.replace(/^(Y\.)/,"") : null;
			uses = info.uses || [];

			_.each(uses, use => {
				this.addNode(use, 'class');
			});

			if(extend) this.addNode(extend, 'class');

			if(!info.name) {
				console.log(`${info} has no name`);
				return;
			}

			this.addNode(info.name, 'class', {
				uses,
				extend,
				file: info.file,
				description: info.description,
				module: info.module
			});
		});
	}

	createLinks(analysis) {
		var moduleToClasses = this.getModuleToClassMap(analysis.yuidoc.files),
			moduleDependencies = this.getModuleDependencies(analysis.dependencies),
			sourceClasses,
			targetClasses;

		_.each(moduleDependencies, (moduleRequires, sourceModuleName) => {
			sourceClasses = moduleToClasses[sourceModuleName] || [];

			_.each(moduleRequires, targetModuleName => {
				targetClasses = moduleToClasses[targetModuleName] || [];
				_.each(sourceClasses, sourceClass => {
					_.each(targetClasses, targetClass => {
						this.addNode(targetClass, 'class');
					});
					this.addNode(sourceClass, 'class', { depends: targetClasses });
				});
			});
		});

		_.each(this.getNodes(), node => {
			if(node.uses) _.each(node.uses, use => this.addLink('uses', node.name, use));
			if(node.depends) _.each(node.depends, depend => this.addLink('dependencies', node.name, depend));
			if(node.extend) this.addLink('extends', node.name, node.extend);
		});
	}

	getModuleToClassMap(files) {
		var moduleToClasses = {},
			module;

		_.each(files, file => {
			module = file.name.split('\\').pop().split('/').pop().replace(/\.[^/.]+$/, '');
			moduleToClasses[module] = Object.keys(file.classes);
		});

		moduleToClasses['view'] = ['View'];
		moduleToClasses['model'] = ['Model'];
		moduleToClasses['promise'] = ['Promise'];
		moduleToClasses['model-list'] = ['ModelList'];
		moduleToClasses['model'] = ['Model'];
		moduleToClasses['transition'] = ['Transition'];
		moduleToClasses['plugin'] = ['Plugin'];
		moduleToClasses['panel'] = ['Panel'];
		moduleToClasses['app'] = ['App'];
		moduleToClasses['base'] = ['Base'];
		moduleToClasses['io-base'] = ['IO'];
		moduleToClasses['cookie'] = ['Cookie'];
		moduleToClasses['datasource-io'] = ['DataSource.IO'];
		moduleToClasses['handlebars'] = ['Handlebars'];

		return moduleToClasses; 
	}

	getModuleDependencies(files) {
		var moduleDependencies = {},
			name;

		_.each(files, dependency => {
			_.each(dependency, (module, name) => {
				if(module.requires) {
					if(!moduleDependencies[name]) {
						moduleDependencies[name] = module.requires;
					} else {
						moduleDependencies[name] = [...moduleDependencies[name], ...module.requires];
					}
				}
			});
		});

		return moduleDependencies;
	}
}

module.exports = {
	YUIGraph
};
