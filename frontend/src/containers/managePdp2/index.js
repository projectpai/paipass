import React, { Fragment } from 'react';
import Header from 'components/shared/Header';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import AppBar from '@material-ui/core/AppBar';
import { actionUpdateUser, actionUpdateUserError } from 'store/User';
import { getApplications, setCurrent } from 'store/Applications';
import { getAttributes } from 'store/Attributes';

import Box from '@material-ui/core/Box';

import { connect } from 'react-redux';
import Pdp2ProfileSwitch from '../profile/pdp2ProfileSwitch';
import Pdp2Transactions from '../managePdp2Txns';
import { BrowserRouter, Route, Link } from 'react-router-dom';
import './managePdp2.scss';
import { withStyles } from '@material-ui/core/styles';
import SendPdp2DataForm from '../sendPdp2Txn';
import RetrievePdp2Data from '../retrievePdp2Torrent';
import CreatePdp2Data from '../createPdp2Data';
import Pdp2Datasets from '../pdp2Datasets';
import EditDataset from '../editPdp2Dataset'

const actions = {
  actionUpdateUser,
  actionUpdateUserError,
  getApplications,
  getAttributes,
  setCurrent,
};

const appBarStyle = theme => ({

  paper: {
    backgroundColor: theme.palette.common.white,
    color: theme.palette.common.black,
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
          <div> {children}</div>
        </Box>
      )}
    </div>
  );
}

const PATHS = ['/', '/create-data', '/edit-dataset', '/datasets', '/send-data',
  '/retrieve', '/transactions'];

class Pdp2TabPanel extends React.Component {
  state = {
    selectedTab: 0,
    errorMessage: undefined,
    error: {},
    pdp2_sub_status: 'Inactive',
  };

  hasError = state =>
    this.state.error[state] ? this.state.error[state] : false;

  setError = state => value =>
    this.setState(({ error }) => ({ error: { ...error, [state]: value } }));

  tabProps(index) {
    return {
      id: `pdp2-tab-${index}`,
      'aria-controls': `pdp2-tabpanel-${index}`,
    };
  }


  componentDidMount() {
    this.props.accountService.get_pdp2_sub_status().then(response => {
      this.setState({ pdp2_sub_status: response.pdp2_sub_status });
    });


  }


  render() {
    const { pdp2_sub_status } = this.state;
    const handleTabChange = (event, newValue) => {

      for (const [index, path] of PATHS.entries()) {
        if (('/pai-data-sharing' + path) === newValue) {
          this.setState({ selectedTab: index });
          return;
        }
      }

    };
    const getSelectedTabFromPath = (fromPath) => {
      let index = PATHS.length - 1
      while (index > -1){
        const path = PATHS[index]
        if (fromPath.includes('/pai-data-sharing' + path) ) {
          return index;
        }
        index-=1
      }

    }

    const getDatasetId = (pathname) => {
      const subpath = pathname.split('/').slice(-2)[0];
      return subpath ==='pai-data-sharing' ? null : subpath
    }

    const isTabDisabled = pdp2_sub_status !== 'Activated';

    return <div className="container-fluid manage-pdp2-rt">

      <Header withDrawer subtitle="PAI DATA"/>

      <BrowserRouter>
        <Route
          path={'/'}
          render={({ location, match }) => (
            <Fragment>
              <StyledAppBar position="static" className='paper'>

                <Tabs value={location.pathname} onChange={handleTabChange} aria-label="pdp2-tabs">
                  <Tab label="Subscription" value={'/pai-data-sharing' + PATHS[0]}
                       to={'/pai-data-sharing' + PATHS[0]} {...this.tabProps(0)}
                       component={Link}/>
                  <Tab label="Create Data" value={'/pai-data-sharing' + PATHS[1]}
                       to={'/pai-data-sharing' + PATHS[1]} disabled={isTabDisabled} {...this.tabProps(1)}
                       component={Link}/>
                  <Tab label="Edit Dataset" value={'/pai-data-sharing' + PATHS[2]}
                       to={'/pai-data-sharing' + PATHS[2]} disabled={isTabDisabled} {...this.tabProps(2)}
                       component={Link}/>
                  <Tab label="Datasets" value={'/pai-data-sharing' + PATHS[3]}
                       to={'/pai-data-sharing' + PATHS[3]} disabled={isTabDisabled} {...this.tabProps(3)}
                       component={Link}/>


                  <Tab label="Send Data" value={'/pai-data-sharing' + PATHS[4]} to={'/pai-data-sharing' + PATHS[4]}
                       disabled={isTabDisabled} {...this.tabProps(4)} component={Link}/>


                  <Tab label="Retrieve Torrent" value={'/pai-data-sharing' + PATHS[5]}
                       to={'/pai-data-sharing' + PATHS[5]} disabled={isTabDisabled} {...this.tabProps(5)}
                       component={Link}/>
                  <Tab label="Transactions" value={'/pai-data-sharing' + PATHS[6]} to={'/pai-data-sharing' + PATHS[6]}
                       disabled={isTabDisabled} {...this.tabProps(6)} component={Link}/>


                </Tabs>
              </StyledAppBar>


              <Route path={'/pai-data-sharing' + PATHS[0]}
                     render={() => (<TabPanel value={getSelectedTabFromPath(location.pathname)} index={0} className="pdp2-tab-panel">
                       <Pdp2ProfileSwitch
                         key="pdp2_profile_switch"
                         className="mt-2 mb-2"
                         accountService={this.props.accountService}
                       />
                     </TabPanel>)}/>
              <Route path={'/pai-data-sharing' + PATHS[1]}
                     render={() => (<TabPanel value={getSelectedTabFromPath(location.pathname)} index={1} className="pdp2-tab-panel">
                       <CreatePdp2Data
                         accountService={this.props.accountService}/>
                     </TabPanel>)}/>
              <Route path={'/pai-data-sharing' + PATHS[2]}
                     render={() => (<TabPanel value={getSelectedTabFromPath(location.pathname)} index={2} className="pdp2-tab-panel">
                       <EditDataset
                         accountService={this.props.accountService}/>
                     </TabPanel>)}/>
              <Route path={'/pai-data-sharing' + PATHS[3] +'/:datasetId?'}
                     render={() => (<TabPanel value={getSelectedTabFromPath(location.pathname)} index={3} className="pdp2-tab-panel">
                       <Pdp2Datasets accountService={this.props.accountService} datasetId={getDatasetId(this.props.location.pathname)}/>
                     </TabPanel>)}/>
              <Route path={'/pai-data-sharing' + PATHS[4]}
                     render={() => (<TabPanel value={getSelectedTabFromPath(location.pathname)} index={4} className="pdp2-tab-panel">
                       <SendPdp2DataForm
                         accountService={this.props.accountService}/>
                     </TabPanel>)}/>



              <Route path={'/pai-data-sharing' + PATHS[5]}
                     render={() => (<TabPanel value={getSelectedTabFromPath(location.pathname)} index={5} className="pdp2-tab-panel">
                       <RetrievePdp2Data
                         accountService={this.props.accountService}/>
                     </TabPanel>)}/>
              <Route path={'/pai-data-sharing' + PATHS[6]}
                     render={() => (<TabPanel value={getSelectedTabFromPath(location.pathname)} index={6} className="pdp2-tab-panel">
                       <Pdp2Transactions/>
                     </TabPanel>)}/>
            </Fragment>)}/>
      </BrowserRouter>

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
)(Pdp2TabPanel);

