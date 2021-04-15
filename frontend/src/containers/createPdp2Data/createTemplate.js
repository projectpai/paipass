import React, { Component } from 'react';
import Select from '@material-ui/core/Select';
import { connect } from 'react-redux';
import MenuItem from '@material-ui/core/MenuItem';
import * as R from 'ramda';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/styles';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';

import DynamicTemplate from './dynamicTemplate';
import * as actions from './actions';

import './createData.scss';


const styles = theme => ({
  root: {
    display: 'flex',
    justifyContent: 'space-between',
    flexDirection: 'column',
  },

  rowAligned: {
    display: 'flex',
    flex: 'flex-grow',
    justifyContent: 'space-evenly',
    flexDirection: 'row',
  },
  createFieldForm: {
    display: 'flex',
    justifyContent: 'space-evenly',
    flexDirection: 'column',
  },
  createField: {
    display: 'flex',
    flex: 'flex-grow',
    justifyContent: 'space-evenly',
    flexDirection: 'row',
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },

});


export const NEW_TEMPLATE_PATH = 'NEW_TEMPLATE_PATH';

class CreateTemplate extends Component {
  constructor(props) {
    super(props);
    this.state = { schema: { count: 0 }, activeStep: 0, path: null };
    this.getCreateTemplateState = this.getCreateTemplateState.bind(this);
    this.getStateForNewTemplate = this.getStateForNewTemplate.bind(this);
    this.getSubSchema = this.getSubSchema.bind(this);
    this.addField = this.addField.bind(this);
    this.addObjNameRef = this.addObjNameRef.bind(this);
  }


  render() {
    const { classes, activeStep } = this.props;

    if (activeStep === 0) {
      return this.getInitialState(classes);
    } else if (activeStep === 1) {
      return this.getCreateTemplateState();
    } else if (activeStep === 2) {
      return this.getNewTemplateSuccess();
    }


  }

  getInitialState(classes) {
    const { onStepChange, activeStep } = this.props;
    const incStateAndChangeParentPath = () => {
      onStepChange(NEW_TEMPLATE_PATH, activeStep + 1);
    };
    return (
      <div className={classes.root}>

        <Button align="inherit"
                variant="contained"
                onClick={incStateAndChangeParentPath}>
          Create a New Template
        </Button>
      </div>
    );
  }


  getSubSchema(indices) {
    const reducer = (accumulator, currentValue) => accumulator[currentValue];
    let obj = indices.reduce(reducer, this.state);
    return obj;

  }

  addField(indices, field) {
    const subSchema = this.getSubSchema(indices);
    subSchema.count += 1;
    subSchema['field' + subSchema.count] = field;
    this.setState({ schema: this.state.schema });
  }

  addObjNameRef(indices, nameRef) {
    const subSchema = this.getSubSchema(indices);
    subSchema['name'] = nameRef;
  }

  getStateForNewTemplate(activeStep) {

  }

  fillSchema(){
    const stack = [];
    stack.push(this.state.schema);
    while (stack.length > 0) {
      let schema = stack.pop()
      let keys = Object.keys(schema);
      for (const key of keys){
        if (key === 'name'  || key === 'selectedFieldType') {
          let v = schema[key];
          schema[key] = v.current.value;
        } else if (Object.prototype.toString.call(schema[key]) === '[object Object]') {
          stack.push(schema[key]);
        }
      }
    }
    return this.state.schema;
  }

  getCreateTemplateState() {
    const { fields } = this.state;
    const { accountService, classes, onStepChange, activeStep } = this.props;

    const handleCreateTemplateEvent = (event) => {
      accountService.createSchema(this.fillSchema()).then(
        () => {
          onStepChange(NEW_TEMPLATE_PATH, activeStep + 1);
        },
      );
    };


    return <div className={classes.createFieldForm}>
      <Typography gutterBottom align="inherit" variant="h5">
        Create a Template for Your Data
      </Typography>
      <DynamicTemplate indices={['schema']}
                       getSubSchema={this.getSubSchema}
                       formName={'Template'}
                       addField={this.addField}
                       addObjNameRef={this.addObjNameRef}/>
      <Button align="inherit"
              variant="contained"
              onClick={handleCreateTemplateEvent}>
        Create Template
      </Button>
    </div>;
  }

  getNewTemplateSuccess() {
    const { onStepChange } = this.props;
    const handleReturn = () => {
      onStepChange(null, 0);
    };

    return <div>
      <Typography gutterBottom align="inherit" variant="h5">
        You Successfully Created the Template!
      </Typography>
      <Button align="inherit"
              variant="contained"
              onClick={handleReturn}>

        Return to Dataset Creator
      </Button>
    </div>;
  }

  incStateForNewTemplate() {
    const { activeStep } = this.state;
    this.setState({ activeStep: activeStep + 1, path: NEW_TEMPLATE_PATH });
  }


}

const mapStateToProps = ({ Pdp2Txns }) => ({ Pdp2Txns });

export default connect(mapStateToProps, actions)(withStyles(styles)(CreateTemplate));
