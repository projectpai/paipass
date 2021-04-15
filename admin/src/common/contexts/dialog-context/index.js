import React, { Component, createContext } from 'react';
import { Dialog } from '@blueprintjs/core';

const DialogContext = createContext({});

export class DialogProvider extends Component {
  /**
   * @param component, props (context state), dialogProps (see Dialog component of blueprint js)
   */
  showDialog = (component, props = {}, dialogProps = {}) => {
    this.setState({ component, props, dialogProps: Object.assign({
      isOpen: true,
      canEscapeKeyClose: true,
      title: ''
    }, dialogProps) });
  };

  hideDialog = () => this.setState({
    component: null,
    dialogProps: {},
    props: {},
  });

  updateState = (state, cb) => this.setState(state, cb);

  getState = () => this.state;

  state = {
    component: null,
    dialogProps: {},
    props: {},
    showDialog: this.showDialog,
    hideDialog: this.hideDialog,
    setState: this.updateState,
    getState: this.getState
  };

  render() {
    return (
      <DialogContext.Provider value={this.state}>
        {this.props.children}
      </DialogContext.Provider>
    );
  }
}

export const DialogConsumer = DialogContext.Consumer;
export const DialogRoot = () => (
  <DialogConsumer>
      {({ component: Component, props, hideDialog, updateState, dialogProps }) => (
        <Dialog {...dialogProps} onClose={hideDialog}>
          {Component ? <Component {...props} onRequestClose={hideDialog} setState={updateState} /> : null}
        </Dialog>
      )}
  </DialogConsumer>
);
