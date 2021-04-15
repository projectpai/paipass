import React, { Fragment, Component } from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';

import Header from '../header';

import ReviewsContainer from '../reviews';
import UsersContainer from '../users';
import ArticlesContainer from '../articles';
import PinnedMessagesContainer from '../pinned-messages';
import LiveReviewContainer from '../live-review';

import * as actions from '../login/actions';

import { DialogConsumer, DialogProvider, DialogRoot, DataManager } from '../../common';
import Home from './home'; 

class HomeContainer extends Component {

    state = { 
        authorized: false,
        dialog: { resetPassword: false }
    };

    constructor(props) {
        super(props);
        
        if (this.props.user.token) {
            this.state.authorized = true;
        }

        this.handleUserMenu = this.handleUserMenu.bind(this);
    }

    componentDidMount() {
      this.props.login({}); // @TODO: We must create a service/authenticator.
    }

    componentWillReceiveProps() {
        if (this.props.user.token) {
            this.setState({ authorized: true });
        } else {
            this.setState({ authorized: false });
        }
    }

    handleUserMenu(value) {
        this[value]();
    }

    logout() {
        this.props.logout().then(() => {
            this.setState({ authorized: false });
        });
    }

    resetPassword() {
        DataManager.instance.resetPassword(this.props.user.email);
    }

    render() {
        const { authorized } = this.state;

        return authorized ? (
            <Fragment>
                <DialogProvider>
                    <DialogRoot/>
                    <Header 
                        email={this.props.user.email}
                        handleUserMenu={this.handleUserMenu}
                    />
                    
                    <main>
                        <Switch>
                            <Route path='/home/live-review' component={LiveReviewContainer}/>
                            <Route path='/home/reviews' component={ReviewsContainer}/>
                            <Route path='/home/users' component={UsersContainer} />
                            <Route path='/home/articles' component={ArticlesContainer}/>
                            <Route path='/home/pinned-messages' component={PinnedMessagesContainer}/>
                            <Route path='/home' component={Home}/>
                        </Switch>
                    </main>
                    
                    <footer></footer>
                </DialogProvider>
            </Fragment>
        ) : (
            <Redirect to='/login'/>
        )
    }
} 

const mapStateToProps = ({ user }) => ({ user });

export default connect(mapStateToProps, actions)(HomeContainer);
