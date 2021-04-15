import React, { Component } from 'react'
import ReactDOM from 'react-dom'

class Iframe extends Component {

  componentDidMount () {
    this.iframe = ReactDOM.findDOMNode(this.refs.iframe)
    this.iframe.addEventListener('load', this.props.onLoad);
  }

  componentWillUnmount () {
    this.iframe.removeEventListener('load', this.props.onLoad);
  }

  shouldComponentUpdate () {
    return false;
   }

  render () {
    return (
      <iframe
        ref="iframe"
        {...this.props}
        frameBorder="0"
        width="100%"
        height="100%"
        title={this.props.src}
      />
    )
  }

}

export default Iframe