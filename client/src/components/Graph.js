import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { selectNode, expandNode, collapseNode, zoom, move } from '../actions'
import { Loader } from 'semantic-ui-react'
import * as d3 from 'd3'
import { keyBy } from 'lodash'

class Graph extends React.Component {
  constructor(props) {
    super(props);

    this.colour = d3.scaleOrdinal(d3.schemeCategory20c);
  }

  componentWillReceiveProps(props) {
    let oldItem,
        newItem,
        oldNodeMap = this.nodeMap || {},
        oldLinkMap = this.linkMap || {};

    this.nodeMap = {};
    this.linkMap = {};

    const resultNodes = props.results.map(key => {
      oldItem = oldNodeMap[key] || {};
      newItem = props.nodes[key];
      this.nodeMap[key] = Object.assign({}, newItem, {
        // identifier: oldItem.identifier,
        x: oldItem.x,
        y: oldItem.y,
        vx: oldItem.vx,
        vy: oldItem.vy
      });
      return this.nodeMap[key];
    });

    const resultLinks = Object.keys(props.links).map(key => props.links[key]).filter(link => this.nodeMap[link.source] && this.nodeMap[link.target]).map(link => {
      oldItem = oldLinkMap[link.name] || {};
      this.linkMap[link.name] = Object.assign({}, link, {
        source: this.nodeMap[link.source],
        target: this.nodeMap[link.target]
      });
      return this.linkMap[link.name];
    });

    this.updateSimulation(resultNodes, resultLinks);
  }

  updateSimulation(nodes, links) {
    let entering;

    this.nodes = nodes;
    this.links = links;

    this.nodeElements = this.nodeElements.data(nodes, d => d.name);
    this.nodeElements.exit().remove();
    entering = this.nodeElements.enter().append('g').attr('class', 'node');

    entering
      .call(d3.drag()
        .on('start', d => this.dragStart(d))
        .on('drag', d => this.dragging(d))
        .on('end', d => this.dragEnd(d)));

    entering
      .append('circle')
      .attr('fill', d => this.colour(d.name))
      .attr('r', d => 10)//d.linkCount * 2 + 1)
      .attr('cursor', 'pointer');

    entering
      .append('text')
      .attr('class', 'textClass')
      .attr('x', 10)
      .attr('y', '.31em')
      .text(d => d.name);

    this.nodeElements = entering.merge(this.nodeElements);
    
    this.linkElements = this.linkElements.data(links, d => d.name);
    this.linkElements.exit().remove();
    this.linkElements = this.linkElements.enter().append('line').merge(this.linkElements);

    this.simulation.nodes(nodes);
    this.simulation.force('link').links(links);
    this.simulation.alpha(1).restart();
  }

  dragStart(d) {
    if (!d3.event.active) this.simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  dragging(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  dragEnd(d) {
    if (!d3.event.active) this.simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  componentDidMount() {
    const svg = d3.select(this.refs.graph);
    const content = svg.append('g');

    this.simulation = d3.forceSimulation(this.nodes)
      .force('collide', d3.forceCollide(d => 50).iterations(16))
      // .force('center', d3.forceCenter(500, 500))
      // .force('charge', d3.forceManyBody())
      .force('link', d3.forceLink(this.links).id(d => d.name).distance(100).strength(1))
      .force('y', d3.forceY(0))
      .force('x', d3.forceX(0))
      .on('tick', () => this.tick());

    svg.call(d3.zoom().scaleExtent([0.1, 8]).on('zoom', () => content.attr("transform", d3.event.transform)))

    this.color = d3.scaleOrdinal(d3.schemeCategory20c);

    this.linkElements = content.append('g')
      .attr('class', 'links')
      .attr('stroke', 'gray')
      .attr('stroke-width', 1.5)
      .selectAll('.link');

    this.nodeElements = content.append('g')
      .attr('class', 'nodes')
      .selectAll('.node');

    this.updateSimulation([], []);
  }

  expandNode(nodeName) {
    this.props.expandNode(nodeName);
  }

  zoom() {
    this.props.zoom(d3.event.scale, d3.event.translate);
  }

  tick() {
    this.nodeElements.attr('transform', d => `translate(${d.x},${d.y})`);

    this.linkElements
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
  }

  render() {
    return <svg viewBox="-500 -500 1000 1000" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', userSelect: 'none', cursor: 'default', overflowX: 'hidden', overflowY: 'auto' }} ref="graph"></svg>;
  }
}

Graph.propTypes = {
  nodes: PropTypes.object,
  links: PropTypes.object,
  results: PropTypes.array
}

const mapStateToProps = (state) => ({
  nodes: state.graph.nodes,
  links: state.graph.links,
  results: state.graph.results
})

const mapDispatchToProps = ({
	selectNode,
  expandNode,
  collapseNode,
  zoom,
  move
})

const ConnectedGraph = connect(
  mapStateToProps,
  mapDispatchToProps
)(Graph)

export default ConnectedGraph
