import elasticlunr from 'elasticlunr'
import { each, flatten, filter, uniq, difference, intersection } from 'lodash'
import { Graph, alg } from 'graphlib'

export const refreshProjects = (projects) => ({
	type: 'REFRESH_PROJECTS',
	projects
});

export function loadProjects() {
  return (dispatch, getState) => {
  	let codeGraph = { text: 'Code Graph 0.1', value: './code-graph.json' },
  		yuiGraph = { text: 'YUI 3', value: './yui.json' },
  		fhirValidatorGraph = { text: 'FHIR Validator  0.5', value: './fhir-validator.json' };

  	dispatch(refreshProjects([
  		codeGraph,
  		fhirValidatorGraph,
  		yuiGraph
  	]));

  	dispatch(loadGraph(codeGraph));
  }
};

export const selectProject = (project) => ({
	type: 'SELECT_PROJECT',
	project: { value: project }
});


function createIndex() {
	elasticlunr.clearStopWords();	
	return elasticlunr(function () {
		this.addField('name');
		this.setRef('id');
	});
}

var index = createIndex();

export const refreshGraph = (nodes, links) => {
	index = createIndex();

	let nodeMap = {};
	let linkMap = {};

	nodes.forEach(node => {
		node.linkCount = 0;
		nodeMap[node.id] = node;
	});
	links.forEach(link => {
		if(nodeMap[link.source] && nodeMap[link.target]) {
			nodeMap[link.source].linkCount++;
			nodeMap[link.target].linkCount++;
			linkMap[link.id] = link;
		}
	});

	nodes.forEach(node => index.addDoc({
		id: node.id,
		name: node.name.replace(/\//g, ' ')
	}));

	return {
		type: 'REFRESH_GRAPH',
		nodes: nodeMap,
		links: linkMap
	}
};

export function loadGraph(project) {
  return (dispatch, getState) => {
  	if(project) {
	  	dispatch(selectProject(project.value));
	  	return fetch(project.value).then(response => response.json()).then(json => {
	  		dispatch(refreshGraph(json.nodes, json.links));
	  		dispatch(searchGraph(getState().graph.query));
	  	});
  	} else {
  		dispatch(selectProject(null));
  	}
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


function getCycles(graph) {
	const g = new Graph({ directed: true });

	each(graph.nodes, (node, id) => g.setNode(id));
	each(graph.links, (link, id) => g.setEdge(link.source, link.target, id));

	return flatten(alg.findCycles(g));
}

function getOrphans(graph) {
	const linked = {};
	each(graph.links, (link, id) => {
		linked[link.source] = true;
		linked[link.target] = true;
	});

	const nodes = filter(graph.nodes, (node, id) => {
		return !linked[id];
	});

	return nodes.map(node => node.id);
}

function getParents(results, graph) {
	const resultMap = {};
	const parentsMap = {};
	const parents = [];
	results.forEach(result => resultMap[result] = true);

	each(graph.links, (link, id) => {
		if(resultMap[link.target] && !resultMap[link.source] && !parentsMap[link.source]) {
			parents.push(link.source);
			parentsMap[link.source] = true;
		}
	});

	return parents;
}

function getChildren(results, graph) {
	const resultMap = {};
	const childrenMap = {};
	const children = [];
	results.forEach(result => resultMap[result] = true);

	each(graph.links, (link, id) => {
		if(resultMap[link.source] && !resultMap[link.target] && !childrenMap[link.target]) {
			children.push(link.target);
			childrenMap[link.target] = true;
		}
	});

	return children;
}


function getNeighbours(results, graph) {
	const parents = getParents(results, graph);
	const children = getChildren(results, graph);
	let neighbours = uniq([ ...parents, ...children ]);

	return neighbours;
}

export function searchGraph(query) {
  return (dispatch, getState) => {
    dispatch(queryGraph(query))
    
    return new Promise((resolve, reject) => {
    	const graph = getState().graph;
    	const searchMethod = graph.searchMethod;
    	try {
    		let primary = search(graph.nodes, query);
    		let secondary = [];
    		let errors = [];

    		if(searchMethod === SearchMethod.NEIGHBOURS) {
				secondary = getNeighbours(primary, graph);
    		} else if(searchMethod === SearchMethod.PARENTS) {
				secondary = getParents(primary, graph);
    		} else if(searchMethod === SearchMethod.CHILDREN) {
				secondary = getChildren(primary, graph);
    		} else if(searchMethod === SearchMethod.CYCLES) {
				errors = intersection(primary, getCycles(graph));
				//secondary = difference(primary, errors);
				primary = [];
    		} else if(searchMethod === SearchMethod.ORPHANS) {
    			errors = intersection(primary, getOrphans(graph));
    			//secondary = difference(primary, errors);
				primary = [];
    		}
			
			const results = { primary, secondary, errors };

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

export const updateSearchMethod = (method) => ({
	type: 'SEARCH_METHOD',
	method
});

export function searchMethod(method) {
  return (dispatch, getState) => {
    dispatch(updateSearchMethod(method))
    dispatch(searchGraph(getState().graph.query));
  }
};

export const SearchMethod = {
	NEIGHBOURS: 'NEIGHBOURS',
	CHILDREN: 'CHILDREN',
	PARENTS: 'PARENTS',
	PATH: 'PATH',
	CYCLES: 'CYCLES',
	ORPHANS: 'ORPHANS'
};

