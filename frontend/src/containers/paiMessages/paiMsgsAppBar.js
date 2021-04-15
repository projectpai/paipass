import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import Badge from '@material-ui/core/Badge';
import MenuItem from '@material-ui/core/MenuItem';
import Menu from '@material-ui/core/Menu';
import MenuIcon from '@material-ui/icons/Menu';
import DeleteIcon from '@material-ui/icons/Delete';
import MoreIcon from '@material-ui/icons/MoreVert';
import Button from '@material-ui/core/Button';

import Dialog from '@material-ui/core/Dialog';

const useStyles = makeStyles((theme) => ({
  appbar: {
    // alignItems: 'center',
    justifyContent: 'space-between',

  },
  grow: {
    flexGrow: 1,


  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    display: 'none',
    [theme.breakpoints.up('sm')]: {
      display: 'block',
    },
  },
  search: {
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    marginLeft: theme.spacing(3),
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      width: 'auto',
    }, [theme.breakpoints.down('xs')]: {
      // width: '100%',
    },
  },

  inputRoot: {
    color: 'inherit',
  },

  sectionDesktop: {
    display: 'none',
    [theme.breakpoints.up('md')]: {
      display: 'flex',
    },
  },
  sectionMobile: {
    display: 'flex',
    [theme.breakpoints.up('md')]: {
      display: 'none',
    },
  },

  deleteThreadButtonGroup: {
    display: 'flex',
    justifyContent: 'space-around',
  },
}));

function DeleteThreadDialog(props) {
  const classes = useStyles();

  console.log('props.isDialogOpen', props.isDialogOpen);
  return (
    <Dialog
      onClose={props.handleDialogClose}
      open={props.isDialogOpen}
    >
      <div style={{ padding: '10px' }}>

          <Typography> Are you sure you want to delete this thread?</Typography>

        <div className={classes.deleteThreadButtonGroup}>
          <Button variant="contained" onClick={props.handleDialogClose}>Close</Button>
          <Button variant="contained"
                  style={{ backgroundColor: '#ff1744', color: 'white' }}
                  onClick={()=>{
                    props.handleDeleteThread()
                    props.handleDialogClose()

                  }}
          >
            Delete Thread
          </Button>
        </div>
      </div>
    </Dialog>

  );
}

export default function PaiMsgsAppBar(props) {
  const { handleDrawerToggle, threadName, openDrawer } = props;
  const classes = useStyles();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = React.useState(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const isMenuOpen = Boolean(anchorEl);
  const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
  };

  const handleDeleteDialogOpen = () => {
    setDeleteDialogOpen(true);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMoreAnchorEl(null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    handleMobileMenuClose();
  };

  const handleMobileMenuOpen = (event) => {
    setMobileMoreAnchorEl(event.currentTarget);
  };

  const menuId = 'primary-search-account-menu';
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      id={menuId}
      keepMounted
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      open={false}
      onClose={() => {
      }}
    >
      <MenuItem onClick={handleMenuClose}>Profile</MenuItem>
      <MenuItem onClick={handleMenuClose}>My account</MenuItem>
    </Menu>
  );

  const mobileMenuId = 'primary-search-account-menu-mobile';
  const renderMobileMenu = (
    <Menu
      anchorEl={mobileMoreAnchorEl}
      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      id={mobileMenuId}
      keepMounted
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      open={isMobileMenuOpen}
      onClose={handleMobileMenuClose}
    >
      <MenuItem onClick={handleDeleteDialogOpen}>
        <IconButton aria-label="delete thread" color="inherit" >
          <Badge color="secondary">
            <DeleteIcon/>
          </Badge>
        </IconButton>
        Delete Thread
      </MenuItem>
    </Menu>
  );

  return (
    <div className={classes.grow}>
      <AppBar className={classes.appbar} position="static">
        <DeleteThreadDialog
          isDialogOpen={isDeleteDialogOpen}
          handleDialogClose={handleDeleteDialogClose}
          handleDeleteThread={props.handleDeleteThread}
        />
        <Toolbar>
          <IconButton
            edge="start"
            className={classes.menuButton}
            color="inherit"
            aria-label="open drawer"
            open={openDrawer}
            onClick={handleDrawerToggle}
            onClose={handleDrawerToggle}
          >
            <MenuIcon/>
          </IconButton>

          <div className={classes.search}>
            <Typography variant="h6" noWrap>
              {threadName}
            </Typography>
          </div>
          <div className={classes.grow}/>
          <div className={classes.sectionDesktop}>
            <IconButton
              aria-label="delete thread"
              color="inherit"
              onClick={handleDeleteDialogOpen}
            >
              <Badge color="secondary">
                <DeleteIcon/>
              </Badge>
            </IconButton>
          </div>
          <div className={classes.sectionMobile}>
            <IconButton
              aria-label="show more"
              aria-controls={mobileMenuId}
              aria-haspopup="true"
              onClick={handleMobileMenuOpen}
              color="inherit"
            >
              <MoreIcon/>
            </IconButton>
          </div>
        </Toolbar>
      </AppBar>
      {renderMobileMenu}
      {renderMenu}
    </div>
  );
}
