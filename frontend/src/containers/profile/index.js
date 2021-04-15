import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import classnames from 'classnames';
import { Link, Redirect } from 'react-router-dom';
import InfoIcon from '@material-ui/icons/Info';
import DoneIcon from '@material-ui/icons/Done';
import WarningIcon from '@material-ui/icons/Warning';
import ErrorIcon from '@material-ui/icons/Error';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Divider from '@material-ui/core/Divider';
import * as R from 'ramda';
import ButtonBase from '@material-ui/core/ButtonBase';
import { validateEmail } from '../../util/email-validation';
import { UserProfileEntity } from '../../entities/Profile';
import { TextInfo } from '../../components/shared/textInfo';
import { SuccessProfile } from './success';
import { actionUpdateUser, actionUpdateUserError } from 'store/User';
import { getApplications, setCurrent } from 'store/Applications';
import { getAttributes } from 'store/Attributes';
import Header from 'components/shared/Header';
import Select from '@material-ui/core/Select';
import OutlinedInput from '@material-ui/core/OutlinedInput';
import MenuItem from '@material-ui/core/MenuItem';
import AttributesList from './AttributesList';
import './profile.scss';
import {Localized} from '@fluent/react';
import { Tooltip } from '../../components/shared/tooltip';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { withStyles } from '@material-ui/core/styles';
import Switch from '@material-ui/core/Switch';
import Pdp2ProfileSwitch from './pdp2ProfileSwitch';
import { SCOPE_APPROVED, SCOPE_DENIED } from '../../entities/AuthorizeDetails';

const actions = {
  actionUpdateUser,
  actionUpdateUserError,
  getApplications,
  getAttributes,
  setCurrent,
};


class Profile extends React.Component {
  state = {
    errorMessage: undefined,
    successMessage: undefined,
    loading: false, // TODO: it could be in the Redux Store.
    goTo: undefined, // TODO: it could be in the Redux Store.
    drawer: false,
    newEmailSent: false,
    password: '',
    fullname: '',
    email: '',
    phone: '',
    profile: new UserProfileEntity(),
    pdp2_sub_active: '',
    pdp2_sub_status: '',
    pub_key_addr: '',
    amount_requested: -1,
    can_bypass_payment: false,
    error: {},
  };

  componentDidMount() {
    this.setState({ loading: true });
    const { location } = this.props;
    this.props.accountService.profile().then(profile => {
      if (profile.hasOwnProperty('email')) {
        this.props.actionUpdateUser(profile);
      } else {
        this.props.actionUpdateUserError();
      }
    });
    this.props.getApplications();
    //Check for when user updates phone number in profile form
    //and then is redirected back to this page
    if (location) {
      if (location.state && location.state.response) {
        const { hasEmailMessage = false } = this.props.User;
        this.setState({
          errorMessage: undefined,
          loading: false,
          successMessage: <SuccessProfile hasEmailMessage={hasEmailMessage}/>,
        });
      } else {
        const userProfile = { ...this.props.User };
        this.setState({
          profile: userProfile,
          loading: false,
          email: userProfile.email,
          phone: userProfile.phone,
          fullname: userProfile.name,
          pdp2_sub_active: userProfile.pdp2_sub_active,
          pdp2_sub_status: userProfile.pdp2_sub_status,
          pub_key_addr: userProfile.pub_key_addr,
          can_bypass_payment: userProfile.can_bypass_payment,
        });
      }
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.email !== this.state.email) {
      this.setError('email')(!validateEmail(this.state.email));
    }
    if (prevProps.User !== this.props.User) {
      this.setState({
        profile: this.props.User,
        email: this.props.User.email,
        phone: this.props.User.phone,
        fullname: this.props.User.name,
        pdp2_sub_active: this.props.User.pdp2_sub_active,
        pdp2_sub_status: this.props.User.pdp2_sub_status,
        pub_key_addr: this.props.User.pub_key_addr,
        can_bypass_payment: this.props.User.can_bypass_payment,

      });
    }
  }



