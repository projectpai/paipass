import React from 'react';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import { Link } from 'react-router-dom';
import {Localized} from '@fluent/react';
import Header from '../Header';
import { useLocation } from 'react-router-dom';

const styles = theme => ({
  footer: {
    backgroundColor: '#f5f5f5',
    bottom: 0,
    width: '100%',
    flexShrink: 0,
    marginTop: theme.spacing.unit * 8,
    padding: `${theme.spacing.unit * 3}px 0`,
  },
});

const FooterActual = props => {

}

const Footer = props => {
  const  loc = useLocation();
  const isInIframe = window.top !== window.self
  if (!isInIframe){
    return (<footer className={props.classes.footer}>
      <div className="container">
        <Typography
          variant="subtitle1"
          align="center"
          color="textSecondary"
          component="p"
        >
          <Link to={'/terms-of-service'}><Localized id='terms-of-service' value="Terms of Service"/> </Link>
        </Typography>
        <Typography
          variant="subtitle1"
          align="center"
          color="textSecondary"
          component="p"
        >
          <Link to={'/privacy-policy'}><Localized id='privacy-policy' value="Privacy Policy"/> </Link>
        </Typography>
      </div>
    </footer>)
  }
  return null;
};
export default withStyles(styles)(Footer);
