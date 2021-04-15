import React from 'react';
import { connect } from 'react-redux';
import classnames from 'classnames';
import { Redirect, Link } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Divider from '@material-ui/core/Divider';
import Header from 'components/shared/Header';
import './settings.scss';
import {withLocalization, Localized} from '@fluent/react';

class Settings extends React.Component {
  state = {
    errorMessage: undefined,
    successMessage: undefined,
    loading: false, // TODO: it could be in the Redux Store.
    goTo: undefined, // TODO: it could be in the Redux Store.
    drawer: false,
    newPassword: '',
    password: '',
    confirmPassword: '',
    error: {},
  };

  componentDidUpdate(prevProps, prevState) {
    if (
      prevState.newPassword !== this.state.newPassword ||
      prevState.confirmPassword !== this.state.confirmPassword
    ) {
      const validPassword = this.validatePassword(
        this.state.newPassword,
        this.state.confirmPassword,
      );

      this.setState({
        error: {
          newPassword: validPassword,
          confirmPassword: validPassword,
        },
      });
    }
  }

  render() {
    const {
      goTo,
      loading,
      errorMessage,
      successMessage,
      password,
      confirmPassword,
      newPassword,
    } = this.state;

    const {getString} = this.props;

    this.getString = getString;

    if (goTo) {
      return <Redirect to={goTo} />;
    }

    const isVerifyEnabled = !(
      password.toString() !== '' &&
      confirmPassword.toString() !== '' &&
      newPassword.toString() !== '' &&
      !this.hasError('password') &&
      !this.hasError('confirmPassword') &&
      !this.hasError('newPassword') &&
      !errorMessage
    );

    return (
      <div className="container-fluid settings-rt">
        <Header withDrawer subtitle=<Localized id='settings' value='Settings' /> hidden={!loading} />
        <div className="row justify-content-center align-items-center flex-column text-center">
          <div className="mt-5 col-xl-4 col-sm-8">
            <div className="form">
              <TextField
                label="New Password"
                type="password"
                name="newpassword"
                autoComplete="Password"
                margin="normal"
                variant="outlined"
                value={newPassword}
                onChange={this.onFormChange('newPassword')}
                error={this.hasError('newPassword')}
                fullWidth
              />
              <TextField
                label="Confirm Password"
                type="Password"
                name="Confirm Password"
                autoComplete="Confirm Password"
                margin="normal"
                variant="outlined"
                value={confirmPassword}
                onChange={this.onFormChange('confirmPassword')}
                error={this.hasError('confirmPassword')}
                fullWidth
              />
              <Divider className="m-3" />
              <TextField
                label="Current Password"
                type="password"
                name="password"
                autoComplete="Password"
                margin="normal"
                variant="outlined"
                value={password}
                onChange={this.onFormChange('password')}
                error={this.hasError('password')}
                fullWidth
              />
            </div>
            <div
              className={classnames('error-message', 'p-3', 'text-center', {
                show: !!errorMessage,
              })}
            >
              <span>{errorMessage}</span>
            </div>
            <div
              className={classnames('success-message', 'p-3', 'text-center', {
                show: !!successMessage,
              })}
            >
              <span>{successMessage}</span>
            </div>
          </div>
          <div className="mt-5 col-xl-4 col-sm-8">
            <Button
              variant="outlined"
              color="primary"
              className="primary mb-3"
              size="large"
              disabled={isVerifyEnabled}
              onClick={this.onSave}
              fullWidth
            >
              <Localized id='save' value='Save' />
            </Button>
            <Link className="log-in" to="/dashboard">
              <Localized id='cancel' value='Cancel' />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  onClickMenu = () => {
    this.setState({ drawer: !this.state.drawer });
  };

  onSave = () => {
    this.setState({
      errorMessage: undefined,
      successMessage: undefined,
      loading: true,
    });
    this.props.accountService
      .changePassword({
        new_password1: this.state.newPassword,
        new_password2: this.state.confirmPassword,
        old_password: this.state.password,
      })
      .then(response => {
        if (response && response.hasOwnProperty('errors')) {
          const { errors } = response;
          errors.map(error => {
            switch (error) {
              case 'EMAIL_INVALID':
                this.setState({
                  errorMessage:
                    'The provided e-mail address is not in an accepted format.',
                  loading: false,
                });
                break;
              case 'EMAIL_IN_USE':
                this.setState({
                  errorMessage:
                    'The provided e-mail address is already in use by an active account.',
                  loading: false,
                });
                break;
              case 'PHONE_INVALID':
                this.setState({
                  errorMessage:
                    'The provided phone number is not valid (as validated by PinPoint).',
                  loading: false,
                });
                break;
              case 'PHONE_IN_USE':
                this.setState({
                  errorMessage:
                    'The provided phone number is already in use by an active account.',
                  loading: false,
                });
                break;
              case 'PASSWORD_INVALID':
                this.setState({
                  errorMessage:
                    'Please use at least 8 characters and include a mixture of uppercase letters, lowercase letters, and numbers in your password.',
                  loading: false,
                });
                break;
              case 'PASSWORD_INCORRECT':
                this.setState({
                  errorMessage: 'The provided current password is not correct.',
                  loading: false,
                });
                break;
              default:
                this.setState({
                  errorMessage: 'unexpected error occurred.',
                  loading: false,
                });
            }

            return true;
          });
        } else if (response instanceof Error) {
          this.setState({ errorMessage: response.message, loading: false });
        } else {

          this.setState({
            errorMessage: undefined,
            loading: false,
            successMessage: this.getString('saved-successfully'),
            newPassword: '',
            password: '',
            confirmPassword: '',
          });
        }
      });
  };

  onFormChange = form => ({ target: { value } }) =>
    this.setState({ [form]: value, errorMessage: '' });

  hasError = state =>
    this.state.error[state] ? this.state.error[state] : false;

  setError = state => value =>
    this.setState(({ error }) => ({ error: { ...error, [state]: value } }));

  validatePassword = (password, confirmPassword) =>
    password !== confirmPassword;
}

const mapStateToProps = ({ User }) => ({ User });
const mapDispatchToProps = dispatch => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withLocalization(Settings));
