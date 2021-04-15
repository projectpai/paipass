import React from 'react';
import { Box } from '@material-ui/core';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/styles';
import CreateIcon from '@material-ui/icons/Create';
import {datasetTypes} from '../../common/constants'
import {parseISO} from 'date-fns'
import { URL_BASE } from '../../util';

const styles = theme => ({
  root: {
    display: 'flex',
    justifyContent: 'space-between',
    flexDirection: 'column',
    padding: '25px',
  },

  rowAligned: {
    display: 'flex',
    flex: 'flex-grow',
    justifyContent: 'space-evenly',
    flexDirection: 'row',
    padding: '10px',
  },
  colAligned: {
    display: 'flex',
    justifyContent: 'space-evenly',
    flexDirection: 'column',
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



class Dataset extends React.Component {

  constructor(props) {
    super(props);
    this.renderPrimitive = this.renderPrimitive.bind(this);
  }

  renderPrimitive(field) {
    const { classes } = this.props;
    const components = [];
    if (field.fieldType !== datasetTypes.FIELD_TYPE_OBJECT && field.fieldType !== datasetTypes.FIELD_TYPE_LIST) {
      components.push(
        <Typography gutterBottom align="inherit" variant="subtitle1">
          {field.name}
        </Typography>,
      );
      if (field.fieldType === datasetTypes.FIELD_TYPE_DATE){
        const parsed = parseISO(field.value)

        components.push(
          <Typography gutterBottom align="inherit" variant="subtitle2">
            {parsed.toString()}
          </Typography>,
        );
      } else if (field.fieldType === datasetTypes.FIELD_TYPE_FILE ||
        field.fieldType === datasetTypes.FIELD_TYPE_VIDEO
        ) {
        components.push(<a href={`${field.value}`} download>Download Data</a>)

      } else if (field.fieldType === datasetTypes.FIELD_TYPE_IMAGE){
        components.push(<img src={`${field.value}`} />)

      }else{

        components.push(
        <Typography gutterBottom align="inherit" variant="subtitle2">

          {field.value}
        </Typography>,
      );
      }
    }
    return <div className={classes.rowAligned}>

      {components}
    </div>;

  }

  render() {
    const { classes, dataset, root } = this.props;
    const keys = Object.keys(dataset);
    const components = [];
    for (const key of keys) {
      if (!key.includes('field') || key.includes('fieldType')) {
        continue;
      }
      const field = dataset[key];
      const fieldType = field.fieldType;
      if (fieldType === datasetTypes.FIELD_TYPE_OBJECT || fieldType === datasetTypes.FIELD_TYPE_LIST) {
        components.push(<Box border={1} padding={'10px'} margin={'4px'}><Dataset classes={classes}
                                                                                 dataset={field}/></Box>);
      } else {
        components.push(this.renderPrimitive(field));
      }
    }
    return <div>
      { root ? <CreateIcon style={{alignContent:"right"}}/> : null}
      <Box border={2}>
        <Typography gutterBottom align="inherit" variant="h6">
          {dataset.name}
        </Typography>
      </Box>
      {components}
    </div>;
  }

}

class ListDataset extends React.Component {
}

export default withStyles(styles)(Dataset);