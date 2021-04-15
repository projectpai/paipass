import React from 'react';
import Button from '@material-ui/core/Button';
import classnames from 'classnames';
import { connect } from 'react-redux';
import LinearProgress from '@material-ui/core/LinearProgress';
import { Redirect, Link } from 'react-router-dom';
import Header from 'components/shared/Header';

class AccountAuthentication extends React.Component {
  state = {
    errorMessage: undefined,
    loading: true, // TODO: it could be in the Redux Store.
    goTo: undefined, // TODO: it could be in the Redux Store.
  };

  componentDidMount() {
    const { User } = this.props;
    if (User.premiumLevel === 'FREE') {
      this.props.history.push('/premium');
    } else {
      this.setState({ loading: false });
    }
  }

  render() {
    const { goTo, errorMessage, loading } = this.state;

    if (goTo) {
      return <Redirect to={goTo} />;
    }

    return (
      <div className="container-fluid signup-rt">
        <LinearProgress className="loading" hidden={!loading} />
        <Header subtitle="Account Authentication" />
        {!loading && (
          <div className="row justify-content-center align-items-center">
            <div className="mt-5 col-xl-4 col-sm-8">
              <div className="container-fluid">
                <p className="subtitle text-center">
                  <strong>Our Authentication process helps us</strong>
                  <strong> establish that you are who you say you are.</strong>
                </p>
                <div className="form">
                  <div
                    className={classnames(
                      'error-message',
                      'p-3',
                      'text-center',
                      { show: !!errorMessage },
                    )}
                  >
                    <span>{errorMessage}</span>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <Link to="/account-name">
                    <Button
                      className="d-block primary mb-2"
                      size="large"
                      fullWidth
                      variant="contained"
                      color="primary"
                    >
                      Begin Authentication
                    </Button>
                  </Link>
                  <Link to="dashboard">
                    <Button
                      className="d-block primary"
                      size="large"
                      fullWidth
                      variant="contained"
                      color="primary"
                    >
                      Authenticate Later
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

const mapStateToProps = ({ User }) => ({ User });

export default connect(mapStateToProps)(AccountAuthentication);
