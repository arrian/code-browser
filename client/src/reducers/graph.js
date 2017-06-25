
const graph = (state = { nodes: {}, links: {}, query: '', results: [], error: false, loading: true, selection: null, scale: 1.0, colourMethod: null, zoom: 1.0, x: 0, y: 0 }, action) => {
	switch(action.type) {
	case 'REFRESH_GRAPH':
		return Object.assign({}, state, { nodes: action.nodes, links: action.links, results: [], loading: false, isMore: false });
	case 'QUERY_GRAPH':
		return Object.assign({}, state, { query: action.query, loading: true });
	case 'RESULT_GRAPH':
		if(action.query === state.query) return Object.assign({}, state, { results: action.nodes, loading: false });
		return state;
	case 'ERROR_GRAPH':
		return Object.assign({}, state, { error: true, loading: false });
	case 'EXPAND_NODE':
		return state;
	case 'COLLAPSE_NODE':
		return state;
	case 'ZOOM':
		return state;
	case 'MOVE':
		return state;
	case 'SCALE_NODES':
		return Object.assign({}, state, { scale: action.scale });
	case 'COLOUR_NODES':
		return Object.assign({}, state, { colourMethod: action.method });
	default:
		return state;
	}
}

export default graph
