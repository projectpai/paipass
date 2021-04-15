import React from 'react';
import Header from 'components/shared/Header';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import AppBar from '@material-ui/core/AppBar';
import { actionUpdateUser, actionUpdateUserError } from 'store/User';
import { getApplications, setCurrent } from 'store/Applications';
import { getAttributes } from 'store/Attributes';

import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import AcceptedOffer from '../acceptedOffer';
import AttributesList from '../profile/AttributesList';
import { connect } from 'react-redux';
import Pdp2ProfileSwitch from '../profile/pdp2ProfileSwitch';
import { OfferList } from '../acceptedOffer/Offer';
import classnames from 'classnames';
import { Link } from 'react-router-dom';
import './manageOauth.scss'
import { withStyles } from '@material-ui/core/styles';
import * as R from 'ramda';
import Divider from '@material-ui/core/Divider';
import { TextInfo } from '../../components/shared/textInfo';
import Select from '@material-ui/core/Select';
import OutlinedInput from '@material-ui/core/OutlinedInput';
import MenuItem from '@material-ui/core/MenuItem';

const actions = {
  actionUpdateUser,
  actionUpdateUserError,
  getApplications,
  getAttributes,
  setCurrent,
};

const appBarStyle = theme => ({
  paper: {
    width: '38vw',
  },
});


const StyledAppBar = withStyles(appBarStyle)(AppBar);



function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={1}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

class OAuthTabPanel extends React.Component {
  state = {
    selectedTab: 0,
    errorMessage: undefined,
    error: {},
  };

  componentDidMount() {
    this.props.getApplications();

  }

  hasAuthorizedApplications = () => !R.isEmpty(this.props.Applications.data);

  renderSelectApplications = () => {
    return (
      <>
        <Divider className="mt-3 mb-3"/>
        <TextInfo
          message={
            <span>
              <strong>Application-Specific Profile Fields</strong>
              <p>
                Select an application to view profile information that that
                application has stored on your profile.
              </p>
            </span>
          }
        />
        <div className="d-flex align-items-center">
          <Select
            value={this.props.Applications.current}
            fullWidth
            input={<OutlinedInput/>}
            style={{
              marginRight: '25px',
            }}
            onChange={this.handleChange}
            inputProps={{
              name: 'application',
              id: 'application-select',
            }}
          >
            {this.renderMenuItems()}
          </Select>
        </div>
      </>
    );
  };
  renderMenuItems = () => {
    const content = [];
    R.map(app => {
      content.push(<MenuItem value={app.uuid}>{app.name}</MenuItem>);
    }, this.props.Applications.data);
    return content;
  };

  renderAttributesList () {
    const {
      errorMessage,
    } = this.state;
    if (this.props.Applications.current) {
      const { attributes = [], namespace } = this.props.Applications.data[
        this.props.Applications.current
        ];
      return (
        <AttributesList
          attributes={attributes.map(id => this.props.Attributes.data[id])}
          namespace={namespace}
          values={this.props.Values.data}
          errorMessage={this.props.Values.errorMessage}
        />
      );
    }
    return <div className="container-fluid accepted-offer-rt">
      <div className="row justify-content-center align-items-center flex-column">
        <div className="mt-5 col-xl-4 col-sm-8">
          <section>
            {(
              <i className="no-offers">
                You have not accepted any requests to share your data yet.
              </i>
            )}
          </section>

        </div>
        <div className="mt-3 col-xl-4 col-sm-8 text-center">
          <Link className="log-in mt-2" to="/dashboard">
            Return to Dashboard
          </Link>
        </div>
        <div
          className={classnames('error-message', 'p-3', 'text-center', {
            show: !!errorMessage,
          })}
        >
          <span>{errorMessage}</span>
        </div>
      </div>
    </div>
  };

  hasError = state =>
    this.state.error[state] ? this.state.error[state] : false;

  setError = state => value =>
    this.setState(({ error }) => ({ error: { ...error, [state]: value } }));

  tabProps(index) {
    return {
      id: `oauth-tab-${index}`,
      'aria-controls': `oauth-tabpanel-${index}`,
    };
  }



  render() {
    const {selectedTab} = this.state;
    const handleTabChange = (event, newValue) => {
      this.setState({selectedTab: newValue});
    };



    return <div className="container-fluid manage-oauth-rt">

      <Header withDrawer subtitle="Your OAuth2 Data"/>

      <StyledAppBar position="static">
        <Tabs value={selectedTab} onChange={handleTabChange} aria-label="oauth-tabs">
          <Tab label="Manage Permissions" {...this.tabProps(0)}/>
          <Tab label="View/Change Shared Data" {...this.tabProps(1)} />
        </Tabs>
      </StyledAppBar>
      <TabPanel value={selectedTab} index={0}>
        <AcceptedOffer key="accepted_offer_component"
                       className="mt-2 mb-2"
                       accountService={this.props.accountService}/>
      </TabPanel>
      <TabPanel value={selectedTab} index={1}>
        {this.hasAuthorizedApplications() &&
        this.renderSelectApplications()}
        {this.renderAttributesList()}
      </TabPanel>
    </div>;

  }
}

const mapStateToProps = ({ User, Applications, Attributes, Values }) => ({
  User,
  Applications,
  Attributes,
  Values,
});

export default connect(
  mapStateToProps,
  actions,
)(OAuthTabPanel);

