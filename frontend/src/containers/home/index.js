import React from 'react';
import Button from '@material-ui/core/Button';
import { Link } from 'react-router-dom';
import Header from 'components/shared/Header';
import { Localized} from "@fluent/react";

import './home.scss';



export const Home = props => {
  return (
    <div className="container-fluid login-rt">

      <Header />
      <div className="row justify-content-center align-items-center">
        <div className="col-xl-4 col-sm-8">
          <div className="container-fluid">
            <Link to="/login">
              <Button
                className="d-block secondary mb-2"
                size="large"
                fullWidth
                variant="outlined"
                color="primary"
              >
                <Localized id="login">
                  Login
                </Localized>
              </Button>
            </Link>
            <Link to="signup">
              <Button
                className="d-block primary"
                size="large"
                fullWidth
                variant="contained"
                color="primary"
              >
                <Localized id="sign-up">
                  Sign Up
                </Localized>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
