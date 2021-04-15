import React from 'react';
import LinearProgress from '@material-ui/core/LinearProgress';
import Header from 'components/shared/Header';
import ResetPasswordForm from './ResetPasswordForm';
import VerificationCode from './VerificationCodeForm';
import DisplayForm from './DisplayForm';
import { NOT_FOUND, USER_HAS_NOT_PHONE } from '../../services/Account';
import classnames from 'classnames';

class ResetPassword extends React.Component {
  state = { loading: false, token: undefined, errorMessage: undefined };

  componentDidMount() {
    const {
      match: {
        params: { requestId },
      },
    } = this.props;
    this.setState({ loading: true });
    this.props.accountService
      .requestCodeVerification({
        requestId: requestId,
      })
      .then(response => {
        if (response.hasOwnProperty('errors')) {
          const { errors } = response;
          errors.map(error => {
            switch (error) {
              case NOT_FOUND:
                this.setState({
                  errorMessage: 'The user does not exist.',
                  loading: false,
                });
                break;
              case USER_HAS_NOT_PHONE:
                this.setState({
                  errorMessage: 'There is no phone registered for this user.',
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
          this.setState({
            errorMessage: response.message,
            loading: false,
          });
        }
        this.setState({ token: response.token, loading: false });
      });
  }

  render() {
    return (
      <div className="container-fluid signup-rt">
        <LinearProgress className="loading" hidden={!this.state.loading} />
        <Header />
        <div className="row justify-content-center align-items-center">
          <div className="col-xl-4 col-sm-8">
            <DisplayForm {...this.props} token={this.state.token}>
              <ResetPasswordForm />
              <VerificationCode />

            </DisplayForm>
            <div
              className={classnames(
                'error-message',
                'p-3',
                'mt-5',
                'text-center',
                {
                  show: !!this.state.errorMessage,
                },
              )}
            >
              <span>{this.state.errorMessage}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ResetPassword;
