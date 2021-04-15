import React from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import classnames from 'classnames';
import { connect } from 'react-redux';
import LinearProgress from '@material-ui/core/LinearProgress';
import { Redirect, Link } from 'react-router-dom';
import { actionUpdateUser } from '../../store/User';
import Header from 'components/shared/Header';
import { Localized, withLocalization} from "@fluent/react";

import './login.scss';
import Cookies from 'js-cookie';

const URL_BASE =
  process.env.NODE_ENV === 'development'
    ? `${process.env.REACT_APP_API_URL}`
    : process.env.REACT_APP_API_URL;

class Login extends React.Component {
  state = {
    errorMessage: undefined,
    forgotPassword: undefined,
    loading: false, // TODO: it could be in the Redux Store.
    goTo: undefined, // TODO: it could be in the Redux Store.
    email: '',
    password: '',
  };

  static getDerivedStateFromProps(props, state) {
    const {
      location: { search },
      getString,

    } = props;
    const hasError = search.match(/(error=)\w+/g);
    const hasForgotPassword = search.match(/(forgotPassword=)\w+/g);
    const hasGoTo = search.match(/(goTo)=\w+/g);
    if (hasError) {
      return {
        errorMessage:
          "The email address or password entered doesn't match an active account.",
        loading: false,
      };
    }

    if (hasForgotPassword) {
      return {
        forgotPassword:
          getString('reset-password-will-email-you'),
        loading: false,
      };
    }

    if (hasGoTo){
      return {
        goTo: hasGoTo,
      };
    }

    return null;
  }

  render() {

    const {
      goTo,
      errorMessage,
      loading,
      email,
      password,
      forgotPassword,
    } = this.state;

    const isVerifyEnabled = !(
      email.toString() !== '' && password.toString() !== ''
    );

    if (goTo) {
      return <Redirect to={goTo} />;
    }
    const {
      location: { search },
    } = this.props;


    return (
      <div className="container-fluid signup-rt">
        <LinearProgress className="loading" hidden={!loading} />
        <Header />
        <div className="row justify-content-center align-items-center">
          <div className="col-xl-4 col-sm-8">
            <div className="container-fluid">
              <form
                action={`${URL_BASE}/${process.env.REACT_APP_API_LOGIN_EP}${search}`}
                method="post"
              >
                <input type="hidden" name="csrfmiddlewaretoken" value={Cookies.get('csrftoken')} />
                <h2 className="text-center">
                  <Localized id='login-with-your-email-and-password' value='Login with your Email and Password' />
                </h2>

                <div className="form">

                  <TextField
                    label={<Localized id="email"> Email</Localized>}
                    type="email"
                    name="email"
                    autoComplete="email"
                    margin="normal"
                    variant="outlined"
                    value={email}
                    onChange={this.onemailChange}
                    fullWidth
                  />
                  <TextField
                    label={<Localized id="password"> Password </Localized>}
                    type="password"
                    name="password"
                    autoComplete="Password"
                    margin="normal"
                    variant="outlined"
                    value={password}
                    onChange={this.onPasswordChange}
                    fullWidth
                  />

                  <div
                    className={classnames(
                      'error-message',
                      'p-3',
                      'text-center',
                      { show: !!errorMessage },
                    )}
                  >
                    <span>{errorMessage}</span>
                  </div>
                  <div
                    className={classnames('p-3', 'text-center', {
                      show: !!errorMessage,
                    })}
                  >
                    <span>{forgotPassword}</span>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <Button
                    className="d-block primary mb-2"
                    size="large"
                    fullWidth
                    variant="contained"
                    color="primary"
                    disabled={isVerifyEnabled}
                    type="submit"
                    //onClick={this.onVerify}
                  >
                    <Localized id="login" value="Login"/>
                  </Button>
                  <Link className="log-in mr-2" to={`/signup${search}`}>
                    <Localized id="create-account" value='Create Account' />
                  </Link>
                  <Link
                    className="log-in ml-2"
                    to={{
                      pathname: '/forgot-password',
                      state: { email },
                    }}
                  >
                    <Localized id="forgot-password" value='Forgot Password' />
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  onemailChange = ({ target: { value } }) =>
    this.setState({ email: value });

  onPasswordChange = ({ target: { value } }) =>
    this.setState({ password: value });

  onVerify = () => {
    this.setState({ loading: true, errorMessage: undefined });
    try {
      this.props.accountService
        .login({ email: this.state.email, password: this.state.password })
        .then(response => {
          if (response instanceof Error) {
            this.setState({ errorMessage: response.message, loading: false });
          } else if (response) {
            this.props.updateUser(response);
            this.setState({
              errorMessage: undefined,
              goTo: '/dashboard',
              loading: false,
            });
          } else {
            this.setState({
              errorMessage: 'unexpected error occurred.',
              loading: false,
            });
          }

        });
    } catch (err) {
      this.setState({
        errorMessage: 'unexpected error occurred.',
        loading: false,
      });
    }
  };
}

const mapStateToProps = ({ User }) => ({ User });
const mapDispatchToProps = dispatch => ({
  updateUser(user) {
    dispatch(actionUpdateUser(user));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withLocalization(Login));
