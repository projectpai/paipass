import React, { Component } from 'react';
import Button from '@material-ui/core/Button';
import { Link } from 'react-router-dom';
import Header from 'components/shared/Header';
import classnames from 'classnames';
import { UNSUBSCRIBE_HASH_INVALID } from '../../services/Account';
import { Localized } from '@fluent/react';

class Unsubscribe extends Component {
  state = {
    errorMessage: undefined,
    successMessage: undefined,
    email: '',
    nonce: '',
    hash: '',
  };
  componentDidMount() {
    const params = new URLSearchParams(this.props.location.search);
    const email = params.get('email');
    const hash = params.get('hash');
    const nonce = params.get('nonce');
    if (!email || !hash || !nonce) {
      this.setState({
        errorMessage: 'A required parameter was not submitted in the request.',
      });
    }
    this.setState({ email, hash, nonce });
  }

  onConfirm = (email, hash, nonce) => {
    this.props.accountService
      .unsubscribe({
        email,
        hash,
        nonce,
      })
      .then(res => {
        if (res instanceof Error) {
          this.setState({ errorMessage: res.message });
        } else if (res.hasOwnProperty('errors')) {
          const { errors } = res;
          errors.forEach(error => {
            switch (error) {
              case UNSUBSCRIBE_HASH_INVALID:
                this.setState({
                  errorMessage: 'The hash sent is not valid.',
                });
                break;
              default:
                this.setState({
                  errorMessage: 'An unexpected error occurred.',
                });
                break;
            }
          });
        } else if (res === true) {
          this.setState({
            successMessage: 'You have been unsubscribed successfully.',
          });
        } else {
          this.setState({
            errorMessage: 'An unexpected error occurred.',
            loading: false,
          });
        }
      });
  };

  render() {
    const { email, hash, nonce } = this.state;
    return (
      <>
        <Header subtitle="Unsubscribe" />
        <div className="container-fluid">
          <div className="row justify-content-center align-items-center">
            <div className="col-xl-4 col-sm-8">
              <Button
                className="d-block secondary mb-2"
                size="large"
                fullWidth
                variant="outlined"
                color="primary"
                onClick={() => this.onConfirm(email, hash, nonce)}
              >
                Confirm
              </Button>

              <Link to="signup">
                <Button
                  className="d-block primary"
                  size="large"
                  fullWidth
                  variant="contained"
                  color="primary"
                >
                  <Localized id='cancel' value='Cancel' />
                </Button>
              </Link>
              <div
                className={classnames(
                  'error-message',
                  'p-3',
                  'mt-2',
                  'text-center',
                  {
                    show: !!this.state.errorMessage,
                  },
                )}
              >
                <span>{this.state.errorMessage}</span>
              </div>
              <div
                className={classnames(
                  'success-message',
                  'p-3',
                  'mt-2',
                  'text-center',
                  {
                    show: !!this.state.successMessage,
                  },
                )}
              >
                <span>{this.state.successMessage}</span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default Unsubscribe;
