import React from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import classnames from 'classnames';
import { connect } from 'react-redux';
import LinearProgress from '@material-ui/core/LinearProgress';
import { Redirect, Link } from 'react-router-dom';

import PaiPassLogo from '../../assets/logo.png';
import { actionUpdateIdentity } from '../../store/VideoAuthentication';

class NameSetup extends React.Component {
  state = {
    errorMessage: undefined,
    loading: false, // TODO: it could be in the Redux Store.
    goTo: undefined, // TODO: it could be in the Redux Store.
    name: '',
  };

  render() {
    const { goTo, errorMessage, loading, name } = this.state;

    if (goTo) {
      return <Redirect to={goTo} />;
    }

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
            <div className="container-fluid">
              <h2>What is your Name?</h2>
              <p className="subtitle text-center">
                <strong>
                  Please enter your name as it appears on Your ID.
                </strong>
              </p>
              <div className="form">
                <TextField
                  label="Full Name"
                  type="Full Name"
                  name="fullname"
                  autoComplete="Full Name"
                  margin="normal"
                  variant="outlined"
                  value={name}
                  onChange={this.onNameChange}
                  fullWidth
                />
                <p className="subtitle text-center">
                  <strong>
                    Next, we will ask you to record a video of yourself holding
                    up your ID and saying words we display on the screen.
                  </strong>
                </p>
                <div
                  className={classnames('error-message', 'p-3', 'text-center', {
                    show: !!errorMessage,
                  })}
                >
                  <span>{errorMessage}</span>
                </div>
              </div>
              <div className="text-center mt-2">
                <Button
                  className="d-block primary mb-3"
                  size="large"
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={this.onBeginAuth}
                >
                  Begin Video Authentication
                </Button>
                <Link className="log-in" to="/dashboard">
                  Cancel Authentication
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  onNameChange = ({ target: { value } }) => this.setState({ name: value });
  onBeginAuth = () => {
    this.setState({ loading: true, errorMessage: undefined });
    if (!this.state.name) {
      this.setState({
        errorMessage: 'Full name can not be empty',
        loading: false,
      });
    } else {
      try {
        this.props.accountService
          .nameSetup({ fullName: this.state.name })
          .then(response => {
            if (response instanceof Error) {
              this.setState({ errorMessage: response.message, loading: false });
            } else if (response.hasOwnProperty('words')) {
              this.props.updateIdentity(response);
              this.setState({ goTo: '/video-authentication' });
            } else {
              this.setState({
                errorMessage: 'unexpected error occurred.',
                loading: false,
              });
            }
          });
      } catch (err) {
        this.setState({
          errorMessage: 'unexpected error occurred.',
          loading: false,
        });
      }
    }
  };
}

const mapStateToProps = ({ User, VideoAuthentication }) => ({
  User,
  VideoAuthentication,
});
const mapDispatchToProps = dispatch => ({
  updateIdentity(identity) {
    dispatch(actionUpdateIdentity(identity));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(NameSetup);
