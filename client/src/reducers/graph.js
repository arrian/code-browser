import { SearchMethod } from '../actions'

const DEFAULT_RESULTS = { primary: [], secondary: [], errors: [] };


const graph = (state = { project: {}, nodes: {}, links: {}, query: '', results: DEFAULT_RESULTS, error: false, loading: true, selection: null, scale: 1.0, searchMethod: SearchMethod.NEIGHBOURS, zoom: 1.0, x: 0, y: 0 }, action) => {
	switch(action.type) {
	case 'SELECT_PROJECT':
		return Object.assign({}, state, { project: action.project });
	case 'REFRESH_GRAPH':
		return Object.assign({}, state, { nodes: action.nodes, links: action.links, results: DEFAULT_RESULTS, loading: false });
	case 'QUERY_GRAPH':
		return Object.assign({}, state, { query: action.query, loading: true });
	case 'RESULT_GRAPH':
		if(action.query === state.query) return Object.assign({}, state, { results: action.nodes, loading: false });
		return state;
	case 'ERROR_GRAPH':
		return Object.assign({}, state, { error: true, loading: false });
	case 'SELECT_NODE':
		return Object.assign({}, state, { selection: action.selection });
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
	case 'SEARCH_METHOD':
		return Object.assign({}, state, { searchMethod: action.method });
	default:
		return state;
	}
}

export default graph
