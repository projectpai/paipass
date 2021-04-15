import React from 'react';
import Button from '@material-ui/core/Button';
import { connect } from 'react-redux';
import MaskedInput from 'react-text-mask';
import Input from '@material-ui/core/Input';
import { Redirect, Link } from 'react-router-dom';
import LinearProgress from '@material-ui/core/LinearProgress';
import classnames from 'classnames';
import * as R from 'ramda';
import ButtonBase from '@material-ui/core/ButtonBase';
import { withStyles } from '@material-ui/core/styles';
import Header from 'components/shared/Header';
import {
  PHONE_VERIFICATION_INVALID_CODE,
  PHONE_VERIFICATION_EXPIRED_CODE,
} from '../../services/Account';
import { actionUpdateUser } from '../../store/User';

import './phoneValidation.scss';
import { Localized } from '@fluent/react';

const buttonStyle = () => ({
  root: {
    fontWeight: 'normal',
    color: 'gray',
  },
});

const StyledButton = withStyles(buttonStyle)(ButtonBase);

class PhoneValidation extends React.Component {
  state = {
    validationNumbers: '',
    errorMessage: undefined,
    loading: false, // TODO: it could be in the Redux Store.
    goTo: undefined, // TODO: it could be in the Redux Store.
    newCode: undefined,
    phoneVerificationRequestId: undefined,
  };

  render() {
    const {
      errorMessage,
      goTo,
      loading,
      validationNumbers,
      newCode,
    } = this.state;
    const isVerifyEnabled = validationNumbers.toString() === '';

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
              <h2>Verify Phone Number</h2>
              <p className="subtitle">
                <strong>Please enter the verification code we sent</strong>
                <strong>to the phone number you provided</strong>
              </p>
              <div className="form mb-5 mt-5">
                <Input
                  value={validationNumbers}
                  onChange={this.onInputChange}
                  inputComponent={this.TextMaskCustom}
                />
              </div>
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
                onClick={this.onClickVerify}
              >
                Verify
              </Button>
              {newCode && <div className="mb-2">{newCode}</div>}
              <CancelBtn
                {...this.props}
                onLoading={() => this.setState({ loading: true })}
              />

              {!newCode && (
                <StyledButton className="log-in" onClick={this.onResendCode}>
                  Resend verification code
                </StyledButton>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  TextMaskCustom = props => {
    const { inputRef, ...other } = props;

    return (
      <MaskedInput
        {...other}
        ref={inputRef}
        mask={[/\d/, '-', /\d/, '-', /\d/, '-', /\d/, '-', /\d/]}
        placeholderChar={'\u2000'}
        showMask
      />
    );
  };

  onInputChange = ({ target: { value } }) =>
    this.setState({ validationNumbers: value });

  onResendCode = () => {
    this.setState({ errorMessage: '', loading: true, newCode: undefined });

    const {
      location: { state = {} },
    } = this.props;

    if (state.password && state.phone) {
      this.props.accountService
        .phoneNumberReset({ phone: state.phone })
        .then(res => {
          if (res) {
            this.setState({
              errorMessage: '',
              loading: false,
              newCode: `A new verification code has been sent to: ${
                state.phone
              }`,
              phoneVerificationRequestId: res.phoneVerificationRequestId,
            });
          } else {
            this.setState({
              errorMessage:
                'Something went wrong, please try the process again.',
              loading: false,
              newCode: undefined,
            });
          }
        })
        .catch(err =>
          this.setState({
            errorMessage: err.message || 'unexpected error occurred.',
            loading: false,
            newCode: undefined,
          }),
        );
    } else {
      this.setState({
        errorMessage:
          'Could not found phone Number, please try the process again.',
      });
    }
  };

  onClickVerify = () => {
    this.setState({ errorMessage: '', loading: true, newCode: undefined });
    this.props.accountService
      .phoneNumberVerification({
        verificationCode: this.state.validationNumbers.replace(/-/g, ''),
        phoneVerificationRequestId:
          this.state.phoneVerificationRequestId ||
          this.props.User.phoneVerificationRequestId,
      })
      .then(this.onProccess);
  };

  onProccess = response => {
    if (response.hasOwnProperty('errors')) {
      const { errors } = response;
      errors.map(error => {
        switch (error) {
          case PHONE_VERIFICATION_EXPIRED_CODE:
            this.setState({
              errorMessage:
                'The verification request was created more than four hours ago and can no longer be verified.',
              loading: false,
              newCode: undefined,
            });
            break;
          case PHONE_VERIFICATION_INVALID_CODE:
            this.setState({
              errorMessage: 'The verification code is not correct.',
              validationNumbers: '',
              loading: false,
              newCode: undefined,
            });
            break;
          default:
            this.setState({
              errorMessage: 'unexpected error occurred.',
              validationNumbers: '',
              loading: false,
              newCode: undefined,
            });
        }

        return true;
      });
    } else if (response instanceof Error) {
      this.setState({
        errorMessage: response.message,
        validationNumbers: '',
        loading: false,
        newCode: undefined,
      });
    } else {
      const { location } = this.props;
      if (location.state.redirectURL) {
        this.setState({ loading: true });
        window.location = location.state.redirectURL;
      } else {
        const goTo = R.cond([
          [
            R.both(
              R.compose(
                R.not,
                R.isNil,
              ),
              R.has('redirectTo'),
            ),
            R.prop('redirectTo'),
          ],
          [R.T, R.always('/account-authentication')],
        ]);

        this.setState({
          errorMessage: undefined,
          goTo: {
            pathname: goTo(location.state),
            state: { response },
          },
          loading: false,
          newCode: undefined,
        });
      }
    }
  };
}

const CancelBtn = props => {
  const {
    location: { state = {} },
  } = props;
  if (state.redirectURL) {
    return (
      <StyledButton
        className="log-in pr-4 pl-4"
        onClick={() => {
          props.onLoading();
          window.location = state.redirectURL;
        }}
      >
        <Localized id='cancel' value='Cancel' />

      </StyledButton>
    );
  } else {
    return (
      <Link className="log-in pr-4 pl-4" to="/dashboard">
        <Localized id='cancel' value='Cancel' />

      </Link>
    );
  }
};

const mapStateToProps = ({ User }) => ({ User });
const mapDispatchToProps = dispatch => ({
  updateUser(user) {
    dispatch(actionUpdateUser(user));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(PhoneValidation);