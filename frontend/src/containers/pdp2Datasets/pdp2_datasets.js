import React, { useState } from 'react';
import { useTable, useFilters } from 'react-table';
import FlexView from 'react-flexview';
import MaUTable from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TablePagination from '@material-ui/core/TablePagination';
import TableFooter from '@material-ui/core/TableFooter';


import { withStyles, makeStyles } from '@material-ui/core/styles';
import TableContainer from '@material-ui/core/TableContainer';
import Paper from '@material-ui/core/Paper';
import Link from '@material-ui/core/Link';
import DatasetModal from '../pdp2Dataset';
import Modal from '@material-ui/core/Modal';
import Dialog from '@material-ui/core/Dialog';

import { useHistory } from 'react-router-dom';

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


function getColumns(history, setDatasetId, setModalOpen) {
  return [
    {
      Header: 'Dataset ID',
      accessor: 'id',
      filterable: false,
      Cell: row => {
        if (row.value) {
          return <Link onClick={
            () => {
              history.push(`/pai-data-sharing/datasets/${row.value}/`);
              setDatasetId(row.value);
              setModalOpen(true);
            }
          }>
            {row.value}
          </Link>;
        }
        return '';
      },


    }, {
      Header: 'Schema Name',
      accessor: 'schema_name',
    }, {
      Header: 'Created On',
      accessor: 'date_created',
      filterable: false,
      sortable: false,
      Cell: row => new Date(row.value).toDateString(),
    }];
}

export function Pdp2DatasetsTable(props) {
  const classes = useStyles();

  const { datasets, handlePageChange, handlePerPageChange, table } = props;
  const [datasetId, setDatasetId] = useState(props.datasetId);
  const [isModalOpen, setModalOpen] = useState(props.datasetId !== null && props.datasetId.length > 12,
  );
  const data = datasets.data;
  const count = datasets.count;
  const history = useHistory();

  const [columns, setColumns] = useState(getColumns(history, setDatasetId, setModalOpen));

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

  const handleOpen = () => {
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
  };

  return (


    <FlexView className="pdp2-datasets" column>
      <Dialog
        open={isModalOpen}
        onClose={handleClose}
        aria-labelledby="simple-modal-title"
        aria-describedby="simple-modal-description"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <DatasetModal datasetId={datasetId} accountService={props.accountService}/>
      </Dialog>

      <FlexView wrap vAlignContent="bottom">

        <FlexView grow/>


      </FlexView>
      <TableContainer component={Paper}>

        <MaUTable className={classes.table} {...getTableProps()}>
          <TableHead>

            {headerGroups.map(headerGroup => (
              <TableRow {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <StyledTableCell
                    align='left' {...column.getHeaderProps()}>{column.render('Header')}</StyledTableCell>
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
                    return <StyledTableCell
                      align='left' {...cell.getCellProps()}>{cell.render('Cell')}</StyledTableCell>;
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
    //<DatasetModal dataset_id={dataset_id}/>
  );

};

