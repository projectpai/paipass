import React from 'react';
import MenuItem from '@material-ui/core/MenuItem';
import { makeStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from "@material-ui/core/ListItem"
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import { Link } from 'react-router-dom';
import { Localized} from "@fluent/react";

import Collapse from '@material-ui/core/Collapse';

import './menuItems.scss';
import { ListItemText } from '@material-ui/core';

const SHARED_DATA_TITLE = 'Shared Data';

const menuStyles = makeStyles((theme) => ({
  rootItem: {
    width: '100%',
    maxWidth: 350,
    color: 'black',
    //alignItems:"center",
    //justifyContent: 'center',



  },
  nestedItem: {
    paddingLeft: theme.spacing(4),
    color: 'black',
  },
}));




function MenuItems(props) {


  const menu_classes = menuStyles();
  const [isSharedDataOpen, setSharedDataOpen] = React.useState(false);
  const onClickSharedData = () => {
    setSharedDataOpen(!isSharedDataOpen);
  };

  const items = [
    { title: SHARED_DATA_TITLE, to: '/shared-data', l10n_id: 'shared-data' },
    { title: 'Settings', to: '/settings', l10n_id: 'settings'},
    { title: 'Profile', to: '/profile', l10n_id: 'profile' },
    { title: 'Logout', to: '/logout', l10n_id: 'logout' },
  ];

  return (<div >
    {(!props.location || props.location.pathname !== '/dashboard') &&
    <ListItem to='/dashboard'  component={Link} className={menu_classes.rootItem}>
      <ListItemText primary={<Localized id="dashboard" value="Dashboard"/>}  />
    </ListItem>
    }
    {items.map(item => {
      const is_shared_data_list_item = item.title === SHARED_DATA_TITLE;
      if ( is_shared_data_list_item) {
        return (<div><ListItem button onClick={onClickSharedData} className={menu_classes.rootItem}>
            <ListItemText primary=<Localized id={item.l10n_id} value={item.title} /> />
            {isSharedDataOpen ? <ExpandLess /> : <ExpandMore />}

          </ListItem>
            <Collapse in={isSharedDataOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <ListItem to={'/manage-oauth-permissions'} className={menu_classes.nestedItem} component={Link}>
                  <ListItemText primary="OAuth 2.0" />
                </ListItem>
                <ListItem to={'/pai-data-sharing/'} className={menu_classes.nestedItem} component={Link}>
                  <ListItemText primary="PAI Data (PDP2)" />
                </ListItem>
                <ListItem to={'/pai-messages/'} className={menu_classes.nestedItem} component={Link}>
                  <ListItemText primary="PAI Messages" />
                </ListItem>
              </List>
            </Collapse>

          </div>

        )
      } else {
        return <ListItem key={item.to + item.title} to={item.to} component={Link} className={menu_classes.rootItem} >
          <ListItemText primary=<Localized id={item.l10n_id} value={item.title} />  />
        </ListItem>
      }

    })}
  </div>)
}

//MenuItems.propTypes = {};
export default MenuItems;
