import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { scaleNodes, colourNodes, ColourMethod } from '../actions'
import { Grid, Button, Dropdown, Divider, Label } from 'semantic-ui-react'
import Slider, { Range } from 'rc-slider'
import 'rc-slider/assets/index.css'

const Options = ({ onScaleChange, onSortChange, onColourChange, loading, scale, sortMethod, colourMethod }) => (
	<div>
		<Grid style={{ width: '100%', maxWidth: 800, paddingTop: 20, marginLeft: 'auto', marginRight: 'auto', textAlign: 'center', color: 'white' }} columns={3}>
			<Grid.Row>
				<Grid.Column>
					<div style={{ display: 'flex' }}>
						Colour by
						<Dropdown value={colourMethod} onChange={onColourChange} style={{ marginLeft: 20 }} options={[
							{ text: 'No Colour', value: ColourMethod.NONE },
							{ text: 'Temperature', value: ColourMethod.TEMPERATURE },
							{ text: 'Mass', value: ColourMethod.MASS },
							{ text: 'Status', value: ColourMethod.STATUS }
						]} />
					</div>
  				</Grid.Column>
  				<Grid.Column>
  					<div style={{ display: 'flex' }}>
	  					Sort by
						<Dropdown value={sortMethod} onChange={onSortChange} style={{ marginLeft: 20 }} options={[
							{ text: 'Best Match', value: 'BEST_MATCH' }
						]} />
					</div>
  				</Grid.Column>
  				<Grid.Column>
					<div style={{ display: 'flex' }}>
						Scale
						<Slider style={{ marginLeft: 20, paddingTop: 7 }} min={0.5} max={100} value={scale} onChange={onScaleChange} step={0.5} />
					</div>
				</Grid.Column>
			</Grid.Row>
		</Grid>
		<Divider inverted />
	</div>
)

Options.propTypes = {
	loading: PropTypes.bool
}

const mapStateToProps = (state) => ({
	loading: state.graph.loading,
	scale: state.graph.scale,
	colourMethod: state.graph.colourMethod
})

const mapDispatchToProps = ({
	onScaleChange: scaleNodes,
	onColourChange: (_, data) => colourNodes(data.value)
})

const ConnectedOptions = connect(
	mapStateToProps,
	mapDispatchToProps
)(Options)

export default ConnectedOptions
