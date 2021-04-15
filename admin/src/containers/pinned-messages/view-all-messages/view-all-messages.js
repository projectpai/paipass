import React from 'react';
import ReactTable from 'react-table';

import { Cell, Filter } from './table';

import './view-all-messages.scss';

const columns = [{
    Header: 'Published Date/Time',
    width: 152,
    Cell: ({ original }) => <Cell.Published original={original}/>,
    Filter: ({ onChange }) => <Filter.Published table={columns.table} onChange={onChange}/>
}, {
    Header: 'Platform',
    width: 68,
    Cell: ({ original }) => <Cell.Platform original={original}/>,
    Filter: ({ onChange }) => <Filter.Platform table={columns.table} onChange={onChange}/>
}, {
    Header: 'Messages',
    Cell: ({ original }) => <Cell.Message original={original} table={columns.table} handleAfterEdit={columns.handleAfterEdit} handleApprove={columns.handleApprove}/>,
    Filter: ({ onChange }) => <Filter.Message table={columns.table} onChange={onChange}/>
}];

const ViewAllMessages = (
    { messages: { data, fetching, messagesFiltered },
    handleAfterEdit,
    handleApprove,
    handleTableChange,
    table,
}) => {
    
    columns.handleAfterEdit = handleAfterEdit;
    columns.handleApprove = handleApprove;
    columns.table = table;

    return (
        <ReactTable
            manual
            filterable
            sortable={false}
            minRows={1}
            columns={columns}
            data={data}
            loading={fetching}
            onFetchData={handleTableChange}
            pages={Math.ceil(messagesFiltered / table.size)}
            defaultPageSize={table.size}
            className="-striped view-all-messages"
        />
    );
}

export default ViewAllMessages;
