import React from 'react';
import { connect } from 'react-redux';
import { Redirect, Link } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import * as R from 'ramda';
import classnames from 'classnames';
import { List } from 'immutable';
import Header from 'components/shared/Header';
import RequestedItem from '../authorization/requestedItem';
import {
  AuthorizeDetailsEntity,
  ScopesDetailsEntity,
  OwnerScopeEntity,
  SCOPE_APPROVED,
  SCOPE_DENIED,
} from '../../entities/AuthorizeDetails';

import {Localized, withLocalization} from '@fluent/react';

import '../authorization/authorization.scss';

class ManageAuthorization extends React.Component {
  state = {
    errorMessage: undefined,
    successMessage: undefined,
    loading: true, // TODO: it could be in the Redux Store.
    goTo: undefined, // TODO: it could be in the Redux Store.
    drawer: false,
    details: new AuthorizeDetailsEntity(),
    hasChanges: false,
  };

  componentDidMount() {
    const {
      match: { params },
    } = this.props;
    const setState = this.setState.bind(this);
    const catchError = R.compose(
      setState,
      R.applySpec({ errorMessage: R.prop('message'), loading: R.F }),
    );
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
        scopes: List(createScopes(detail.scopes)),
      });
    };

    const transformResponse = R.cond([
      [R.is(Error), catchError],
      [
        R.propSatisfies(
          R.compose(
            R.not,
            R.isEmpty,
          ),
          'name',
        ),
        R.compose(
          setState,
          R.applySpec({
            details: createDetailsObj,
            loading: R.F,
          }),
        ),
      ],
      [
        R.T,
        R.compose(
          setState,
          R.always({ errorMessage: 'Something went wrong!', loading: false }),
        ),
      ],
    ]);

    this.props.accountService
      .getApplication({ applicationUUID: params.uuid })
      .then(transformResponse)
      .catch(catchError);
  }

  render() {
    const {
      goTo,
      loading,
      details,
      errorMessage,
      successMessage,
      hasChanges,
    } = this.state;
    const {getString} = this.props;

    this.getString = getString;

    if (goTo) {
      return <Redirect to={goTo} />;
    }

    const renderRequestedItems = R.map(scope => (
      <RequestedItem
        key={scope.name}
        className="mt-2 mb-2"
        requestedScope={scope.name}
        nameApp={scope.owner.name}
        description={scope.description || scope.owner.description}
        permissions={scope.accessLevel}
        namespace={scope.namespace}
        status={scope.approvalStatus}
        onChange={(targetName, status) =>
          this.onChangeStatus({ scope, status })
        }
      />
    ));

    return (
      <div className="container-fluid authorization-rt">
        <Header
          withDrawer
          subtitle={`Offer from ${details.name}`}
          hidden={!loading}
        />
        <div className="row justify-content-center align-items-center flex-column text-center">
          <div className="mt-5 col-xl-4 col-sm-8">
            <div className="mb-1">
              <p>{details.description}</p>
              <p>
                {details.name} is requested access to following information from
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
              <div
                className={classnames(
                  'success-message',
                  'p-3',
                  'text-center',
                  'mt-4',
                  {
                    show: !!successMessage,
                  },
                )}
              >
                <span>{successMessage}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 col-xl-4 col-sm-8 text-center">
            <Button
              variant="outlined"
              color="primary"
              className="primary mb-3"
              onClick={this.onSave}
              disabled={!hasChanges}
              fullWidth
            >
              <Localized id={'save'} value="Save"/>
            </Button>
            <Link className="log-in mt-2" to="/manage-oauth-permissions">
              <Localized id={'cancel'} value="Cancel" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  onClickMenu = () => {
    this.setState({ drawer: !this.state.drawer });
  };

  onChangeStatus = ({ scope, status }) => {
    const index = this.state.details.scopes.indexOf(scope);
    const item = scope.set(
      'approvalStatus',
      status ? SCOPE_APPROVED : SCOPE_DENIED,
    );
    const newScope = this.state.details.scopes.set(index, item);
    const newDetails = this.state.details.set('scopes', newScope);

    this.setState({ details: newDetails, hasChanges: true });
  };

  onSave = () => {
    const {
      match: { params },
    } = this.props;
    this.setState({
      errorMessage: undefined,
      successMessage: undefined,
      loading: true,
    });

    const setState = this.setState.bind(this);
    const catchError = R.compose(
      setState,
      R.applySpec({ errorMessage: R.prop('message'), loading: R.F }),
    );
    const transformResponse = R.cond([
      [R.is(Error), catchError],
      [
        R.equals(true),
        R.compose(
          setState,
          R.always({
            errorMessage: undefined,
            successMessage: this.getString('saved-successfully'),
            loading: false,
            hasChanges: false,
          }),
        ),
      ],
      [
        R.T,
        R.compose(
          setState,
          R.always({ errorMessage: 'Something went wrong!', loading: false }),
        ),
      ],
    ]);
    const permissions = this.state.details.scopes.map(scope => ({
      approvalStatus: scope.approvalStatus,
      scope: `${scope.accessLevel}.${scope.namespace}.${scope.name}`,
    }));

    this.props.accountService
      .changeApplication({ applicationUUID: params.uuid, permissions })
      .then(transformResponse)
      .catch(catchError);
  };
}

const mapStateToProps = ({ User }) => ({ User });
const mapDispatchToProps = dispatch => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withLocalization(ManageAuthorization));
