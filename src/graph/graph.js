var mkdirp = require('mkdirp'),
	_ = require('lodash');

class Graph {
	constructor(name, type, src, version) {
		if (new.target === Graph) {
			throw new Error('Cannot construct Graph instances directly');
		}

		this.name = name;
		this.type = type;
		this.src = src;
		this.version = version;
		this.nodes = {};
		this.links = [];

		mkdirp.sync(this.getWorkingDirectory());
	}

	getWorkingDirectory() {
		return `./temp/${this.type}-${this.version}`
	}

	parse() {
		throw new Error('Not implemented');
	}

	toJSON() {
		return {
			name: this.name,
			src: this.src,
			version: this.version,
			nodes: _.values(this.nodes),
			links: _.values(this.links)
		};
	}

	addNode(name, type, data) {
		 var node = Object.assign({
			name,
			type
		}, data);

		if(this.nodes[name]) {
			this.nodes[name] = this.deepMerge(this.nodes[name], node);
		} else {
			this.nodes[name] = node;
		}
	}

	addLink(relationship, source, target, data) {
		this.links.push(Object.assign({
			relationship,
			source,
			target,
			data
		}, data));
	}

	endsWith(str, suffix) {
		return str.indexOf(suffix, str.length - suffix.length) !== -1;
	}

	deepMerge(left, right) {
		var result = Object.assign({}, left);

		_.each(right, (element, name) => {
			if(result[name] && _.isArray(element) && _.isArray(result[name])) {
				result[name] = _.uniq([...element, ...result[name]]);
			} else {
				result[name] = element;
			}
		});
		return result;
	}
}

module.exports = {
	Graph
};
