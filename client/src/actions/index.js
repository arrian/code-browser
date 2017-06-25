import elasticlunr from 'elasticlunr'

function createIndex() {
	elasticlunr.clearStopWords();	
	return elasticlunr(function () {
		this.addField('name');
		this.setRef('name');
	});
}

var index = createIndex();

export const refreshGraph = (nodes, links) => {
	index = createIndex();
	nodes.forEach(node => index.addDoc({ name: node.name }));

	let nodeMap = {};
	let linkMap = {};

	nodes.forEach(node => {
		node.linkCount = 0;
		nodeMap[node.name] = node;
	});
	links.forEach(link => {
		nodeMap[link.source].linkCount++;
		nodeMap[link.target].linkCount++;

		link.name = link.source + ' -> ' + link.target;
		linkMap[link.name] = link;
	});

	return {
		type: 'REFRESH_GRAPH',
		nodes: nodeMap,
		links: linkMap
	}
};

export function loadGraph(json) {
  return (dispatch, getState) => {
  	return fetch(json).then(response => response.json()).then(json => {
  		dispatch(refreshGraph(json.nodes, json.links));
  		dispatch(searchGraph(getState().graph.query));
  	});
  }
};

export const queryGraph = (query) => ({
	type: 'QUERY_GRAPH',
	query
});

export const resultGraph = (query, nodes) => ({
	type: 'RESULT_GRAPH',
	nodes,
	query
});

export const errorGraph = () => ({
	type: 'ERROR_GRAPH'
})

function search(nodes, query) {
	return query === '' ? Object.keys(nodes) : index.search(query, {expand: true}).map(result => result.ref);
}

export function searchGraph(query) {
  return (dispatch, getState) => {
    dispatch(queryGraph(query))
    
    return new Promise((resolve, reject) => {
    	const graph = getState().graph;
    	try {
			const results = search(graph.nodes, query);
			setTimeout(() => {
				dispatch(resultGraph(query, results));
				resolve();
			}, 10);
		} catch(error) {
			dispatch(errorGraph());
			reject(error);
		}
    });
  }
}

export const selectNode = (nodeName) => ({
	type: 'SELECT_NODE',
	selection: nodeName
});

export const expandNode = (nodeName) => ({
	type: 'EXPAND_NODE',
	selection: nodeName
});

export const collapseNode = (nodeName) => ({
	type: 'COLLAPSE_NODE',
	selection: nodeName
});

export const zoom = (zoom) => ({
	type: 'ZOOM',
	zoom
});

export const move = (x, y) => ({
	type: 'MOVE',
	x,
	y
});

export const scaleNodes = (scale) => ({
	type: 'SCALE_NODES',
	scale
});

export const colourNodes = (method) => ({
	type: 'COLOUR_NODES',
	method
});

export const ColourMethod = {
	NONE: 'NONE',
	TEMPERATURE: 'TEMPERATURE',
	MASS: 'MASS',
	STATUS: 'STATUS'
};

