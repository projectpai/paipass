import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import PaiPassLogo from 'assets/logo.png';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import Drawer from '@material-ui/core/Drawer';
import MenuItems from 'components/shared/menuItems';
import LinearProgress from '@material-ui/core/LinearProgress';
// import classNames from 'classnames';
const drawerStyle = theme => ({
  paper: {
    width: '38vw',
  },
});
const styles = theme => ({
  header: {
    paddingRight: '48px',
  },
  title: {
    color: ' #1590ea',
    textTransform: 'capitalize',
    fontSize: '18px',
  },
  root: {
    position: 'absolute',
  },
});
const StyledDrawer = withStyles(drawerStyle)(Drawer);

class Header extends Component {
  state = { drawer: false,
  pdp2_sub_active: false};

  onClickMenu = () => {
    this.setState({ drawer: !this.state.drawer });
  };

  render() {
    const { hidden = true } = this.props;
    const these_props = {location: this.props.location, pdp2_sub_status: 'Inactive'};

    return this.props.withDrawer ? (
      <>
        <LinearProgress
          classes={{ root: this.props.classes.root }}
          className="loading"
          hidden={hidden}
        />
        <AppBar position="static" color="default" className="app-bar">
          <Toolbar className={'mt-2'}>
            <IconButton
              color="primary"
              aria-label="Menu"
              onClick={this.onClickMenu}
            >
              <MenuIcon />
            </IconButton>
            <div className={`flex-grow-1 ${this.props.classes.header}`}>
              <div>
                <img
                  className="paipass-logo d-block full-width"
                  src={PaiPassLogo}
                  alt="PaiPass Logo"
                />
              </div>
            </div>
          </Toolbar>
        </AppBar>
        <div>
          <h2 className={`title text-center m-0 ${this.props.classes.title}`}>
            {this.props.subtitle}
          </h2>
        </div>
        {this.props.children}
        <StyledDrawer open={this.state.drawer} onClose={this.onClickMenu}>
          <MenuItems {...these_props}/>
        </StyledDrawer>
      </>
    ) : (
      <div className="row justify-content-center align-items-center">
        <div className="col-xl-4 col-sm-8">
          <img
            className="paipass-logo d-block"
            src={PaiPassLogo}
            alt="PaiPass Logo"
          />
          <div>
            <h2 className={`title text-center m-0 ${this.props.classes.title}`}>
              {this.props.subtitle}
            </h2>
          </div>
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(Header);
