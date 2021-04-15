import React, { Component } from 'react';

class DisplayForm extends Component {
  state = { currentTab: 0 };

  selectTab = currentTab => {
    this.setState({ currentTab });
  };

  render() {
    const children = React.Children.map(this.props.children, (child, index) => {
      return React.cloneElement(child, {
        current: this.state.currentTab,
        onSelectTab: this.selectTab,
        ...this.props,
      });
    });

    return <>{children[this.state.currentTab]}</>;
  }
}

export default DisplayForm;