  render() {
    const {
      goTo,
      loading,
      errorMessage,
      password,
      fullname,
      email,
      phone,
      profile,
      pdp2_sub_active,
      pdp2_sub_status,
      can_bypass_payment,
      newEmailSent,
    } = this.state;

    if (goTo) {
      return <Redirect to={goTo}/>;
    }
    let isVerifyEnabled = false;
    if (profile.ongoingPhoneVerification) {
      isVerifyEnabled = !(
        !R.isEmpty(password) &&
        !R.isEmpty(email) &&
        !R.isEmpty(phone) &&
        !this.hasError('email') &&
        !this.hasError('phone') &&
        !this.hasError('fullname') &&
        !errorMessage &&
        profile.ongoingPhoneVerification
      );
    } else {
      isVerifyEnabled = !(
        !R.isEmpty(password) &&
        !R.isEmpty(email) &&
        !R.isEmpty(phone) &&
        !this.hasError('email') &&
        !this.hasError('phone') &&
        !this.hasError('fullname') &&
        this.hasChanges({ email, phone }) &&
        !errorMessage
      );
    }


    const hasEmailInfo = () => {
      function getEmailNotVerifiedCopy() {
        return (
          <TextInfo
            icon={<InfoIcon/>}
            message={
              <span>
                Your email address has not been verified. <br/>
                Please check your email to verify your new email address.
                <br/>
                {newEmailSent ? (
                  'A new email was sent.'
                ) : (
                  <ButtonBase onClick={this.onResendEmail} className="anchor">
                    Click here to resend your verification email
                  </ButtonBase>
                )}{' '}
              </span>
            }
          />
        );
      }

      function getEmailVerifiedWithOngoingEmailVerification() {
        return (
          <TextInfo
            icon={<InfoIcon/>}
            message={
              <span>
                Your have a pending request to change your email to:
                <div style={{ margin: '16px 0 16px 32px' }}>
                  {profile.newEmail}
                </div>
                <div style={{ marginLeft: '24px' }}>
                  {newEmailSent ? (
                    'A new email was sent.'
                  ) : (
                    <ButtonBase onClick={this.onResendEmail} className="anchor">
                      Click here to resend your verification email
                    </ButtonBase>
                  )}
                </div>
              </span>
            }
          />
        );
      }

      function getEmailNotVerifiedWithOngoingEmailVerification() {
        return (
          <TextInfo
            icon={<InfoIcon/>}
            message={
              <span>
                Your email address has not been verified. <br/>
                Your have a pending request to change your email to:
                <div style={{ margin: '16px 0 16px 32px' }}>
                  {profile.newEmail}
                </div>
                <div style={{ marginLeft: '24px' }}>
                  {newEmailSent ? (
                    'A new email was sent.'
                  ) : (
                    <ButtonBase onClick={this.onResendEmail} className="anchor">
                      Click here to resend your verification email
                    </ButtonBase>
                  )}
                </div>
              </span>
            }
          />
        );
      }

      if (profile.emailVerified) {
        if (profile.ongoingEmailVerification) {
          return getEmailVerifiedWithOngoingEmailVerification.call(this);
        }
      } else {
        if (profile.ongoingEmailVerification) {
          return getEmailNotVerifiedCopy.call(this);
        } else {
          return getEmailNotVerifiedCopy.call(this);
        }
      }

      if (profile.ongoingEmailVerification) {
      } else if (profile.ongoingEmailVerification) {
      }
    };
    const hasPhoneInfo = () => {
      if (profile.newPhone) {
        return (
          <TextInfo
            icon={<InfoIcon/>}
            message={
              <span>
                Your have a pending request to change your phone number to:
                <div style={{ margin: '16px 0 16px 32px' }}>
                  {profile.newPhone}
                </div>
                <div style={{ marginLeft: '24px' }}>
                  Click save to enter or resend your verification code.
                </div>
              </span>
            }
          />
        );
      } else if (profile.ongoingPhoneVerification) {
        return (
          <TextInfo
            icon={<InfoIcon/>}
            message={
              <span>
                Your phone number has not been verified.
                <br/>
                Click save to enter or resend your verification code.
              </span>
            }
          />
        );
      }
    };

    const hasNameInfo = profile => {
      if (
        profile.name === null &&
        !profile.ongoingNameVerification &&
        profile.rejectionReason === null
      ) {
        return (
          <TextInfo
            icon={<InfoIcon/>}
            message={
              <span>
                To set your name, please begin{' '}
                <Link to="/account-authentication">identity verification</Link>.
              </span>
            }
          />
        );
      } else if (
        profile.nameVerified &&
        !profile.ongoingNameVerification &&
        profile.rejectionReason === null
      ) {
        return (
          <TextInfo
            icon={<InfoIcon/>}
            message={
              <span>
                To update your name, please begin{' '}
                <Link to="/account-authentication">identity verification</Link>.
              </span>
            }
          />
        );
      } else if (profile.ongoingNameVerification) {
        return (
          <TextInfo
            icon={<InfoIcon/>}
            message={
              <span>
                You have a pending request to change your name to:{' '}
                {profile.newName}
                <p>
                  To change your request, please begin{' '}
                  <Link to="/account-authentication">
                    identity verification
                  </Link>{' '}
                  again.
                </p>
              </span>
            }
          />
        );
      } else if (profile.newName !== null && profile.rejectionReason !== null) {
        return (
          <TextInfo
            icon={<InfoIcon/>}
            message={
              <span>
                Your name could not be verified for the following reason:
                <p style={{ marginLeft: '48px' }}>{profile.rejectionReason}</p>
                <p style={{ marginLeft: '48px' }}>
                  Submitted name: {profile.newName}
                </p>
                <p style={{ marginLeft: '24px' }}>
                  Please begin{' '}
                  <Link to="/account-authentication">
                    identity verification
                  </Link>{' '}
                  to try again.
                </p>
              </span>
            }
          />
        );
      }
    };

    const renderForm = () => {

      // @TODO: this can be a separeted component, when the props are nil show a loading progress.
      return (
        <Fragment>
          <div className="mt-5 col-xl-4 col-sm-8">
            <div className="form">
              <div className="d-flex align-items-center">
                <TextField
                  label="Full name"
                  type="text"
                  name="fullname"
                  autoComplete="Name"
                  margin="normal"
                  variant="outlined"
                  value={fullname}
                  onChange={this.onFormChange('fullname')}
                  error={this.hasError('fullname')}
                  fullWidth
                  disabled
                />
                {this.renderPropIcon('name')}
              </div>
              {hasNameInfo(profile)}
              <div className="d-flex align-items-center">
                <TextField
                  label=<Localized id='email' value="Email" />
                  type="text"
                  name="email"
                  autoComplete="Email"
                  margin="normal"
                  variant="outlined"
                  value={email}
                  onChange={this.onFormChange('email')}
                  error={this.hasError('email')}
                  fullWidth
                />
                {this.renderPropIcon('email')}
              </div>
              {hasEmailInfo()}
              <div className="d-flex align-items-center">
                <TextField
                  label=<Localized id='phone-number' value="Phone Number" />
                  type="text"
                  name="Phone Number"
                  autoComplete="Phone Number"
                  margin="normal"
                  variant="outlined"
                  value={phone}
                  onChange={this.onFormChange('phone')}
                  error={this.hasError('phone')}
                  fullWidth
                />
                {this.renderPropIcon('phone')}
              </div>
              {hasPhoneInfo()}

              {this.hasAuthorizedApplications() &&
              this.renderSelectApplications()}
              {this.renderAttributesList()}
              <Divider className="mt-3 mb-3"/>
              <div className="d-flex align-items-center">
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
                  style={{
                    marginRight: '25px',
                  }}
                />
              </div>
            </div>
            <div
              className={classnames('error-message', 'p-3', 'text-center', {
                show: !!errorMessage,
              })}
            >
              <span>{errorMessage}</span>
            </div>
          </div>
          <div className="mt-5 col-xl-4 col-sm-8 text-center">
            <Button
              variant="outlined"
              color="primary"
              className="primary mb-1"
              disabled={isVerifyEnabled}
              onClick={this.onSave}
              fullWidth
            >
              <Localized id="save" value="Save"/>
            </Button>
            <Link className="log-in mt-2" to="/dashboard">
              <Localized id="cancel" value="Cancel" />
            </Link>
          </div>
        </Fragment>
      );
    };

    return (
      <div className="container-fluid profile-rt">
        <Header
          withDrawer
          subtitle=<Localized id="profile" value="Profile" />
          hidden={!loading && !this.props.Applications.isLoading}
        />
        <div className="row justify-content-center align-items-center flex-column">
          {this.state.successMessage ? this.state.successMessage : renderForm()}
        </div>
      </div>
    );
  }

