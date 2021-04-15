import React, { Component } from 'react';
import { connect } from 'react-redux';

export default ChildComponent => {
  class ComposedComponent extends Component {
    // Our component just got rendered
    componentDidMount() {
      this.shouldNavigateAway();
    }

    // Our component just got updated
    componentDidUpdate() {
      this.shouldNavigateAway();
    }

    shouldNavigateAway() {
      if (!this.props.isAuthenticated && !this.props.isAuthenticating) {
        this.props.history.push('/login');
      }
    }

    render() {
      if (this.props.isAuthenticated) {
        return <ChildComponent {...this.props} />;
      } else {
        return 'Loading...';
      }
    }
  }

  function mapStateToProps({ User }) {
    return {
      isAuthenticated: User.isAuthenticated,
      isAuthenticating: User.isAuthenticating,
    };
  }

  return connect(mapStateToProps)(ComposedComponent);
};
