import React, { Component } from 'react';
import { BrowserRouter, Switch, Route, Redirect } from 'react-router-dom';
import { FocusStyleManager } from "@blueprintjs/core";

import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import thunkMiddleware from 'redux-thunk';
import { composeWithDevTools } from 'redux-devtools-extension';

import { Containers, reducers } from './containers';
import { middleware } from './common'
import './App.scss';

const store = createStore(reducers, undefined, composeWithDevTools(
  applyMiddleware(...middleware, thunkMiddleware)
));

class App extends Component {
  
  render() {
    FocusStyleManager.onlyShowFocusOnTabs();
    
    return (
      <Provider store={store}>
        <BrowserRouter>
          <Switch>
            <Route path='/login' component={Containers.LoginContainer}/>
            <Route path='/recover-password' component={Containers.RecoverPasswordContainer}/>
            <Route path='/home' component={Containers.HomeContainer} />
            <Route render={() => (<Redirect to='/login'/>)}/>
          </Switch>
        </BrowserRouter>
      </Provider>
    );
  }
}

export default App;
