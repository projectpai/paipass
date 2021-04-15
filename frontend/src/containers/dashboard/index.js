import React from 'react';
import { connect } from 'react-redux';
import { Redirect, Link } from 'react-router-dom';
import StarIcon from '@material-ui/icons/StarRate';
import InfoIcon from '@material-ui/icons/Info';
import WarningIcon from '@material-ui/icons/Warning';
import { withStyles } from '@material-ui/core/styles';
import * as R from 'ramda';
import { List } from 'immutable';
import MenuItems from '../../components/shared/menuItems';
import { UserProfileEntity } from '../../entities/Profile';
import { OfferEntity } from '../../entities/Offer';
import Header from 'components/shared/Header';
import { Localized} from "@fluent/react";

import './dashboard.scss';
const WarningStyles = {
  root: {
    color: 'orange',
  },
};

const WarningIconStyled = withStyles(WarningStyles)(WarningIcon);

class Dashboard extends React.Component {
  state = {
    errorMessage: undefined,
    loading: false, // TODO: it could be in the Redux Store.
    goTo: undefined, // TODO: it could be in the Redux Store.
    drawer: false,
    profile: new UserProfileEntity(this.props.User),
    items: List(),
  };

  componentDidMount() {
    this.setState({ loading: true });

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
    const { goTo, loading, profile, items } = this.state;

    if (goTo) {
      return <Redirect to={goTo} />;
    }

    const renderInfoIcon = R.cond([
      [
        R.whereEq({ accountVerified: 'VERIFIED' }),
        R.always(<StarIcon color="primary" />),
      ],
      [
        R.whereEq({
          accountVerified: 'UNVERIFIED',
          ongoingNameVerification: true,
        }),
        R.always(<WarningIconStyled />),
      ],
      [
        R.T,
        R.always(
          <Link to="/account-authentication">
            <InfoIcon color="error" />
          </Link>,
        ),
      ],
    ]);
    const these_props = {location: this.props.location, pdp2_sub_status: 'Inactive'};
    return (
      <div className="container-fluid dashboard-rt">
        <Header withDrawer subtitle=<Localized id="dashboard" value="Dashboard" /> hidden={!loading} />
        <div className="sub-menu">
          <div>
            {renderInfoIcon(profile)}
            <span><Localized id="authentication-status" value="Authentication Status" /></span>
          </div>
          <div style={{ display: 'none' }}>
            <p className="m-1">{items.size}</p>
            <span>Data Requests</span>
          </div>
          <div>
            <p className="m-1">{items.size}</p>
            <span><Localized id="accepted-data-requests" value="Accepted Data Requests" /></span>
          </div>
        </div>
        <div className="row mt-5">
          <div className="col-12 col-md-6 m-auto">
            <MenuItems {...these_props} />
          </div>
        </div>
      </div>
    );
  }

  onClickMenu = () => {
    this.setState({ drawer: !this.state.drawer });
  };
}

const mapStateToProps = ({ User }) => ({ User });

export default connect(mapStateToProps)(Dashboard);
