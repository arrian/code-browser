
const configuration = (state = { projects: [] }, action) => {
	switch(action.type) {
	case 'REFRESH_PROJECTS': 
		return Object.assign({}, state, { projects: action.projects });
	default:
		return state;
	}
}

export default configuration
