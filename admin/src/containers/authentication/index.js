import React, { Component } from 'react';
import { connect } from 'react-redux';

export default function (ComposedComponent) {

  class Authentication extends Component {
    state = {}

    componentWillMount() {
      if (!this.props.user.token) {
        this.context.router.history.push("/login");
      } else {
       this.setState({render : true});
      }
    }

    componentWillUpdate(nextProps) {
      if (!nextProps.user.token) {
        this.context.router.history.push("/login");
        // location.reload();
      } else {
        this.setState({render : true});
      }
    }

    render() {
      return this.state.render && <ComposedComponent {...this.props }/>
    }
  }

  function mapStateToProps(state) {
    return {
      user: state.user
    };
  }

  return connect(mapStateToProps)(Authentication);
}
