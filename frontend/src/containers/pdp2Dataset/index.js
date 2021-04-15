import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Modal from '@material-ui/core/Modal';
import { withStyles } from '@material-ui/styles';

import Dataset from './dataset';

const styles = (theme) => ({
  paper: {
    margin: 'auto',
    width: 400,
    backgroundColor: theme.palette.background.paper,
    border: '2px solid #000',
    boxShadow: theme.shadows[5],
    padding: theme.spacing(2, 4, 3),
  },
});

class DatasetModal extends React.Component {

  constructor(props) {
    super(props);
    this.state = { dataset: {} };
    this.isEmpty = this.isEmpty.bind(this);
    this.renderDataset = this.renderDataset.bind(this);
  }

  componentDidMount() {
    const { datasetId, accountService } = this.props;
    accountService.getDataset(datasetId).then((dataset) => {
      this.setState({ dataset: dataset });
    });
  }

  isEmpty(fields) {
    return (Object.keys(fields).length === 0 && fields.constructor === Object);
  }

  renderDataset() {
    const { dataset } = this.state;
    if (this.isEmpty(dataset)) {
      return;
    }
    return <Dataset dataset={dataset} root />;
  }

  render() {
    const { classes, datasetId } = this.props;
    const body = (
      <div className={classes.paper}>
        {this.renderDataset()}
      </div>
    );

    return (
      <div>
        {body}
      </div>
    );
  }
}

export default withStyles(styles)(DatasetModal);