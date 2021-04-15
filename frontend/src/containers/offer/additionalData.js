import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { connect } from 'react-redux';
import LinearProgress from '@material-ui/core/LinearProgress';
import { Redirect } from 'react-router-dom';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Drawer from '@material-ui/core/Drawer';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';

import PaiPassLogo from '../../assets/logo.png';
import MenuItems from '../../components/shared/menuItems';

import './offer.scss';

const drawerStyle = theme => ({
  paper: {
    width: '38vw'
  }
});

const StyledDrawer = withStyles(drawerStyle)(Drawer);

class AdditionalDataOffer extends React.Component {
  state = {
    errorMessage: undefined,
    loading: false, // TODO: it could be in the Redux Store.
    goTo: undefined, // TODO: it could be in the Redux Store.
    drawer: false
  };

  render() {
    const { goTo, loading } = this.state;

    if (goTo) {
      return <Redirect to={goTo} />;
    }

    return (
      <div className="container-fluid offer-rt">
        <LinearProgress className="loading" hidden={!loading} />
        <AppBar position="static" color="default" className="app-bar">
          <Toolbar>
            <IconButton
              color="primary"
              aria-label="Menu"
              onClick={this.onClickMenu}
            >
              <MenuIcon />
            </IconButton>
            <div className="flex-grow-1">
              <div>
                <img
                  className="paipass-logo d-block full-width"
                  src={PaiPassLogo}
                  alt="PaiPass Logo"
                />
              </div>
              <div>
                <h2 className="title text-center m-0">Offers</h2>
              </div>
            </div>
          </Toolbar>
        </AppBar>
        <StyledDrawer open={this.state.drawer} onClose={this.onClickMenu}>
          <MenuItems />
        </StyledDrawer>
        <div className="container-fluid d-flex justify-content-center flex-column text-center">
          <h2 className="mb-0">Offer from PAI YO</h2>
          <h2 className="m-0">Additional Data Needed</h2>
          <div className="mb-5">
            <p>
              To be eligible to accept the current offer from PAI Yo, you must
              grant PAI Yo access to certain information associated with your
              PAIPass Profile.
            </p>
            <p>
              PAI Yo has requested the following information which is not
              associated with your PAI Pass Profile:
            </p>
            <div className="request-items">
              <TextField
                margin="normal"
                value="gender"
                variant="outlined"
                label="Information"
                fullWidth
                select
              >
                <MenuItem value="gender">Gender</MenuItem>
              </TextField>
            </div>
            <p>
              If you wish to accept this offer, please make a selection above
              and confirm that you authorize PAIPass to add this information to
              your PAIPass Profile and share the information with PAI Yo.
            </p>
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

  onClickMenu = () => {
    this.setState({ drawer: !this.state.drawer });
  };
}

const mapStateToProps = ({ User }) => ({ User });
const mapDispatchToProps = dispatch => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AdditionalDataOffer);
