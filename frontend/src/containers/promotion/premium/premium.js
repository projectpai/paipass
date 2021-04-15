import React from 'react';
import { Link } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import LinearProgress from '@material-ui/core/LinearProgress';

import PaiPassLogo from '../../../assets/logo.png';

const Premium = ({ loading, handleUpgrade }) => {
  return (
    <div className="container-fluid signup-rt">
      <LinearProgress className="loading" hidden={!loading} />
      <div className="row justify-content-center align-items-center">
        <div className="col-xl-4 col-sm-8">
          <img
            className="paipass-logo d-block"
            src={PaiPassLogo}
            alt="PaiPass Logo"
          />
          <h2 className="text-center">Premium promotion</h2>
          <div className="container-fluid">
            <p>
              For a limited time, you can upgrade your account to a premium
              account for free. Having a premium account allows you to verify
              your identity trough PAI Pass.
            </p>
          </div>
          <div className="container-fluid">
            <Button
              className="d-block primary mb-2"
              size="large"
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleUpgrade}
              title=""
            >
              <span>Upgrade to premium</span>
            </Button>
            <Link to="/dashboard">
              <Button
                className="d-block primary"
                size="large"
                fullWidth
                variant="contained"
                color="primary"
              >
                <span>Continue without upgrading</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Premium;
