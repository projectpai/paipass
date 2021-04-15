import React from 'react';
import { useTable, useFilters } from 'react-table';
import FlexView from 'react-flexview';
import MaUTable from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import {withStyles, makeStyles } from '@material-ui/core/styles';
import TableContainer from '@material-ui/core/TableContainer';
import Paper from '@material-ui/core/Paper';
import TablePagination from '@material-ui/core/TablePagination';
import TableFooter from '@material-ui/core/TableFooter';


const useStyles = makeStyles({
  table: {
    minWidth: 650,
  },
});

const StyledTableCell = withStyles((theme) => ({
  head: {
    backgroundColor: theme.palette.common.white,
    color: theme.palette.common.black,
    fontSize: 14,
  },
  body: {
    fontSize: 13,
  },
}))(TableCell);


const StyledTableRow = withStyles((theme) => ({
  root: {
    '&:nth-of-type(odd)': {
      backgroundColor: theme.palette.action.hover,
    },
  },
}))(TableRow);

const columns = [
  {
    Header: 'Transaction ID',
    accessor: 'pdp2_op_return_txid',
    filterable: false,
    Cell: row => {
      if (row.value) {
        return <a target="_blank" rel="noopener noreferrer"
                  href={`https://paichain.info/ui/tx/${row.value}`}> {row.value} </a>;
      }
      return '';
    },


  },{
  Header: 'PAI Coin Address',
  accessor: 'pub_key_addr',
},  {
  Header: 'Public Key',
  accessor: 'pub_key',
  filterable: false,
  sortable: false,
}, {
  Header: 'Op. Type',
  accessor: 'is_store_op',
  filterable: false,
  sortable: false,
  Cell: row => {
    if (row.value === null) {
      return '';
    }
    return row.value ? 'Store' : 'Send';
  },


}, {
    Header: 'Created On',
    accessor: 'created_on',
    filterable: false,
    sortable: false,
    Cell: row => new Date(row.value).toDateString(),
  },];


export function Pdp2TxnsTable(props) {
  const classes = useStyles();
  const { txns, handlePageChange, handlePerPageChange, table } = props;
  const data = txns.data;
  const count = txns.count;
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({
    columns,
    data,
  }, useFilters);

  // Render the UI for your table
  return (
    <FlexView className="pdp2-txns" column>
      <FlexView wrap vAlignContent="bottom">

        <FlexView grow/>


      </FlexView>
      <TableContainer component={Paper}>

        <MaUTable className={classes.table} {...getTableProps()}>
          <TableHead>

            {headerGroups.map(headerGroup => (
              <TableRow {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <StyledTableCell align='left' {...column.getHeaderProps()}>{column.render('Header')}</StyledTableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody {...getTableBodyProps()}>
            {rows.map((row, i) => {
              prepareRow(row);
              return (
                <StyledTableRow {...row.getRowProps()}>
                  {row.cells.map(cell => {
                    return <StyledTableCell  align='left' {...cell.getCellProps()}>{cell.render('Cell')}</StyledTableCell>;
                  })}
                </StyledTableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TablePagination
                count={count}
                page={table.page}
                rowsPerPage={table.perPage}
                onChangePage={handlePageChange}
                onChangeRowsPerPage={handlePerPageChange}
              />
            </TableRow>
          </TableFooter>
        </MaUTable>
      </TableContainer>
    </FlexView>

  );

};

