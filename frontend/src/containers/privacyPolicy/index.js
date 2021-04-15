import React from 'react';
import LinearProgress from '@material-ui/core/LinearProgress';
import classnames from 'classnames';
import { Redirect } from 'react-router-dom';
import { Markup } from 'interweave';
import * as R from 'ramda';
import Header from 'components/shared/Header';
import { Link } from 'react-router-dom';
import {Localized} from '@fluent/react';
import {
  URL_BASE,
  SUCCESS_200,
  STATUS_ERROR_400,
  STATUS_ERROR_401,
  STATUS_ERROR_404,
  STATUS_ERROR_422,
} from '../../util';

import './privacyPolicy.scss';

class PrivacyPolicy extends React.Component {
  state = {
    errorMessage: undefined,
    loading: false, // TODO: it could be in the Redux Store.
    goTo: undefined, // TODO: it could be in the Redux Store.
    drawer: false,
    privacy: undefined,
  };

  componentDidMount() {
    const setState = this.setState.bind(this);
    const catchError = R.compose(
      setState,
      R.applySpec({ errorMessage: R.prop('message'), loading: R.F }),
    );
    const transformResponse = R.cond([
      [
        R.compose(
          R.equals(STATUS_ERROR_400),
          R.prop('status'),
        ),
        R.always(new Error('A required parameter was missing.')),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_401),
          R.prop('status'),
        ),
        R.always(
          new Error(
            'The request did not include the required authentication tokens.',
          ),
        ),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_404),
          R.prop('status'),
        ),
        R.always(new Error('Something went wrong.')),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_422),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [
        R.compose(
          R.equals(SUCCESS_200),
          R.prop('status'),
        ),
        res =>
          res.text().then(html => {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            return doc.querySelector('body').innerHTML || '';
          }),
      ],
      [R.T, R.always(new Error('unexpected error occurred.'))],
    ]);
    const checkResponse = R.cond([
      [R.is(Error), catchError],
      [
        R.compose(
          R.not,
          R.isEmpty,
        ),
        R.compose(
          setState,
          res => ({ privacy: res }),
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

    fetch(`${URL_BASE}/docs/privacy.html`, {
      method: 'GET',
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    })
      .then(transformResponse)
      .catch(err => new Error('Something went wrong.', err))
      .then(checkResponse);
  }

  render() {
    const { goTo, loading, errorMessage, privacy } = this.state;

    if (goTo) {
      return <Redirect to={goTo} />;
    }

    return (
      <div className="container-fluid privacy-policy-rt">
        <LinearProgress className="loading" hidden={!loading} />
        <Header subtitle=<Localized id='privacy-policy' value="Privacy Policy"/> />
        <div className="row justify-content-center align-items-center flex-column text-center">
          <div className="mt-3 col-xl-4 col-sm-8 text-center">
            <Link
              to={''}
              className="log-in mt-2"
              onClick={() => {
                this.props.history.length > 2
                  ? this.props.history.goBack()
                  : this.setState({ goTo: '/login' });
              }}
            >
              Go back
            </Link>
          </div>
          <div className="mt-5 col-xl-4 col-sm-8">
            <Markup content={privacy} />
            <div
              className={classnames('error-message', 'p-3', 'text-center', {
                show: !!errorMessage,
              })}
            >
              <span>{errorMessage}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default PrivacyPolicy;
