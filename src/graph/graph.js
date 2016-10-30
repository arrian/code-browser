var fs = require('fs'),
	_ = require('lodash');

function merge(left, right) {
	_.each(right, (element, name) => {
		if(left[name] && _.isArray(element) && _.isArray(left[name])) {
			left[name] = _.uniq([...element, ...left[name]]);
		} else {
			left[name] = element;
		}
	});
}

class Link {

	constructor(type, data, source, target) {
		this.type = type;
		this.source = source;
		this.target = target;
		this.weight = 1;

		merge(this, data);
	}

	toJSON() {
		return Object.assign({}, {
			relationship: this.type,
			source: this.source.name,
			target: this.target.name
		}, this.data);
	}

	getSource() {
		return source;
	}

	getTarget() {
		return target;
	}

	getWeight() {
		return this.weight;
	}

}

class Node {

	constructor(name, type, data) {
		this.name = name;
		this.type = type;
		this.links = [];

		merge(this, data);
	}

	addLink(type, data, target) {
		this.links.push(new Link(type, data, this, target));
	}

	getLinks() {
		return this.links;
	}

	toJSON() {
		return Object.assign({}, {
			name: this.name,
			type: this.type
		}, this.data);
	}
}

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
	}

	getNodes() {
		return _.values(this.nodes);
	}

	getLinks() {
		return _.flatten(_.map(this.getNodes(), node => node.getLinks()));
	}

	getNode(name) {
		return this.nodes[name];
	}

	getLink(source, target, type) {
		return _.find(source.getLinks(), link => link.target === target && link.type === type);
	}

	filterNodes(expression) {
		return _.filter(this.getNodes(), node => node.name.toLowerCase().search(new RegExp(expression.toLowerCase())) >= 0);
	}

	parse() {
		throw new Error('Not implemented');
	}

	fromJSON(json) {
		this.name = json.name;
		this.src = json.src;
		this.version = json.version;
		throw new Error('Unimplemented');
	}

	toJSON() {
		return {
			name: this.name,
			src: this.src,
			version: this.version,
			nodes: this.getNodes(),
			links: this.getLinks()
		};
	}

	save(target) {
		return new Promise((resolve, reject) => {
			fs.writeFile(__dirname + '/' + target, this.toJSON(), err => {
				if(err) {
					reject(err);
					return console.log(err);
				}

				resolve();
			});
		});
	}

	load(source) {
		return new Promise((resolve, reject) => {
			fs.readFile( __dirname + '/' + source, (err, data) => {
				if(err) {
					reject(err);
					return console.log(err);
				}

				this.fromJSON(JSON.parse(data.toString()));
				resolve();
			});
		});
	}

	addNode(name, type, data) {
		if(this.nodes[name]) {
			if(type !== this.nodes[name].type) throw new Error('Attempted to merge nodes with different types');
			this.nodes[name].merge(data);
		} else {
			this.nodes[name] = new Node(name, type, data);
		}
	}

	addLink(relationship, sourceName, targetName, data) {
		var sourceNode = this.nodes[sourceName],
			targetNode = this.nodes[targetName];

		if(!sourceNode) throw new Error('Source node for add link invalid');
		if(!targetNode) throw new Error('Target node for add link invalid');

		sourceNode.addLink(relationship, data, targetNode);
	}

	getShortestPath(sourceName, targetName) {
		var sourceNode = this.nodes[sourceName],
			targetNode = this.nodes[targetName],
			searchSet = this.getNodes(),
			distance = {},
			previous = {},
			result = [],
			alt,
			u,
			v;

		if(!sourceNode) throw new Error('Source node for shortest path invalid');
		if(!targetNode) throw new Error('Target node for shortest path invalid');

		_.each(searchSet, node => distance[node.name] = Number.MAX_VALUE);
		distance[sourceName] = 0;

		while(searchSet.length > 0) {
			u = _.minBy(searchSet, node => distance[node.name]);
			_.pull(searchSet, u);
			_.each(u.getLinks(), link => {
				v = link.getTarget();
				if(_.includes(searchSet, v)) {
					alt = distance[u.name] + link.getWeight();
					if(alt < distance[v.name]) {
						distance[v.name] = alt;
						previous[v.name] = u;
					}
				}
			});
		}

		while(previous[u.name]) {
			result.push(u);
			u = previous[u.name];
		}
		result.push(u);
		return result;
	}

	getCycles() {

		return [];
	}

	endsWith(str, suffix) {
		return str.indexOf(suffix, str.length - suffix.length) !== -1;
	}
}

module.exports = {
	Graph
};
