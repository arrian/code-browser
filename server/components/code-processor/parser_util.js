function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function createRelationship(source, type, target, data) {
	return {
		source: source,
		target: target,
		type: type,
		data: data
	};
}

function combineGraphs(graphs) {
	var result = {nodes: [], relationships: []};

	graphs.forEach(function(graph) {
		result.nodes = result.nodes.concat(graph.nodes);
		result.relationships = result.relationships.concat(graph.relationships);
	});

	return result;
}

module.exports = {
	endsWith: endsWith,
	createRelationship: createRelationship,
	combineGraphs: combineGraphs
};

// function createNode(label, data, ignore) {
// 	return null;
// }