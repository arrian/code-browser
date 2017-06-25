import React from 'react'
import Graph from '../components/Graph'
import Search from '../components/Search'
import Options from '../components/Options'
import { Header } from 'semantic-ui-react'

const App = () => (
  <div>
	<div style={{ position: 'absolute', width: '100%', textAlign: 'center', pointerEvents: 'none' }}>
	    <Search />
    </div>
  	<Graph />
  </div>
)

export default App