  hasAuthorizedApplications = () => !R.isEmpty(this.props.Applications.data);


  renderAttributesList = () => {
    if (this.props.Applications.current) {
      const { attributes = [], namespace } = this.props.Applications.data[
        this.props.Applications.current
        ];
      return (
        <AttributesList
          attributes={attributes.map(id => this.props.Attributes.data[id])}
          namespace={namespace}
          values={this.props.Values.data}
          errorMessage={this.props.Values.errorMessage}
        />
      );
    }
    return null;
  };
  renderSelectApplications = () => {
    return (
      <>
        <Divider className="mt-3 mb-3"/>
        <TextInfo
          message={
            <span>
              <strong>Application-Specific Profile Fields</strong>
              <p>
                Select an application to view profile information that
                application has stored on your profile.
              </p>
            </span>
          }
        />
        <div className="d-flex align-items-center">
          <Select
            value={this.props.Applications.current}
            fullWidth
            input={<OutlinedInput/>}
            style={{
              marginRight: '25px',
            }}
            onChange={this.handleChange}
            inputProps={{
              name: 'application',
              id: 'application-select',
            }}
          >
            {this.renderMenuItems()}
          </Select>
        </div>
      </>
    );
  };
  renderMenuItems = () => {
    const content = [];
    R.map(app => {
      content.push(<MenuItem value={app.uuid}>{app.name}</MenuItem>);
    }, this.props.Applications.data);
    return content;
  };

