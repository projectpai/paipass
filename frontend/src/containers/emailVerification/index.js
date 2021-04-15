import React from 'react';
import LinearProgress from '@material-ui/core/LinearProgress';
import Button from '@material-ui/core/Button';
import { Redirect } from 'react-router-dom';
import classnames from 'classnames';

import {
  EMAIL_VERIFICATION_EXPIRED_CODE,
  EMAIL_VERIFICATION_INVALID_CODE,
} from '../../services/Account';
import Header from 'components/shared/Header';

export class EmailVerification extends React.Component {
  state = {
    loading: false,
    errorMessage: undefined,
    goTo: undefined, // TODO: it could be in the Redux Store.
  };

  render() {
    const { loading, errorMessage, goTo } = this.state;
    const {
      match: {
        params: { requestId },
      },
      location,
    } = this.props;

    let paramError = undefined;

    if (!requestId) {
      paramError = 'The request id was not submitted in the request.';
    }

    if (goTo) {
      return <Redirect to={goTo} />;
    }

    return (
      <div className="container-fluid phone-validation-rt">
        <LinearProgress className="loading" hidden={!loading} />
        <Header />
        <div className="row justify-content-center align-items-center">
          <div className="col-xl-4 col-sm-8">
            <div className="container-fluid">
              <h2>Verify Email</h2>
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
                onClick={this.onClickVerify}
                disabled={!!errorMessage || !!paramError}
              >
                Verify
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  onClickVerify = () => {
    this.setState({ loading: true, errorMessage: undefined });
    const {
      match: {
        params: { requestId },
      },
      location,
    } = this.props;
    this.props.accountService
      .emailVerification({
        key: requestId,
      })
      .then(response => {
        if (response.hasOwnProperty('errors')) {
          const { errors } = response;
          errors.map(error => {
            switch (error) {
              case EMAIL_VERIFICATION_EXPIRED_CODE:
                this.setState({
                  errorMessage:
                    'The verification request was created more than four hours ago and can no longer be verified.',
                  loading: false,
                });
                break;
              case EMAIL_VERIFICATION_INVALID_CODE:
                this.setState({
                  errorMessage: 'The verification code is not correct.',
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
          this.setState({ errorMessage: undefined, goTo: '/', loading: false });
        }
      });
  };
}
