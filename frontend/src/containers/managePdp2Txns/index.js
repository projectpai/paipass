import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';

import { Pdp2TxnsTable } from './pdp2_txns';

import './txns.scss';
import { table } from '../../common/constants';
import { Typography } from '@material-ui/core';
import * as actions from './actions';

class Pdp2Transactions extends Component {
  state = {

    table: {
      orderBy: table.DEFAULT_ORDER_BY,
      size: table.DEFAULT_PAGE_SIZE,
      page: 0,
      perPage: table.DEFAULT_PAGE_SIZE,
      orderDir: table.DESCENDING,
      paicoin_address: '',
    },
    loading: false,
    Pdp2Txns: { data: ['placeholder']},
  };

  constructor(props) {
    super(props);
    this.handleTableChange = this.handleTableChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handlePerPageChange = this.handlePerPageChange.bind(this);
    this.props.getPdp2Txns(this.state.table);

  }

  componentWillReceiveProps({ Pdp2Txns }) {
    this.setState({ Pdp2Txns });
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
        page: tableState.page,
        orderBy: tableState.sorted.length ? tableState.sorted[0].id : table.DEFAULT_ORDER_BY,
        orderDir: tableState.sorted.length ? (tableState.sorted[0].desc ? table.DESCENDING : table.ASCENDING) : table.ASCENDING, // TODO make this more readable
        paicoin_address: tableState.filtered.length ? tableState.filtered[0].value : '',
      },
    }, () => {
      const { getPdp2Txns } = this.props;
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
    const { table, Pdp2Txns, loading} = this.state;
    if (loading) {
      this.props.getPdp2Txns(table);
      this.setState({loading: false})
    }
    return (
      <Fragment>
        <Pdp2TxnsTable
          txns={Pdp2Txns}
          table={table}
          handlePageChange={this.handlePageChange}
          handleTableChange={this.handleTableChange}
          handlePerPageChange={this.handlePerPageChange}
        />
      </Fragment>
    );
  }
}

const mapStateToProps = ({ Pdp2Txns }) => ({ Pdp2Txns });

export default connect(mapStateToProps, actions)(Pdp2Transactions);
