import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';

import  {Pdp2DatasetsTable}  from './pdp2_datasets';

import './datasets.scss';
import { datasetsTable } from '../../common/constants';
import { Typography } from '@material-ui/core';
import * as actions from './actions';

class Pdp2Datasets extends Component {
  state = {

    table: {
      orderBy: datasetsTable.DEFAULT_ORDER_BY,
      size: datasetsTable.DEFAULT_PAGE_SIZE,
      page: 0,
      perPage: datasetsTable.DEFAULT_PAGE_SIZE,
      orderDir: datasetsTable.DESCENDING,
      dataset_id: '',
    },
    loading: false,

    Datasets: { data: ['placeholder'] },
  };

  constructor(props) {
    super(props);
    this.handleTableChange = this.handleTableChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handlePerPageChange = this.handlePerPageChange.bind(this);
    this.props.getPdp2Datasets(this.state.table);
  }

  componentWillReceiveProps({ Datasets }) {
    this.setState({ Datasets });
  }

  /**
   * This gets called when table is instaciated so no need for component will mount
   * @param {*} tableState and instance (but is unused here)
   */
  handleTableChange(tableState) {
    this.setState({
      ...this.state,
      table: {
        ...this.state.table,
        size: tableState.pageSize,
        perPage: tableState.pageSize,
        page: tableState.page + 1,
        orderBy: tableState.sorted.length ? tableState.sorted[0].id : datasetsTable.DEFAULT_ORDER_BY,
        orderDir: tableState.sorted.length ? (tableState.sorted[0].desc ? datasetsTable.DESCENDING : datasetsTable.ASCENDING) : datasetsTable.ASCENDING, // TODO make this more readable
        dataset_id: tableState.filtered.length ? tableState.filtered[0].value : '',
      },
    }, () => {
      const { getPdp2Datasets } = this.props;
      getPdp2Datasets(this.state.table);
    });
  }

  handlePageChange(event, newPage) {
    const table = {...this.state.table, page: newPage}
    this.setState({table: table, loading: true})
  }
  handlePerPageChange(event){
    const table = {...this.state.table, perPage: event.target.value, page: 0};
    this.setState({table: table, loading: true})
  }
  render() {
    const { table, Datasets, loading } = this.state;
    if (loading) {
      this.props.getPdp2Datasets(table);
      this.setState({loading: false})
    }
    return (
      <Fragment>
        <Pdp2DatasetsTable
          datasets={Datasets}
          table={table}
          handlePageChange={this.handlePageChange}
          handleTableChange={this.handleTableChange}
          handlePerPageChange={this.handlePerPageChange}
          accountService={this.props.accountService}
          datasetId={this.props.datasetId}
        />
      </Fragment>
    );
  }
}

const mapStateToProps = ({ Datasets }) => ({ Datasets });

export default connect(mapStateToProps, actions)(Pdp2Datasets);
