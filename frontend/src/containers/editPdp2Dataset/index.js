import React, { Component } from 'react';
import Select from '@material-ui/core/Select';
import { connect } from 'react-redux';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import * as R from 'ramda';
import Divider from '@material-ui/core/Divider';
import Typography from '@material-ui/core/Typography';
import { withRouter } from 'react-router-dom';

import { withStyles } from '@material-ui/styles';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import { parse } from 'date-fns';
import DynamicDataset from '../createPdp2Data/dynamicDataset';
import dataset from '../pdp2Dataset/dataset';
import {datasetTypes} from '../../common/constants'


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



class EditDataset extends Component {
  constructor(props) {
    super(props);
    const subpath = props.location.pathname.split('/').slice(-2)[0];
    let preselectedDatasetId = '';
    if (subpath !== 'edit-dataset' && subpath !== 'pai-data-sharing') {
      preselectedDatasetId = subpath;
    }
    this.state = {
      path: null,
      schemas: [],
      dataset: { 'name': 'Loading Template...' },
      fields: [],
      activeStep: (preselectedDatasetId) ? 1 : 0,
      selectedDatasetId: (preselectedDatasetId) ? preselectedDatasetId : '',

    };
    this.getSubDataset = this.getSubDataset.bind(this);
    this.addDataToList = this.addDataToList.bind(this);
    this.delItem = this.delItem.bind(this);
    this.getInitialState = this.getInitialState.bind(this);
  };

  render() {
    const { classes, accountService, selectedSchema } = this.props;
    const { selectedDatasetId, dataset } = this.state;
    const { activeStep } = this.state;
    if (activeStep === 0) {
      return this.getInitialState(classes);
    } else if (activeStep === 1) {
      this.retrieveDataset();
      return this.getCreateDatasetState();
    } else if (activeStep === 2) {
      return this.getSuccess();
    }

  }

  retrieveDataset() {
    const { accountService } = this.props;
    const { dataset, selectedDatasetId } = this.state;
    if ('field1' in dataset) return;
    accountService.getDataset(selectedDatasetId).then(
      (dataset) => {
        this.setState({ dataset: dataset });
      },
    );
  }

  getInitialState(classes) {
    const { activeStep, schemas, selectedDatasetId } = this.state;
    const { onStepChange, onSchemaSelected, selectedSchema, history } = this.props;
    const renderMenuItems = () => {
      const comps = [];

      schemas.forEach(schema => {
          const comp = <MenuItem value={schema.id}>{schema.name}</MenuItem>;
          comps.push(comp);
        },
      );
      return comps;
    };

    const schemaSelectedEvent = (event) => {
      onSchemaSelected(event.target.value);
    };

    const onClick = (event) => {
      history.push(`/pai-data-sharing/edit-dataset/${selectedDatasetId}/`);
      this.setState({ activeStep: activeStep + 1 });
    };

    const onChange = (event) => {
      this.setState({ selectedDatasetId: event.target.value });
    };

    return <div className="row justify-content-center align-items-center flex-column">
      <div className="col-xl-4 col-sm-8">
        <div className={classes.savedTemplate}>
          <TextField label="Dataset ID" type={'search'} value={selectedDatasetId} onChange={onChange}/>,
          <Button align="inherit" variant="contained" disabled={selectedDatasetId.length < 12} onClick={onClick}>Edit
            Dataset</Button>
        </div>
      </div>
    </div>;
  }

  getSubDataset(indices) {
    const reducer = (accumulator, currentValue) => accumulator[currentValue];
    let obj = indices.reduce(reducer, this.state);
    return obj;

  }

  addDataToList(indices, field) {
    const dataset = this.getSubDataset(indices);
    dataset.count += 1;
    dataset['field' + dataset.count] = field;
    this.setState({ dataset: this.state.dataset });
  }

  delItem(indices, name) {
    const dataset = this.getSubDataset(indices);
    dataset.count -= 1;
    delete dataset[name];
    this.setState({ dataset: this.state.dataset });
  }

  getCreateDatasetState() {
    const { fields, dataset, selectedDatasetId, activeStep } = this.state;
    const { selectedSchema, classes, onStepChange, accountService } = this.props;


    const renderFields = (fields) => {
      if (fields.length === 0) {
        return <div/>;
      }
      return R.map(field => (
        <div className={classes.child}>
          <Typography gutterBottom align="inherit" variant="h6">
            {field[0]}:
          </Typography>
          <TextField label="Value" type={'search'} inputRef={field[1]}/>
        </div>
      ))(fields);
    };

    const handleCreateDatasetEvent = (event) => {
      dataset['id'] = selectedDatasetId;
      const stack = [dataset];
      while (stack.length > 0) {
        const subdataset = stack.pop();
        const keys = Object.keys(subdataset);
        for (const key of keys) {
          if (!key.includes('field') || key === 'fieldType') {
            continue;
          }
          const field = subdataset[key];
          const fieldType = field.fieldType;
          if ('valueRef' in field) {
            if (fieldType === datasetTypes.FIELD_TYPE_DATE) {
              const parsed = parse(field.valueRef.current.value, 'MMMM do hh:mm aaaa', new Date());
              field['value'] = parsed.toISOString();
            } else {
              field['value'] = field.valueRef.current.value;
            }
            delete field.valueRef;
          } else if (fieldType === datasetTypes.FIELD_TYPE_OBJECT || fieldType === datasetTypes.FIELD_TYPE_LIST) {
            stack.push(field);
          }
        }
      }
      accountService.updateDataset(selectedDatasetId, dataset).then(
        () => {
          this.setState({ activeStep: activeStep + 1 });
        },
      );
    };

    let dd = null;
    if ('field1' in dataset) {
      dd = <DynamicDataset indices={['dataset']}
                           getSubSchema={this.getSubDataset}
                           formName={dataset.name}
                           addDataToList={this.addDataToList}
                           delItem={this.delItem}
                           classes={classes}/>;
    }


    return <div>

      {dd}
      <Button align="inherit"
              variant="contained"
              onClick={handleCreateDatasetEvent}>
        Submit Dataset
      </Button>
    </div>;
  }

  getSuccess() {
    const { onStepChange } = this.props;
    const handleReturn = () => {
      this.setState({ activeStep: 0, selectedDatasetId: '' });

    };

    return <div>
      <Typography gutterBottom align="inherit" variant="h5">
        You Successfully Updated the Dataset!
      </Typography>
      <Button align="inherit"
              variant="contained"
              onClick={handleReturn}>

        Return to Dataset Creator
      </Button>
    </div>;

  }
}

export default withRouter(withStyles(styles)(EditDataset));

