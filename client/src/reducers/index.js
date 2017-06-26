import { combineReducers } from 'redux'
import graph from './graph'
import configuration from './configuration'

const graphApp = combineReducers({
  graph,
  configuration
})

export default graphApp
