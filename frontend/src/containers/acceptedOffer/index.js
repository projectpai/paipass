import React from 'react';
import { connect } from 'react-redux';
import { Redirect, Link } from 'react-router-dom';
import { List } from 'immutable';
import * as R from 'ramda';
import classnames from 'classnames';
import { OfferList } from './Offer';
import { OfferEntity } from '../../entities/Offer';
import './acceptedOffer.scss';

class AcceptedOffer extends React.Component {
  state = {
    errorMessage: undefined,
    loading: true, // TODO: it could be in the Redux Store.
    goTo: undefined, // TODO: it could be in the Redux Store.
    items: List(),
  };

  componentDidMount(props, state) {
    const setState = this.setState.bind(this);
    const catchError = R.compose(
      setState,
      R.applySpec({ errorMessage: R.prop('message'), loading: R.F }),
    );
    const transformResponse = R.cond([
      [R.is(Error), catchError],
      [
        R.propSatisfies(
          R.compose(
            R.not,
            R.isEmpty,
          ),
          'records',
        ),
        R.compose(
          setState,
          R.applySpec({
            items: offers =>
              new List(R.map(offer => new OfferEntity({ ...offer }), offers)),
            loading: R.F,
          }),
          R.prop('records'),
        ),
      ],
      [
        R.propEq('totalRecords', 0),
        R.compose(
          setState,
          R.applySpec({ loading: R.F }),
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
      .getApplications()
      .then(transformResponse)
      .catch(catchError);
  }

  render() {
    const { goTo, loading, errorMessage, items } = this.state;

    if (goTo) {
      return <Redirect to={goTo} />;
    }

    const onRevokeItem = ({ uuid }) => {
      this.setState({ loading: true, errorMessage: '' });
      const setState = this.setState.bind(this);
      const catchError = R.compose(
        setState,
        R.applySpec({ errorMessage: R.prop('message'), loading: R.F }),
      );
      const itemIndex = items.findIndex(e => e.uuid === uuid);
      const newitems = items.delete(itemIndex);
      const transformResponse = R.cond([
        [
          R.is(Error),
          R.compose(
            setState,
            R.applySpec({ errorMessage: R.prop('message'), loading: R.F }),
          ),
        ],
        [
          R.equals(true),
          R.compose(
            setState,
            R.always({
              items: newitems,
              errorMessage: '',
              loading: false,
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
        .revokeApplication({ applicationUUID: uuid })
        .then(transformResponse)
        .catch(catchError);
    };

    return (
      <div className="container-fluid accepted-offer-rt">
        <div className="row justify-content-center align-items-center flex-column">
          <div className="mt-5 col-xl-4 col-sm-8">
            <section>
              {items.size ? (
                <OfferList items={items} onRevoke={onRevokeItem.bind(this)} />
              ) : (
                <i className="no-offers">
                  You have not accepted any requests to share your data yet.
                </i>
              )}
            </section>
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
          <div className="mt-3 col-xl-4 col-sm-8 text-center">
            <Link className="log-in mt-2" to="/dashboard">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = ({ User }) => ({ User });
const mapDispatchToProps = dispatch => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(AcceptedOffer);