  handleChange = event => {
    this.props.setCurrent(event.target.value);
    this.props.getAttributes(event.target.value);
  };
  onClickMenu = () => {
    this.setState({ drawer: !this.state.drawer });
  };

  onSave = () => {
    // TODO: remove all values equals value of state.profile.
    this.setState({
      errorMessage: undefined,
      successMessage: undefined,
      loading: true,
    });

    const getPhone = R.cond([[R.equals, R.always(null)], [R.T, e => e]]);
    this.props.accountService
      .updateProfile({
        email: this.state.email,
        currentPassword: this.state.password,
        phone: this.state.phone,
      })
      .then(response => {
        if (response && response.hasOwnProperty('errors')) {
          const setState = prop => () => this.setState(prop);
          const errorMap = R.cond([
            [
              R.equals('EMAIL_INVALID'),
              setState({
                errorMessage: 'The specified email address is not valid.',
                loading: false,
              }),
            ],
            [
              R.equals('EMAIL_IN_USE'),
              setState({
                errorMessage:
                  'The specified email address already belongs to an account.',
                loading: false,
              }),
            ],
            [
              R.equals('PHONE_INVALID'),
              setState({
                errorMessage: 'The specified phone number is not valid.',
                loading: false,
              }),
            ],
            [
              R.equals('PHONE_IN_USE'),
              setState({
                errorMessage:
                  'The specified phone number already belongs to an account.',
                loading: false,
              }),
            ],
            [
              R.equals('PASSWORD_INVALID'),
              setState({
                errorMessage:
                  'The password does not match the password requirements.',
                loading: false,
              }),
            ],
            [
              R.equals('PASSWORD_INCORRECT'),
              setState({
                errorMessage: 'The current password given is not correct.',
                loading: false,
              }),
            ],
            [
              R.T,
              R.applyTo(
                {
                  errorMessage: 'An unexpected error occurred.',
                  loading: false,
                },
                setState,
              ),
            ],
          ]);
          R.map(errorMap, response.errors);
        } else if (response instanceof Error) {
          this.setState({ errorMessage: response.message, loading: false });
        } else {
          const hasEmailMessage = this.areDifferent(
            this.state.profile.email,
            this.state.email,
          );
          const phone = this.state.phone;
          const newPhone = this.state.profile.newPhone;

          this.props.accountService.profile().then(profile => {
            if (profile.hasOwnProperty('email')) {
              if (response.phoneVerificationRequestId) {
                this.props.actionUpdateUser({
                  ...response,
                  hasEmailMessage,
                });
                this.setState({
                  errorMessage: undefined,
                  goTo: {
                    pathname: '/phone-validation',
                    state: {
                      redirectTo: '/profile',
                      phone: newPhone || phone,
                      password: this.state.password,
                    },
                  },
                  loading: false,
                });
              } else {
                this.setState({
                  errorMessage: undefined,
                  loading: false,
                  successMessage: <SuccessProfile hasPhoneMessage={false}/>,
                });
              }
            } else {
              this.setState({
                errorMessage: 'Something went wrong.',
                loading: false,
              });
            }
          });
        }
      });
  };

