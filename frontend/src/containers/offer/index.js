import React from 'react';
import { connect } from 'react-redux';
import { Redirect } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import Header from 'components/shared/Header';
import './offer.scss';

class Offer extends React.Component {
  state = {
    errorMessage: undefined,
    loading: false, // TODO: it could be in the Redux Store.
    goTo: undefined, // TODO: it could be in the Redux Store.
  };

  render() {
    const { goTo, loading } = this.state;

    if (goTo) {
      return <Redirect to={goTo} />;
    }

    return (
      <div className="container-fluid offer-rt">
        <Header withDrawer hidden={!loading} />
        <div className="container-fluid d-flex justify-content-center flex-column text-center">
          <h2>Offer from PAI YO</h2>
          <div className="mb-5">
            <p>
              PAI Yo, a new application that allows you to create your own
              personal artifical intelligence, wants you to download their
              application.
            </p>
            <p>
              To be eligible to participate, you must grant PAI Yo access to
              certain information associated with your PAIPass Profile.
            </p>
            <p>
              To accept their offer, you must agree to share the following
              information with PAI Yo:
            </p>
            <div className="request-items">
              <span>Full Name</span>
              <span>Gender</span>
            </div>
            <p>Would you like to accept this offer from PAI Yo?</p>
          </div>
          <div className="d-flex justify-content-center mt-5 col-12 col-lg-6 m-lg-auto">
            <Button
              variant="outlined"
              color="primary"
              className="m-1 blue-2 mr-4"
              fullWidth
            >
              Decline
            </Button>
            <Button
              variant="outlined"
              color="primary"
              className="m-1 blue-2 ml-4"
              fullWidth
            >
              Accept
            </Button>
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
)(Offer);
