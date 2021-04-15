import React from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import { Redirect, Link } from 'react-router-dom';
import LinearProgress from '@material-ui/core/LinearProgress';
import classnames from 'classnames';

import Header from 'components/shared/Header';
import { validateEmail } from '../../util/email-validation';
import {Localized, withLocalization} from '@fluent/react';

class ForgotPassword extends React.Component {
  constructor(props) {
    super(props);
    const { state } = props.location;
    this.state = {
      errorMessage: undefined,
      loading: false, // TODO: it could be in the Redux Store.
      goTo: undefined, // TODO: it could be in the Redux Store.
      email: state ? state.email : '',
    };
  }

  render() {
    const { goTo, loading, email, errorMessage } = this.state;
    if (goTo) {
      return <Redirect to={goTo} />;
    }

    const isVerifyEnabled = !validateEmail(email);

    return (
      <div className="container-fluid signup-rt">
        <LinearProgress className="loading" hidden={!loading} />
        <Header subtitle=<Localized id='forgot-password' value="forgot password" /> />
        <div className="row justify-content-center align-items-center">
          <div className="col-xl-4 col-sm-8">
            <div className="container-fluid mt-5">
              <div className="form">
                <TextField
                  label=<Localized id='email' value="Email" />
                  type="email"
                  name="email"
                  autoComplete="email"
                  margin="normal"
                  variant="outlined"
                  value={email}
                  onChange={this.onemailChange}
                  fullWidth
                />
                <div
                  className={classnames('error-message', 'p-3', 'text-center', {
                    show: !!errorMessage,
                  })}
                >
                  <span>{errorMessage}</span>
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
                  <Localized id='submit' value='Submit' />
                </Button>
                <Link className="log-in mr-2" to="/login">
                  <Localized id='back-to-login' value='Back to Login' />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  onemailChange = ({ target: { value } }) =>
    this.setState({ email: value });

  onVerify = () => {
    this.setState({ loading: true, errorMessage: undefined });
    const {getString} = this.props;
    try {
      this.props.accountService
        .forgotPassword({ email: this.state.email,
                        language: getString('language'),
        })
        .then(response => {
          if (response instanceof Error) {
            this.setState({ errorMessage: response.message, loading: false });
          } else if (response) {
            this.setState({
              errorMessage: undefined,
              goTo: { pathname: '/login', search: '?forgotPassword=true' },
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

export default withLocalization(ForgotPassword);
