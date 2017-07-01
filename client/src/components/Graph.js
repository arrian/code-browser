import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { selectNode, expandNode, collapseNode, zoom, move } from '../actions'
import { Loader } from 'semantic-ui-react'
import * as d3 from 'd3'
import { keyBy, isEqual } from 'lodash'

class Graph extends React.Component {
  constructor(props) {
    super(props);

    this.colour = d3.scaleOrdinal(d3.schemeCategory20c);
  }

  componentWillReceiveProps(props) {
    if(!isEqual(props.results, this.props.results)) {
      this.updateGraph(props);
    }
    
    if(this.props.selection && this.props.selection.id) this.nodeElements.select('#node-' + this.props.selection.id + ' circle').attr('fill', '').attr('stroke-width', '0').attr('class', '');
    if(props.selection && props.selection.id) this.nodeElements.select('#node-' + props.selection.id + ' circle').attr('fill', 'red').attr('stroke', 'black').attr('stroke-width', '2').attr('class', 'selection');
  }

  updateGraph(props) {
    let node,
        oldItem,
        oldNodeMap = this.nodeMap || {},
        oldLinkMap = this.linkMap || {},
        resultNodes = [];

    this.nodeMap = {};
    this.linkMap = {};

    props.results.secondary.forEach(key => {
      node = this.collectNodes(oldNodeMap, props.nodes, key, 'secondary');
      this.nodeMap[key] = node;
      resultNodes.push(node);
    });

    props.results.primary.forEach(key => {
      node = this.collectNodes(oldNodeMap, props.nodes, key, 'primary');
      this.nodeMap[key] = node;
      resultNodes.push(node);
    });

    props.results.errors.forEach(key => {
      node = this.collectNodes(oldNodeMap, props.nodes, key, 'error');
      this.nodeMap[key] = node;
      resultNodes.push(node);
    });

    const resultLinks = Object.keys(props.links).map(key => props.links[key]).filter(link => this.nodeMap[link.source] && this.nodeMap[link.target]).map(link => {
      oldItem = oldLinkMap[link.id] || {};
      this.linkMap[link.id] = Object.assign({}, link, {
        source: this.nodeMap[link.source],
        target: this.nodeMap[link.target]
      });
      return this.linkMap[link.id];
    });

    this.updateSimulation(resultNodes, resultLinks, props.selectNode);
  }

  collectNodes(oldNodeMap, newNodeMap, id, colour) {
      const oldItem = oldNodeMap[id] || {};
      const newItem = newNodeMap[id];
      return this.createNode(oldItem, newItem, colour);
  }

  createNode(oldNode, newNode, colour) {
    return Object.assign({}, newNode, {
      x: oldNode.x,
      y: oldNode.y,
      vx: oldNode.vx,
      vy: oldNode.vy,
      colour
    });
  }

  updateSimulation(nodes, links, selectNode) {
    let entering;

    this.nodes = nodes;
    this.links = links;

    this.nodeElements = this.nodeElements.data(nodes, d => d.id);
    this.nodeElements.attr('class', d => 'node ' + d.colour);

    this.nodeElements.exit().remove();
    entering = this.nodeElements.enter().append('g');

    entering
      .attr('class', d => 'node ' + d.colour)
      .attr('title', d => d.name)
      .attr('id', d => 'node-' + d.id);

    entering
      .call(d3.drag()
        .on('start', d => this.dragStart(d))
        .on('drag', d => this.dragging(d))
        .on('end', d => this.dragEnd(d)));

    entering
      .append('circle')
      .attr('r', d => 10)//d.linkCount * 2 + 1)
      .attr('cursor', 'pointer')
      .on('click', selectNode);

    entering
      .append('text')
      .attr('class', 'textClass')
      .attr('x', 10)
      .attr('y', '.31em')
      .attr('pointer-events', 'none')
      .text(d => d.name.split("/").pop());

    this.nodeElements = entering.merge(this.nodeElements);
    
    this.linkElements = this.linkElements.data(links, d => d.id);
    this.linkElements.exit().remove();
    this.linkElements = this.linkElements.enter().append('line').attr('id', d => 'link-' + d.id).merge(this.linkElements);

    this.simulation.nodes(nodes);
    this.simulation.force('link').links(links);
    this.simulation.alpha(0.4).restart();
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
      .force('link', d3.forceLink(this.links).id(d => d.id).distance(100).strength(1))
      .force('y', d3.forceY(0))
      .force('x', d3.forceX(0))
      .on('tick', () => this.tick());

    svg.call(d3.zoom().scaleExtent([0.1, 8]).on('zoom', () => content.attr("transform", d3.event.transform)))

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
  results: PropTypes.object
}

const mapStateToProps = (state) => ({
  nodes: state.graph.nodes,
  links: state.graph.links,
  results: state.graph.results,
  selection: state.graph.selection
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
