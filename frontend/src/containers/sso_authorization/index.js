import React from 'react';
import { connect } from 'react-redux';
import { Redirect } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import * as R from 'ramda';
import classnames from 'classnames';
import { RequestedItem } from './requestedItem';
import { SCOPE_APPROVED, SCOPE_DENIED } from '../../entities/AuthorizeDetails';
import Header from 'components/shared/Header';
import {
  AuthorizeDetailsEntity,
  ScopesDetailsEntity,
  OwnerScopeEntity,
} from '../../entities/AuthorizeDetails';
import { URL_BASE } from '../../util';
import './sso_authorization.scss';
import Cookies from 'js-cookie';


class SsoAuthorization extends React.Component {
  state = {
    errorMessage: undefined,
    loading: true, // TODO: it could be in the Redux Store.
    goTo: undefined, // TODO: it could be in the Redux Store.
    details: new AuthorizeDetailsEntity(),
    isAcceptDisabled: true,
    permsStatus: {},
  };

  toggleAcceptBtn = (name, value) => {
    const newPerms = Object.assign({}, this.state.permsStatus, {
      [name]: value,
    });
    const enable = Object.values(newPerms).some(e => e);

    if (this.state.isAcceptDisabled === enable)
      this.setState({ isAcceptDisabled: !enable });
    this.setState({ permsStatus: newPerms });
  };

  componentDidMount() {
    const {
      location: { search },
    } = this.props;

    const client = search.match(
      /((client_id)=(?:\w|-|\.|(?:%(?=\w|\d){2,}))*)/gm,
    );
    const scopes = search.match(/((scope)=(?:\w|-|\.|(?:%(?=\w|\d){2,}))*)/gm);
    //const getClient = /(?:client_id=)(.*)/gm;
    //const clientID = getClient.exec(client[0])[1];
    // const scopeList = R.reduce(
    //   (acc, cv) =>
    //     R.isEmpty(acc)
    //       ? /(?:scope=)(.*)/gm.exec(cv)[1]
    //       : `${acc} ${/(?:scope=)(.*)/gm.exec(cv)[1]}`,
    //   '',
    // );
    const setState = this.setState.bind(this);
    const catchError = R.compose(
      setState,
      R.applySpec({ errorMessage: R.prop('message'), loading: R.F }),
    );
    const defaultChecked = R.cond([
      [R.equals(SCOPE_APPROVED), R.T],
      [R.equals(SCOPE_DENIED), R.F],
      [R.T, R.F],
    ]);
    const createPermsStatus = ({ scopes }) => {
      const perms = {};
      // for each scope in scopes add an element denoted by a key
      // delimited by periods with a correponding value correspoding to
      // whether or not that permission has been approved by the user
      scopes.forEach(s => {
        const name = `scope.${s.accessLevel}.${s.namespace}.${s.name}`;
        perms[name] = defaultChecked(s.approvalStatus);
      });

      return perms;
    };

    const createDetailsObj = detail => {

      const createScopes = R.map(
        scope =>
          new ScopesDetailsEntity({
            ...scope,
            owner: new OwnerScopeEntity({ ...scope.owner }),
          }),
      );

      return new AuthorizeDetailsEntity({
        ...detail,
        scopes: createScopes(detail.scopes),
      });
    };
    const transformResponse = R.cond([
      // If there is an error catch the error first
      [R.is(Error),
        catchError],

      [
        // make sure name is not empty before we set the state
        R.propSatisfies(
          R.compose(
            R.not,
            R.isEmpty,
          ),
          'name',
        ),

        // set the state
        R.compose(
          setState,
          R.applySpec({
            details: createDetailsObj,
            loading: R.F,
            permsStatus: createPermsStatus,
          }),
        ),
      ],
      // "name" was empty so we have an error
      [
        R.T,
        R.compose(
          setState,
          R.always({ errorMessage: 'Something went wrong!', loading: false }),
        ),
      ],
    ]);

    this.props.ssoService
      .getAuthorizeDetails()
      .then(transformResponse)
      .catch(catchError);
  }

  render() {
    const { goTo, loading, details, errorMessage, permsStatus } = this.state;
    const {
      location: { search },
    } = this.props;

    if (goTo) {
      return <Redirect to={goTo} />;
    }

    const renderRequestedItems = R.map(scope => (
      <RequestedItem
        key={scope.name}
        className="mt-2 mb-2"
        requestedScope={scope.name}
        nameApp={scope.owner.name || 'PaiPass'}
        description={scope.description || scope.owner.description}
        ownerDescription={scope.owner.description}
        permissions={scope.accessLevel}
        namespace={scope.namespace}
        status={scope.approvalStatus}
        onChange={this.toggleAcceptBtn}
      />
    ));

    if (!loading && R.isEmpty(details.name)) {
      return (
        <div
          className={classnames(
            'error-message',
            'p-3',
            'text-center',
            'mt-4',
            'show',
          )}
        >
          <span>{errorMessage}</span>
        </div>
      );
    }
    return (
      <div className="container-fluid authorization-rt">
        <Header withDrawer hidden={!loading} />
        <div className="row justify-content-center align-items-center flex-column text-center">
          <form
            action={`${URL_BASE}/${
              process.env.REACT_APP_API_SSO_AUTHORIZE_EP
            }${search}`}
            method="post"
          >
            <input type="hidden" name="csrfmiddlewaretoken" value={Cookies.get('csrftoken')} />
            <h2>{details.name} would like to access your data</h2>
            <div className="mb-1">
              <p>{details.description}</p>
              <p>
                {details.name} is requested access to the following information from
                your profile:
              </p>
              <div className="request-items container">
                <div className="row justify-content-center">
                  {renderRequestedItems(details.scopes)}
                </div>
              </div>
              <div
                className={classnames(
                  'error-message',
                  'p-3',
                  'text-center',
                  'mt-4',
                  {
                    show: !!errorMessage,
                  },
                )}
              >
                <span>{errorMessage}</span>
              </div>
            </div>
            <div className="mt-5 col-12">
              <Button
                variant="outlined"
                color="secondary"
                className="red mb-3"
                name="user_sso_approval"
                value="false"
                type="submit"
                fullWidth
              >
                Decline
              </Button>
              <Button
                variant="outlined"
                color="primary"
                className="primary mb-3"
                name="user_sso_approval"
                value="true"
                type="submit"
                fullWidth
                disabled={this.state.isAcceptDisabled}
              >
                Accept
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  onClickMenu = () => {
    this.setState({ drawer: !this.state.drawer });
  };
}

const mapStateToProps = ({ User }) => ({ User });
const mapDispatchToProps = dispatch => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SsoAuthorization);
