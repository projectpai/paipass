import React, { Component } from 'react';
import Button from '@material-ui/core/Button';
import MaskedInput from 'react-text-mask';
import Input from '@material-ui/core/Input';
import ButtonBase from '@material-ui/core/ButtonBase';
import { withStyles } from '@material-ui/core/styles';
import { Redirect, Link } from 'react-router-dom';
import {
  PHONE_VERIFICATION_INVALID_CODE,
  PHONE_VERIFICATION_EXPIRED_CODE,
  CODES_NOT_MATCH,
  CODE_ALREADY_VERIFIED,
} from '../../services/Account';
import classnames from 'classnames';
import '../phoneValidation/phoneValidation.scss';
import { Localized } from '@fluent/react';

const buttonStyle = () => ({
  root: {
    fontWeight: 'normal',
    color: 'gray',
  },
});

const StyledButton = withStyles(buttonStyle)(ButtonBase);

class VerificationCode extends Component {
  state = {
    validationNumbers: '',
    errorMessage: undefined,
    loading: false,
    goTo: undefined,
    newCode: undefined,
  };
  onInputChange = ({ target: { value } }) =>
    this.setState({ validationNumbers: value });

  render() {
    const { errorMessage, goTo, validationNumbers, newCode } = this.state;
    const isVerifyEnabled = validationNumbers.toString() === '';

    if (goTo) {
      return <Redirect to={goTo} />;
    }
    return (
      <div className="phone-validation-rt">
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
              inputComponent={TextMaskCustom}
            />
          </div>
          <div
            className={classnames('error-message', 'p-3', 'text-center', {
              show: !!errorMessage,
            })}
          >
            <span>{errorMessage}</span>
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
            <StyledButton>
              <Link className="log-in pr-4 pl-4" to="/dashboard">
                <Localized id='cancel' value='Cancel' />
              </Link>
            </StyledButton>
            {!newCode && (
              <Link to={'/forgot-password'}>
                <StyledButton className="log-in">Forgot Password</StyledButton>
              </Link>
            )}
          </div>
        </div>
      </div>
    );

  }

  onClickVerify = () => {
    this.setState({ errorMessage: '', loading: true, newCode: undefined });
    this.props.accountService
      .codeNumberVerification({
        verificationCode: this.state.validationNumbers.replace(/-/g, ''),
        secondFactorToken: this.props.token,
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
                'The second-factor authentication code was created more than one hour ago and can no longer be verified.',
              loading: false,
              newCode: undefined,
            });
            break;
          case PHONE_VERIFICATION_INVALID_CODE:
            this.setState({
              errorMessage:
                'The second-factor authentication code is not correct.',
              validationNumbers: '',
              loading: false,
              newCode: undefined,
            });
            break;
          case CODES_NOT_MATCH:
            this.setState({
              errorMessage:
                'The second-factor authentication code does not match.',
              validationNumbers: '',
              loading: false,
              newCode: undefined,
            });
            break;
          case CODE_ALREADY_VERIFIED:
            this.setState({
              errorMessage:
                'The second-factor authentication code is alredy used.',
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
        // Linter was complaining
        return null;
      });
    } else if (response instanceof Error) {
      this.setState({
        errorMessage: response.message,
        validationNumbers: '',
        loading: false,
        newCode: undefined,
      });
    } else {
      this.props.onSelectTab(1);
    }
  };
}

const TextMaskCustom = props => {
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

export default VerificationCode;
