import React, { Component } from 'react';
import { connect } from 'react-redux';
import Cookies from 'js-cookie';

import Login from './login';
import LoginReducer from './reducer';
import * as actions from './actions';
import { Notification } from '../../common';

class LoginContainer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            email: '',
            password: '',
            processing: props.processing
        };

        Cookies.remove('l_us'); //ToDo: check if cookie has valid token (needs backend support)
        //bind methods
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleChange = this.handleChange.bind(this);
    }

    componentWillReceiveProps({user: { processing, token }, history}) {
        this.setState({ processing });
        if (token) {
            history.push('/home');
        }
    }

    componentDidMount() {
      const { location: { search } } = this.props;
      const hasError = search.match(/(error=)\w+/g);

      if (hasError) {
        Notification.showError('The email address or password entered doesn\'t match an active account.');
      }
    }

    handleSubmit(e) {
        e.preventDefault();
        this.props.login(this.state);
    }

    handleChange(e) {
        this.setState({ [e.target.name]: e.target.value });
    }

    render() {
        return (
            <Login
                handleSubmit={this.handleSubmit}
                handleChange={this.handleChange}
                processing={this.state.processing}
            />
        )
    }
}

const mapStateToProps = ({ user }) => ({ user });

export default connect(mapStateToProps, actions)(LoginContainer);
export {  LoginContainer, LoginReducer };
