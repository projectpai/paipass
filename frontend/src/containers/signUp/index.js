import React from 'react';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import classnames from 'classnames';
import { connect } from 'react-redux';
import LinearProgress from '@material-ui/core/LinearProgress';
import { Redirect } from 'react-router-dom';
import { Link } from 'react-router-dom';
import Header from 'components/shared/Header';
import { validateEmail } from '../../util/email-validation';
import {
  EMAIL_IN_USE,
  EMAIL_INVALID,
  PHONE_INVALID,
  PHONE_IN_USE,
  PASSWORD_INVALID,
} from '../../services/Account';
import { actionUpdateUser } from '../../store/User';
import { Localized } from '@fluent/react';
import './signup.scss';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';

class SignUp extends React.Component {
  state = {
    email: '',
    emailError: false,
    password: '',
    confirmPassword: '',
    passwordError: false,
    phone_number: '',
    errorMessage: undefined,
    selectedCatenaAccountType: '',
    loading: false, // TODO: it could be in the Redux Store.
    goTo: undefined, // TODO: it could be in the Redux Store.
    test: false,

  };

  componentDidUpdate(prevProps, prevState) {
    if (prevState.email !== this.state.email) {
      this.setState({ emailError: !validateEmail(this.state.email) });
    }

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

  render() {
    const {
      email,
      password,
      confirmPassword,
      phone_number,
      emailError,
      passwordError,
      errorMessage,
      loading,
      goTo,
      selectedCatenaAccountType,
    } = this.state;
    const {
      location: { search },
    } = this.props;

    const isVerifyEnabled = !(
      email.toString() !== '' &&
      password.toString() !== '' &&
      confirmPassword.toString() !== '' &&
      phone_number.toString() !== '' &&
      !emailError &&
      !passwordError
    );

    if (goTo) {
      return <Redirect to={goTo}/>;
    }

    const handleAccountTypeChange = (event) => this.setState({ selectedCatenaAccountType: event.target.value });

    const catenaComponents = [];
    if (search.includes('from%3Dcatena')) {
      catenaComponents.push(
        <div className={{minWidth:120}}>
          <InputLabel required>Catena Account Type</InputLabel>
          <Select
            fullWidth
            value={selectedCatenaAccountType}
            onChange={handleAccountTypeChange}

          >
            <MenuItem value="Artist">Artist</MenuItem>
            <MenuItem value="Collector">Collector</MenuItem>

          </Select>
        </div>);
    }
    return (
      <div className="container-fluid">
        <LinearProgress className="loading" hidden={!loading}/>
        <Header/>
        <div className="row justify-content-center align-items-center">
          <div className="col-xl-4 col-sm-8">
            <div className="container-fluid">
              <h2 className="text-center"><Localized id='create-account' value="Create Account"/></h2>
              <div className="form">
                <TextField
                  label=<Localized id='email' value='Email'/>
                type="email"
                name="email"
                autoComplete="email"
                margin="normal"
                variant="outlined"
                value={email}
                onChange={this.onEmailChange}
                error={this.state.emailError}
                fullWidth
                />
                <TextField
                  label=<Localized id='password' value='Password'/>
                type="password"
                name="Password"
                autoComplete="Password"
                margin="normal"
                variant="outlined"
                value={password}
                onChange={this.onPasswordChange}
                error={this.state.passwordError}
                fullWidth
                />
                <TextField
                  label=<Localized id='confirm-password' value='Confirm Password'/>
                type="Password"
                name="Confirm Password"
                autoComplete="Confirm Password"
                margin="normal"
                variant="outlined"
                value={confirmPassword}
                onChange={this.onConfirmPasswordChange}
                error={this.state.passwordError}
                fullWidth
                />
                <TextField
                  label=<Localized id='phone-number' value="Phone Number"/>
                type="text"
                name="Phone Number"
                autoComplete="Phone Number"
                margin="normal"
                variant="outlined"
                value={phone_number}
                onChange={this.onPhoneChange}
                fullWidth
                />
                {catenaComponents}
                <div
                  className={classnames('error-message', 'p-3', 'text-center', {
                    show: !!errorMessage,
                  })}
                >
                  <span>{errorMessage}</span>
                </div>
              </div>
              <div className="text-center">
                <p><Localized id='we-send-verif-sms' value='We will send you a verification code via sms'/></p>
                <p className="mt-4">
                  <Localized id='you-agree-to-our-tos-prefix'
                             value='By creating an account, you agree to the PAIPass '/>
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={'/terms-of-service'}
                  >
                    <b className="pointer"><Localized id="terms-of-service-spaced"
                                                      value="Terms of Service"/></b>
                  </a>
                  <Localized id="and-spaced" value=" and "/>
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={'/privacy-policy'}
                  >
                    <b className="pointer"><Localized id="privacy-policy"
                                                      value="Privacy Policy"/></b>
                  </a>
                </p>
                <Button
                  className="d-block primary mb-2"
                  size="large"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={isVerifyEnabled}
                  onClick={this.onVerify}
                >
                  <Localized id='create-account' value="Create Account"/>

                </Button>
                <Link className="log-in" to="/login">
                  <Localized id='already-have-an-account-login' value='Already have an account? Log In!'/>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  onEmailChange = ({ target: { value } }) => this.setState({ email: value });
  onPasswordChange = ({ target: { value } }) =>
    this.setState({ password: value });
  onConfirmPasswordChange = ({ target: { value } }) =>
    this.setState({ confirmPassword: value });
  onPhoneChange = ({ target: { value } }) => this.setState({ phone_number: value });
  validatePassword = (password, confirmPassword) =>
    password !== confirmPassword;
  onVerify = () => {
    this.setState({ loading: true });
    const {
      location: { search },
    } = this.props;

    this.props.accountService
      .create({
        email: this.state.email,
        password: this.state.password,
        phone_number: this.state.phone_number,
        search: search,
        accountType: this.state.selectedCatenaAccountType,
      })
      .then(response => {
        if (response.hasOwnProperty('errors')) {
          const { errors } = response;
          errors.map(error => {
            switch (error) {
              case EMAIL_INVALID:
                this.setState({
                  errorMessage:
                    'The provided e-mail address is not in an accepted format.',
                  loading: false,
                });
                break;
              case EMAIL_IN_USE:
                this.setState({
                  errorMessage:
                    'The provided e-mail address is already in use by an active account.',
                  loading: false,
                });
                break;
              case PHONE_INVALID:
                this.setState({
                  errorMessage: 'The provided phone number is not supported.',
                  loading: false,
                });
                break;
              case PHONE_IN_USE:
                this.setState({
                  errorMessage:
                    'The provided phone number is already in use by an active account.',
                  loading: false,
                });
                break;
              case PASSWORD_INVALID:
                this.setState({
                  errorMessage:
                    'Please use at least 8 characters and include a mixture of uppercase letters, lowercase letters, and numbers in your password.',
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
        } else if (response.hasOwnProperty('goTo')) {
          this.props.updateUser(response);
          this.props.accountService.profile().then( profile => {
            this.props.history.push(response.goTo)
          })

        }else if (response.hasOwnProperty('userId')) {
          this.props.updateUser(response);
          this.props.accountService.profile().then(profile => {
            if (profile.hasOwnProperty('email')) {
              this.props.updateUser(profile);
              this.setState({
                errorMessage: undefined,
                goTo: {
                  pathname: '/phone-validation',
                  state: {
                    phone: this.state.phone_number,
                    password: this.state.password,
                    redirectURL: response.redirectURL || null,
                  },
                },
                loading: false,
              });
            } else {
              this.setState({
                errorMessage: 'Something went wrong.',
                loading: false,
              });
            }
          });
        } else if (response.error) {

          this.setState({ errorMessage: response.error, loading: false });
        } else if (response instanceof Error) {
          this.setState({ errorMessage: response.message, loading: false });
        }
        // this.setState({ loading: false }); // TODO: this could be a stack thing, I could add new states to stack and then at the end .resolve() or something and all states is changed, using only one setState and re-render the component 1 time.
      });
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
)(SignUp);
