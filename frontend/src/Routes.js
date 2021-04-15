import React, { Component } from 'react';
import { Route, Switch } from 'react-router-dom';
import LinearProgress from '@material-ui/core/LinearProgress';
import { Home } from './containers/home/';
import Login from './containers/login';
import SignUp from './containers/signUp';
import { EmailVerification } from './containers/emailVerification';
import PhoneValidation from './containers/phoneValidation';
import { ServicesContext } from './util/ServicesContext';
import AccountAuthentication from './containers/accountAuthentication';
import NameSetup from './containers/accountAuthentication/nameSetup';
import VideoAuthentication from './containers/videoAuthentication';
import AuthComplete from './containers/accountAuthentication/authComplete';
import Dashboard from './containers/dashboard';
import Offer from './containers/offer';
import AcceptedOffer from './containers/acceptedOffer';
import AdditionalDataOffer from './containers/offer/additionalData';
import ForgotPassword from './containers/forgotPassword';
import ResetPassword from './containers/resetPassword';
import Authorization from './containers/authorization';
import SsoAuthorization from './containers/sso_authorization';
import Settings from './containers/settings';
import Profile from './containers/profile';
import ManageAuthorization from './containers/manageAuthorization';
import TermsOfService from './containers/termsOfService';
import PrivacyPolicy from './containers/privacyPolicy';
import PremiumContainer from './containers/promotion/premium';
import Unsubscribe from './containers/unsubscribe';
import Footer from './components/shared/Footer';
import * as R from 'ramda';
import requireAuth from './common/Auth/requireAuth';
import { connect } from 'react-redux';
import { actionUpdateUser, actionUpdateUserError } from './store/User';
import { withRouter } from 'react-router-dom';
import OauthBlock from './containers/OauthBlock';
import OAuthTabPanel from './containers/manageOAuth';
import Pdp2TabPanel from './containers/managePdp2';
import PaiMessages from './containers/paiMessages';

const actions = {
  actionUpdateUser,
  actionUpdateUserError,
};
const NoMatch = () => {
  return <>404 Page not Found.</>;
};

const services = ({ props, Component, isProtected = true }) => {
  if (isProtected) {
    return (
      <ServicesContext.Consumer>
        {values => withAuth(Component, { ...values, ...props })}
      </ServicesContext.Consumer>
    );
  }
  return (
    <ServicesContext.Consumer>
      {values => <Component {...values} {...props} />}
    </ServicesContext.Consumer>
  );
};

const withAuth = (component, props) => {
  let WithAuth = requireAuth(component);
  return <WithAuth {...props} />;
};

const Logout = props => {
  const { history } = props;
  props.accountService.logout().then(() => history.push('/'));

  return (
    <div className="container-fluid">
      <LinearProgress className="loading" />
    </div>
  );
};

class Routes extends Component {
  componentDidMount() {
    const transformResponse = R.cond([
      [R.has('email'), this.props.actionUpdateUser],
      [R.T, this.props.actionUpdateUserError],
    ]);
    this.context.accountService.profile().then(transformResponse);
  }
  render() {
    return (
      <div className="App">
        <div className="container-fluid">
          <Switch>
            <Route exact path="/" component={Home} />
            <Route
              path="/login"
              component={props =>
                services({ props, Component: Login, isProtected: false })
              }
            />
            <Route
              path="/signup"
              component={props =>
                services({ props, Component: SignUp, isProtected: false })
              }
            />
            <Route
              path="/phone-validation"
              component={props =>
                services({ props, Component: PhoneValidation })
              }
            />
            <Route
              path="/email-verification/:requestId"
              component={props =>
                services({
                  props,
                  Component: EmailVerification,
                  isProtected: false,
                })
              }
            />

            <Route
              path="/account-authentication"
              component={props =>
                services({ props, Component: AccountAuthentication })
              }
            />
            <Route
              path="/account-name"
              component={props => services({ props, Component: NameSetup })}
            />
            <Route
              path="/video-authentication"
              component={props =>
                services({ props, Component: VideoAuthentication })
              }
            />
            <Route
              path="/auth-complete"
              component={props => services({ props, Component: AuthComplete })}
            />
            <Route
              path="/dashboard"
              component={props => services({ props, Component: Dashboard })}
            />
            <Route
              path="/offer"
              component={props => services({ props, Component: Offer })}
            />
            <Route
              path="/oauth/email-verification-required/"
              component={props =>
                services({
                  props,
                  Component: OauthBlock,
                })
              }
            />
            <Route
              path="/oauth/authorize/details-form"
              component={props => services({ props, Component: Authorization })}
            />
            <Route
              path="/sso/authorize/details-form"
              component={props => services({ props, Component: SsoAuthorization })}
            />


            <Route
              path="/manage-oauth-permissions"
              component={props => services({ props, Component: OAuthTabPanel })}
            />
            <Route
              path="/pai-data-sharing/"
              component={props => services({ props, Component: Pdp2TabPanel })}
            />
            <Route
              path="/pai-messages/"
              component={props =>
                services({
                  props,
                  Component: PaiMessages,
                })
              }
            />
            <Route
              path="/additional-data-offer"
              component={props =>
                services({ props, Component: AdditionalDataOffer })
              }
            />
            <Route
              path="/forgot-password"
              component={props =>
                services({
                  props,
                  Component: ForgotPassword,
                  isProtected: false,
                })
              }
            />
            <Route
              path="/password-reset/:requestId"
              component={props =>
                services({
                  props,
                  Component: ResetPassword,
                  isProtected: false,
                })
              }
            />
            <Route
              path="/settings"
              component={props => services({ props, Component: Settings })}
            />
            <Route
              path="/profile"
              component={props => services({ props, Component: Profile })}
            />
            <Route
              path="/manage/:uuid"
              component={props =>
                services({ props, Component: ManageAuthorization })
              }
            />
            <Route
              path="/logout"
              component={props =>
                services({ props, Component: Logout, isProtected: false })
              }
            />
            <Route
              path="/terms-of-service"
              component={props =>
                services({
                  props,
                  Component: TermsOfService,
                  isProtected: false,
                })
              }
            />
            <Route
              path="/privacy-policy"
              component={props =>
                services({
                  props,
                  Component: PrivacyPolicy,
                  isProtected: false,
                })
              }
            />
            <Route
              path="/premium"
              component={props =>
                services({ props, Component: PremiumContainer })
              }
            />
            <Route
              path="/unsubscribe"
              component={routes =>
                services({ routes, Component: Unsubscribe, isProtected: false })
              }
            />

            <Route component={NoMatch} />
          </Switch>
        </div>
        <Footer />
      </div>
    );
  }
}
Routes.contextType = ServicesContext;
export default withRouter(
  connect(
    null,
    actions,
  )(Routes),
);
