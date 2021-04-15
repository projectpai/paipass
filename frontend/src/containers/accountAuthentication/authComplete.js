import React from 'react';
import Button from '@material-ui/core/Button';
import classnames from 'classnames';
import { connect } from 'react-redux';
import LinearProgress from '@material-ui/core/LinearProgress';
import { Redirect, Link } from 'react-router-dom';

import PaiPassLogo from '../../assets/logo.png';
import './authComplete.scss';

class AuthComplete extends React.Component {
  state = {
    errorMessage: undefined,
    loading: false, // TODO: it could be in the Redux Store.
    goTo: undefined, // TODO: it could be in the Redux Store.
  };

  render() {
    const { goTo, errorMessage, loading } = this.state;

    if (goTo) {
      return <Redirect to={goTo} />;
    }

    return (
      <div className="container-fluid auth-complete-rt">
        <LinearProgress className="loading" hidden={!loading} />
        <div className="row justify-content-center align-items-center">
          <div className="col-xl-4 col-sm-8">
            <img
              className="paipass-logo d-block"
              src={PaiPassLogo}
              alt="PaiPass Logo"
            />
            <div className="container-fluid mt-5">
              <h2 className="title">Welcome!</h2>
              <div className="form text-center pb-5">
                <p>
                  As an authenticated user of PAIPass, you can use your PAIPass
                  credentials to signin to supported apps and services.
                </p>
                <p>
                  Go to your PAIPass Dashboard to view supported services and
                  developer offers.
                </p>
                <div
                  className={classnames('error-message', 'p-3', 'text-center', {
                    show: !!errorMessage,
                  })}
                >
                  <span>{errorMessage}</span>
                </div>
              </div>
              <div className="text-center mt-5">
                <Link to="/dashboard">
                  <Button
                    className="d-block blue"
                    size="large"
                    fullWidth
                    variant="contained"
                    color="primary"
                  >
                    PAIPass Dashboard
                  </Button>
                </Link>
              </div>
            </div>
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
)(AuthComplete);