  onFormChange = form => ({ target: { value } }) =>
    this.setState({ [form]: value, errorMessage: false });

  hasError = state =>
    this.state.error[state] ? this.state.error[state] : false;

  setError = state => value =>
    this.setState(({ error }) => ({ error: { ...error, [state]: value } }));

  onResendEmail = () => {
    this.setState({ loading: true });
    this.props.accountService
      .emailReset({
        email: this.state.profile.newEmail || this.state.profile.email,
      })
      .then(() => this.setState({ newEmailSent: true, loading: false }))
      .catch(err =>
        this.setState({
          errorMessage: err.message ? err.message : 'Something went wrong!',
        }),
      );
  };

  hasChanges = state =>
    R.compose(
      R.not,
      R.whereEq({
        email: this.state.profile.email,
        phone: this.state.profile.phone,
      }),
    )(state);

  areDifferent = (a, b) => {
    return !(a === b);
  };

  renderPropIcon = prop => {
    const { profile } = this.state;
    const upperCased = prop.charAt(0).toUpperCase() + prop.slice(1);
    let icon = <InfoIcon color="action"/>;
    if (
      prop === 'name' &&
      profile.nameVerified &&
      !profile.ongoingNameVerification
    ) {
      icon = <DoneIcon className="icon success"/>;
    } else if (prop === 'name' && profile.newName && profile.rejectionReason) {
      icon = <ErrorIcon className="icon error"/>;
    } else if (
      profile[`${prop}Verified`] &&
      !profile[`ongoing${upperCased}Verification`]
    ) {
      icon = <DoneIcon className="icon success"/>;
    } else if (profile[`ongoing${upperCased}Verification`]) {
      icon = <WarningIcon className="icon warning"/>;
    }

    return icon;
  };
}

const mapStateToProps = ({ User, Applications, Attributes, Values }) => ({
  User,
  Applications,
  Attributes,
  Values,
});

export default connect(
  mapStateToProps,
  actions,
)(Profile);
