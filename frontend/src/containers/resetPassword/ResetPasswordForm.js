import React, { Component } from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import { Redirect, Link } from 'react-router-dom';
import LinearProgress from '@material-ui/core/LinearProgress';
import classnames from 'classnames';
import { connect } from 'react-redux';
import {
  CODE_NOT_VERIFIED,
  CODE_ALREADY_EXCHANGED,
  CODE_EXPIRED,
} from '../../services/Account';
import { actionUpdateUser } from '../../store/User';

const actions = { actionUpdateUser };

class ResetPasswordForm extends Component {
  state = {
    errorMessage: undefined,
    loading: false,
    goTo: undefined,
    password: '',
    confirmPassword: '',
    passwordError: false,
    showResetForm: false,
  };

  componentDidUpdate(prevProps, prevState) {
    if (
      prevState.password !== this.state.password ||
      prevState.confirmPassword !== this.state.confirmPassword
    ) {
      this.setState({
        passwordError: this.validatePassword(
          this.state.password,
          this.state.confirmPassword,
        ),
      });
    }
  }

  validatePassword = (password, confirmPassword) =>
    password !== confirmPassword;
  onPasswordChange = ({ target: { value } }) =>
    this.setState({ password: value });

  onRetypePasswordChange = ({ target: { value } }) =>
    this.setState({ confirmPassword: value });

  onVerify = () => {
    this.setState({ loading: true, errorMessage: undefined });
    const {
      match: {
        params: { requestId },
      },
      location,
    } = this.props;
    const token = location.search.match(/[code=](\w+)/g)[1].replace(/=/g, '');
    try {
      this.props.accountService
        .resetPassword({
          requestId,
          token,
          password: this.state.password,
          secondFactorAuthenticationToken: this.props.token,
        })
        .then(response => {
          if (response instanceof Error) {
            this.setState({ errorMessage: response.message, loading: false });
          } else if (response.hasOwnProperty('errors')) {
            const { errors } = response;
            errors.map(error => {
              switch (error) {
                case CODE_NOT_VERIFIED:
                  this.setState({
                    errorMessage:
                      'The second-factor authentication code has not been verified.',
                    loading: false,
                    newCode: undefined,
                  });
                  break;
                case CODE_EXPIRED:
                  this.setState({
                    errorMessage:
                      'The second-factor authentication has expierd.',
                    validationNumbers: '',
                    loading: false,
                    newCode: undefined,
                  });
                  break;
                case CODE_ALREADY_EXCHANGED:
                  this.setState({
                    errorMessage:
                      'The second-factor authentication code has been already used.',
                    validationNumbers: '',
                    loading: false,
                    newCode: undefined,
                  });
                default:
                  this.setState({
                    errorMessage: 'An unexpected error occurred.',
                    validationNumbers: '',
                    loading: false,
                    newCode: undefined,
                  });
              }
            });
          } else if (response === true) {
            this.props.accountService
              .profile()
              .then(res => {
                if (res.hasOwnProperty('email')) {
                  this.props.actionUpdateUser(res);

                  this.props.history.push('/dashboard');
                } else {
                  this.setState({
                    errorMessage: 'An unexpected error occurred.',
                    loading: false,
                  });
                }
              })
              .catch(e => {
                this.setState({
                  errorMessage: 'An unexpected error occurred.',
                  loading: false,
                });
              });
          } else {
            this.setState({
              errorMessage: 'An unexpected error occurred.',
              loading: false,
            });
          }
        });
    } catch (err) {
      this.setState({
        errorMessage: 'An unexpected error occurred.',
        loading: false,
      });
    }
  };

  render() {
    const {
      goTo,
      loading,
      password,
      confirmPassword,
      errorMessage,
      passwordError,
    } = this.state;
    const {
      match: {
        params: { requestId },
      },
      location,
    } = this.props;

    if (goTo) {
      return <Redirect to={goTo} />;
    }
    let paramError = undefined;
    try {
      location.search.match(/[code=](\w+)/g)[1].replace(/=/g, '');
    } catch (err) {
      paramError = 'A required parameter was not submitted in the request.';
    }

    if (!requestId) {
      paramError = 'A required parameter was not submitted in the request.';
    }

    const isVerifyEnabled = !(
      password.toString() !== '' &&
      confirmPassword.toString() !== '' &&
      !passwordError &&
      !paramError
    );

    return (
      <div className="container-fluid signup-rt">
        <h2 className="text-center">Reset Password</h2>
        <div className="form">
          <TextField
            label="Password"
            type="password"
            name="password"
            margin="normal"
            variant="outlined"
            value={password}
            onChange={this.onPasswordChange}
            error={this.state.passwordError}
            fullWidth
          />
          <TextField
            label="Re-type Password"
            type="password"
            name="retypePassword"
            margin="normal"
            variant="outlined"
            value={confirmPassword}
            onChange={this.onRetypePasswordChange}
            error={this.state.passwordError}
            fullWidth
          />
          <div
            className={classnames('error-message', 'p-3', 'text-center', {
              show: !!errorMessage || !!paramError,
            })}
          >
            <span>{errorMessage || paramError}</span>
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
            onClick={this.onVerify}
          >
            Submit
          </Button>
          <Link className="log-in mr-2" to="/login">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }
}

export default connect(
  null,
  actions,
)(ResetPasswordForm);
