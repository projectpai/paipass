import React, { Component } from 'react';
import Select from '@material-ui/core/Select';
import { connect } from 'react-redux';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import * as R from 'ramda';
import Divider from '@material-ui/core/Divider';
import Typography from '@material-ui/core/Typography';

import { withStyles } from '@material-ui/styles';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';

import * as actions from './actions';

import './createData.scss';

import CreateTemplate from './createTemplate';
import CreateDataset from './createDataset';

const styles = theme => ({
  root: {
    display: 'flex',
    justifyContent: 'space-between',
    flexDirection: 'column',

  },
  child: {
    display: 'flex',
    flex: 'flex-grow',
    justifyContent: 'space-evenly',
    flexDirection: 'row',
    margin: theme.spacing(0.75),
  },
  divider: {
    padding: '20px',
  },
  savedTemplate: {
    display: 'flex',
    justifyContent: 'space-evenly',
    flexDirection: 'column',
  },
});


const NEW_TEMPLATE_PATH = 'NEW_TEMPLATE_PATH';
const NEW_DATASET_PATH = 'NEW_DATASET_PATH';

class CreatePdp2Data extends Component {
  constructor(props) {
    super(props);
    this.state = { path: null, activeStep: 0, selectedSchema: '' };
    this.onStepChange = this.onStepChange.bind(this);
    this.onSchemaSelected = this.onSchemaSelected.bind(this);
  }


  render() {
    const { classes } = this.props;
    const { path } = this.state;
    if (path === null) {
      return this.getInitialState(classes);
    } else if (path === NEW_TEMPLATE_PATH) {
      return this.renderCreateTemplateComp();
    } else if (path === NEW_DATASET_PATH) {
      return this.renderCreateDatasetComp();
    }
  }

  onStepChange(path, activeStep) {
    this.setState({ path: path, activeStep: activeStep });
  }

  onSchemaSelected(selectedSchema) {
    this.setState({ selectedSchema: selectedSchema });
  }

  renderCreateTemplateComp() {
    return <CreateTemplate
      accountService={this.props.accountService}
      onStepChange={this.onStepChange}
      activeStep={this.state.activeStep}/>;
  }

  renderCreateDatasetComp() {
    return <CreateDataset
      accountService={this.props.accountService}
      onStepChange={this.onStepChange}
      activeStep={this.state.activeStep}
      onSchemaSelected={this.onSchemaSelected}
      selectedSchema={this.state.selectedSchema}/>;
  }


  getInitialState(classes) {

    return (
      <div className="row justify-content-center align-items-center flex-column">
        <div className="col-xl-4 col-sm-8">
          <div className={classes.root}>
            <div className={classes.child}>
              <Typography gutterBottom align="inherit" variant="h5">Create a Dataset</Typography>
            </div>

            <div className={classes.root}>

              {this.renderCreateTemplateComp()}

              <div className={classes.divider}>
                <Divider
                  flexItem={true}/>
              </div>

              {this.renderCreateDatasetComp()}

            </div>

          </div>
        </div>
      </div>
    );
  }


  setStateForSavedTemplate() {

  }


}

const mapStateToProps = ({ Pdp2Txns }) => ({ Pdp2Txns });

export default connect(mapStateToProps, actions)(withStyles(styles)(CreatePdp2Data));
